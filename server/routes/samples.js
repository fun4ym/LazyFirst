const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize, filterByDataScope } = require('../middleware/auth');
const SampleManagement = require('../models/SampleManagement');
const Video = require('../models/Video');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const Influencer = require('../models/Influencer');
const InfluencerMaintenance = require('../models/InfluencerMaintenance');
const User = require('../models/User');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// 配置multer
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// ==========================================
// 样品申请管理相关路由
// ==========================================

/**
 * @route   GET /api/samples
 * @desc    获取样品申请列表（重构后：populate关联+兼容字段）
 * @access  Private
 * @notes   支持 samples:read (管理员) 和 samples-bd:read (BD) 两种权限
 */
router.get('/', authenticate, authorize('samples:read', 'samplesBd:read'), filterByDataScope({ module: 'samples', ownerField: 'salesmanId', deptField: 'deptId', ownerValue: (req) => req.user.username }), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      date,
      dateStart,
      dateEnd,
      productName,
      influencerAccount,
      salesman,
      salesmanId,
      isSampleSent,
      sampleStatus,
      isOrderGenerated,
      productId,
      shopId
    } = req.query;

    // 使用数据权限过滤条件
    const query = { ...req.dataScope.query };

    // BD用户按salesmanId过滤（重构后salesmanId是ObjectId ref User）
    if (req.dataScope.scope === 'self' && req.user._id) {
      query.salesmanId = req.user._id;
    }

    // 日期筛选
    if (dateStart && dateEnd) {
      const startDate = new Date(dateStart);
      const endDate = new Date(dateEnd);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    } else if (date) {
      query.date = {
        $gte: new Date(date),
        $lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1))
      };
    }

    // ★ 商品名称筛选 → 先查Product表获取_id列表
    if (productName) {
      const products = await Product.find({
        companyId: req.companyId,
        name: { $regex: productName, $options: 'i' }
      }).select('_id').lean();
      if (products.length > 0) {
        query.productId = { $in: products.map(p => p._id) };
      } else {
        query.productId = { $in: [] };
      }
    }

    // ★ 达人账号筛选 → 先查Influencer表获取_id列表
    if (influencerAccount) {
      const influencers = await Influencer.find({
        companyId: req.companyId,
        tiktokId: { $regex: influencerAccount, $options: 'i' }
      }).select('_id').lean();
      if (influencers.length > 0) {
        query.influencerId = { $in: influencers.map(inf => inf._id) };
      } else {
        query.influencerId = { $in: [] };
      }
    }

    // ★ 业务员筛选（重构后salesmanId是ObjectId）
    if (salesmanId) {
      query.salesmanId = mongoose.Types.ObjectId(salesmanId);
    } else if (salesman) {
      // 模糊搜索：按realName或username查User再取_id
      const users = await User.find({
        companyId: req.companyId,
        $or: [
          { realName: { $regex: salesman, $options: 'i' } },
          { username: { $regex: salesman, $options: 'i' } }
        ]
      }).select('_id').lean();
      if (users.length > 0) {
        query.salesmanId = { $in: users.map(u => u._id) };
      } else {
        query.salesmanId = { $in: [] };
      }
    }

    // 寄样状态筛选
    if (sampleStatus) {
      query.sampleStatus = sampleStatus;
    } else if (isSampleSent !== undefined) {
      query.isSampleSent = isSampleSent === 'true';
      if (isSampleSent === 'true') {
        query.sampleStatus = 'sent';
      }
    }

    // 是否出单筛选
    if (isOrderGenerated !== undefined) {
      query.isOrderGenerated = isOrderGenerated === 'true';
    }

    // ★ TikTok商品ID或商品ID筛选（重构后productId是ObjectId）
    if (productId) {
      // 尝试匹配 ObjectId 或 tiktokProductId
      if (/^[0-9a-fA-F]{24}$/.test(productId)) {
        query.productId = mongoose.Types.ObjectId(productId);
      } else {
        // 按 tiktokProductId 模糊搜索
        const products = await Product.find({
          companyId: req.companyId,
          tiktokProductId: { $regex: productId, $options: 'i' }
        }).select('_id').lean();
        if (products.length > 0) {
          query.productId = { $in: products.map(p => p._id) };
        } else {
          query.productId = { $in: [] };
        }
      }
    }

    // 店铺筛选
    if (shopId) {
      const shopProducts = await Product.find({ shopId: mongoose.Types.ObjectId(shopId) })
        .select('_id').lean();

      if (shopProducts && shopProducts.length > 0) {
        query.productId = { $in: shopProducts.map(p => p._id) };
      } else {
        query.productId = { $in: [] };
      }
    }

    // ★ 核心改动：使用populate替代手动关联查询
    const samples = await SampleManagement.find(query)
      .populate('productId', 'name tiktokProductId images productImages shopId')
      .populate('influencerId', 'tiktokId tiktokName latestFollowers monthlySalesCount avgVideoViews latestGmv isBlacklisted blacklistedAt blacklistedByName blacklistReason poolType status')
      .populate('salesmanId', 'realName username')
      .populate('creatorId', 'realName')
      .populate('fulfillmentUpdatedBy', 'realName')
      .populate('adPromotionUpdatedBy', 'realName')
      .populate('sampleStatusUpdatedBy', 'realName')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ date: -1 });

    // ★ 查询每个样品的Videos
    const sampleIds = samples.map(s => s._id);
    const videos = await Video.find({ sampleId: { $in: sampleIds } }).sort({ createdAt: -1 });
    const videoMap = {};
    videos.forEach(v => {
      if (!videoMap[v.sampleId.toString()]) {
        videoMap[v.sampleId.toString()] = [];
      }
      videoMap[v.sampleId.toString()].push(v.toObject());
    });

    // 查shopName
    const shopIdsFromProducts = [...new Set(samples.map(s => s.productId?.shopId).filter(Boolean))];
    const shops = await Shop.find({ _id: { $in: shopIdsFromProducts } }).select('_id shopName').lean();
    const shopMap = {};
    shops.forEach(s => { shopMap[s._id.toString()] = s.shopName; });

    // 组装返回数据，带兼容字段供前端过渡使用
    const samplesData = samples.map(sample => {
      const obj = sample.toObject();
      const sampleVideos = videoMap[obj._id.toString()] || [];
      const latestVideo = sampleVideos[0] || null;

      return {
        ...obj,
        // ===== 兼容字段（前端逐步迁移后可移除）=====
        productName: obj.productId?.name || '',
        productId_display: obj.productId?.tiktokProductId || '',
        influencerAccount: obj.influencerId?.tiktokId || '',
        followerCount: obj.influencerId?.latestFollowers || 0,
        monthlySalesCount: obj.influencerId?.monthlySalesCount || 0,
        avgVideoViews: obj.influencerId?.avgVideoViews || 0,
        sampleImage: obj.productId?.images?.[0] || obj.productId?.productImages?.[0] || '',
        salesman: obj.salesmanId?.realName || obj.salesmanId?.username || '',
        shopName: shopMap[obj.productId?.shopId?.toString()] || '',
        // ===== Video信息 =====
        videos: sampleVideos,
        videoLink: latestVideo?.videoLink || '',
        videoStreamCode: latestVideo?.videoStreamCode || '',
        // 如果任一video已投流则标记为已投流
        isAdPromotion: sampleVideos.some(v => v.isAdPromotion) || obj.isAdPromotion || false,
        // 黑名单信息从influencer直接获取
        isBlacklistedInfluencer: obj.influencerId?.isBlacklisted || false,
        influencerBlacklistInfo: obj.influencerId?.isBlacklisted ? {
          isBlacklisted: obj.influencerId.isBlacklisted,
          blacklistedAt: obj.influencerId.blacklistedAt,
          blacklistedByName: obj.influencerId.blacklistedByName,
          blacklistReason: obj.influencerId.blacklistReason
        } : null,
      };
    });

    const total = await SampleManagement.countDocuments(query);

    res.json({
      success: true,
      data: {
        samples: samplesData,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get sample management list error:', error);
    res.status(500).json({
      success: false,
      message: '获取样品申请列表失败'
    });
  }
});

/**
 * @route   POST /api/samples
 * @desc    创建样品申请（重构后：传ObjectId引用）
 * @access  Private
 */
router.post('/', authenticate, authorize('samples:create', 'samplesBd:create'), [
  body('date').notEmpty().withMessage('日期不能为空'),
  body('productId').notEmpty().withMessage('商品ID不能为空'),
  body('influencerId').notEmpty().withMessage('达人ID不能为空'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: errors.array()
      });
    }

    const {
      date,
      productId,
      influencerId,
      salesmanId,
      shippingInfo,
      isSampleSent,
      trackingNumber,
      shippingDate,
      logisticsCompany,
      receivedDate,
      fulfillmentTime,
      isOrderGenerated,
      // 可选：同时创建Video记录
      videoLink,
      videoStreamCode,
      isAdPromotion,
      adPromotionTime
    } = req.body;

    // 验证 Product 存在且属于该公司
    const product = await Product.findOne({
      _id: productId,
      companyId: req.companyId
    });
    if (!product) {
      return res.status(400).json({ success: false, message: '商品不存在或不属于该公司' });
    }

    // 验证 Influencer 存在且属于该公司
    const influencer = await Influencer.findOne({
      _id: influencerId,
      companyId: req.companyId
    });
    if (!influencer) {
      return res.status(400).json({ success: false, message: '达人不存在或不属于该公司' });
    }

    // 验证 salesmanId（如果传了）
    if (salesmanId) {
      const user = await User.findById(salesmanId);
      if (!user) {
        return res.status(400).json({ success: false, message: '业务员不存在' });
      }
    }

    // 检查当天是否已有相同记录（date + influencerId + productId）
    const sameDayRecord = await SampleManagement.findOne({
      companyId: req.companyId,
      date: new Date(date),
      influencerId: influencerId,
      productId: productId
    });

    if (sameDayRecord) {
      return res.status(400).json({
        success: false,
        message: '当天已有这位达人对此商品的申样记录，请勿重复提交'
      });
    }

    // 检查历史重复记录
    const previousRecords = await SampleManagement.find({
      companyId: req.companyId,
      influencerId: influencerId,
      productId: productId,
      $or: [
        { date: { $lt: new Date(date) } },
        { date: new Date(date), createdAt: { $lt: new Date() } }
      ]
    }).sort({ date: -1, createdAt: -1 }).limit(10);

    const duplicateCount = previousRecords.length;
    const previousSubmissions = previousRecords.map(record => ({
      sampleId: record._id,
      date: record.date,
      productName: product.name,
      influencerAccount: influencer.tiktokId,
      sampleStatus: record.sampleStatus,
      salesman: record.salesmanId,
      createdAt: record.createdAt
    }));

    // 构建数据（★ 不再存冗余字段）
    const sampleData = {
      companyId: req.companyId,
      creatorId: req.user._id,
      date: new Date(date),
      productId: productId,
      influencerId: influencerId,
      salesmanId: salesmanId || undefined,
      shippingInfo: shippingInfo || '',
      isSampleSent: isSampleSent || false,
      trackingNumber: trackingNumber || '',
      shippingDate: shippingDate ? new Date(shippingDate) : undefined,
      logisticsCompany: logisticsCompany || '',
      receivedDate: receivedDate ? new Date(receivedDate) : undefined,
      fulfillmentTime: fulfillmentTime || '',
      isAdPromotion: isAdPromotion || false,
      adPromotionTime: adPromotionTime ? new Date(adPromotionTime) : undefined,
      isOrderGenerated: isOrderGenerated || false,
      duplicateCount: duplicateCount,
      previousSubmissions: previousSubmissions
    };

    Object.keys(sampleData).forEach(key => {
      if (sampleData[key] === undefined) delete sampleData[key];
    });

    const sample = await SampleManagement.create(sampleData);

    // 如果同时传了视频信息，创建Video记录
    if (videoLink || videoStreamCode || isAdPromotion) {
      const videoData = {
        companyId: req.companyId,
        sampleId: sample._id,
        productId: productId,
        influencerId: influencerId,
        videoLink: videoLink || '',
        videoStreamCode: videoStreamCode || '',
        isAdPromotion: isAdPromotion || false,
        createdBy: req.user._id,
        updatedBy: req.user._id
      };
      if ((isAdPromotion || videoData.videoStreamCode) && !adPromotionTime) {
        videoData.adPromotionTime = new Date();
      } else if (adPromotionTime) {
        videoData.adPromotionTime = new Date(adPromotionTime);
      }
      await Video.create(videoData);
    }

    // 更新达人维护记录
    const maintenance = new InfluencerMaintenance({
      companyId: req.companyId,
      influencerId: influencer._id,
      followers: influencer.latestFollowers || 0,
      monthlySalesCount: influencer.monthlySalesCount || 0,
      avgVideoViews: influencer.avgVideoViews || 0,
      gmv: 0,
      poolType: influencer.poolType,
      remark: `申请样品：${product.name}`,
      maintainerId: req.user._id,
      maintainerName: req.user.realName || req.user.username,
      recordType: 'sample_application',
      sampleId: sample._id
    });
    await maintenance.save();

    influencer.latestMaintenanceTime = maintenance.createdAt;
    influencer.latestMaintainerId = req.user._id;
    influencer.latestMaintainerName = req.user.realName || req.user.username;
    influencer.latestRemark = `申请样品：${product.name}`;
    await influencer.save();

    res.status(201).json({
      success: true,
      message: '创建样品申请成功'
    });

  } catch (error) {
    console.error('Create sample error:', error);
    res.status(500).json({
      success: false,
      message: '创建样品申请失败: ' + error.message
    });
  }
});

/**
 * @route   PUT /api/samples/:id
 * @desc    更新样品申请（重构后：视频相关操作移到Video表）
 * @access  Private
 */
router.put('/:id', authenticate, authorize('samples:update', 'samplesBd:update'), async (req, res) => {
  try {
    const { sampleStatus, refusalReason, ...restBody } = req.body;
    const updateData = { ...restBody };

    // 寄样状态更新
    if (sampleStatus !== undefined) {
      updateData.sampleStatus = sampleStatus;
      updateData.sampleStatusUpdatedBy = req.user._id;
      updateData.sampleStatusUpdatedAt = new Date();
      updateData.isSampleSent = sampleStatus === 'sent';

      if (sampleStatus === 'sent') {
        if (req.body.logisticsCompany !== undefined) {
          updateData.logisticsCompany = req.body.logisticsCompany;
        }
        if (req.body.trackingNumber !== undefined) {
          updateData.trackingNumber = req.body.trackingNumber;
        }
        if (req.body.shippingDate !== undefined) {
          updateData.shippingDate = new Date(req.body.shippingDate);
        }
        if (req.body.receivedDate !== undefined) {
          updateData.receivedDate = new Date(req.body.receivedDate);
        }
      }
    }

    // 不合作原因
    if (refusalReason !== undefined) {
      updateData.refusalReason = refusalReason;
    }

    // 基础信息更新（date/salesmanId/shippingInfo/isOrderGenerated等）
    if (updateData.salesmanId) {
      updateData.salesmanId = mongoose.Types.ObjectId(updateData.salesmanId);
    }

    // ★ 注意：videoLink/videoStreamCode/isAdPromotion 的更新现在通过 Video API 完成
    // 这里只保留样品级别的快捷标记同步

    const sample = await SampleManagement.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!sample) {
      return res.status(404).json({
        success: false,
        message: '样品申请不存在'
      });
    }

    res.json({
      success: true,
      message: '更新样品申请成功',
      data: { sample }
    });

  } catch (error) {
    console.error('Update sample error:', error);
    res.status(500).json({
      success: false,
      message: '更新样品申请失败'
    });
  }
});

/**
 * @route   DELETE /api/samples/:id
 * @desc    删除样品申请（级联删除关联的Videos）
 * @access  Private
 */
router.delete('/:id', authenticate, authorize('samples:delete', 'samplesBd:delete'), async (req, res) => {
  try {
    const sample = await SampleManagement.findOneAndDelete({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!sample) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      });
    }

    // ★ 级联删除关联的Video记录
    await Video.deleteMany({ sampleId: req.params.id });

    res.json({
      success: true,
      message: '删除成功'
    });

  } catch (error) {
    console.error('Delete sample error:', error);
    res.status(500).json({
      success: false,
      message: '删除失败'
    });
  }
});

/**
 * @route   DELETE /api/samples/clear
 * @desc    清除所有样品申请记录
 * @access  Private (admin only)
 */
router.delete('/clear', authenticate, authorize('admin'), async (req, res) => {
  try {
    await Video.deleteMany({ companyId: req.companyId });
    const result = await SampleManagement.deleteMany({});
    res.json({
      success: true,
      message: `已清除 ${result.deletedCount} 条申样记录`
    });
  } catch (error) {
    console.error('清除申样记录错误:', error);
    res.status(500).json({
      success: false,
      message: '清除失败'
    });
  }
});

// ==========================================
// 样品下的视频子路由
// ==========================================

/**
 * @route   GET /api/samples/:id/videos
 * @desc    获取某个样品的所有视频
 * @access  Private
 */
router.get('/:id/videos', authenticate, async (req, res) => {
  try {
    // 验证样品存在
    const sample = await SampleManagement.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!sample) {
      return res.status(404).json({
        success: false,
        message: '样品记录不存在'
      });
    }

    const videos = await Video.find({ sampleId: req.params.id, companyId: req.companyId })
      .populate('createdBy', 'realName username')
      .populate('updatedBy', 'realName username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { videos }
    });

  } catch (error) {
    console.error('Get sample videos error:', error);
    res.status(500).json({
      success: false,
      message: '获取视频列表失败'
    });
  }
});

/**
 * @route   POST /api/samples/:id/videos
 * @desc    为样品添加视频记录
 * @access  Private
 */
router.post('/:id/videos', authenticate, authorize('videos:create'), [
  body('videoLink').optional(),
], async (req, res) => {
  try {
    const sample = await SampleManagement.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!sample) {
      return res.status(404).json({
        success: false,
        message: '样品记录不存在'
      });
    }

    const { videoLink, videoStreamCode, isAdPromotion, adPromotionTime } = req.body;

    const videoData = {
      companyId: req.companyId,
      sampleId: sample._id,
      productId: sample.productId,
      influencerId: sample.influencerId,
      videoLink: videoLink || '',
      videoStreamCode: videoStreamCode || '',
      isAdPromotion: isAdPromotion || false,
      createdBy: req.user._id,
      updatedBy: req.user._id
    };

    if (isAdPromotion) {
      videoData.adPromotionTime = adPromotionTime ? new Date(adPromotionTime) : new Date();
    }

    const video = await Video.create(videoData);

    // 同步更新样品的投流快捷标记和履约时间
    const allVideos = await Video.find({ sampleId: sample._id });
    const anyAdPromoted = allVideos.some(v => v.isAdPromotion);
    
    const sampleUpdate = { isAdPromotion: anyAdPromoted };
    if (anyAdPromoted) {
      sampleUpdate.adPromotionUpdatedBy = req.user._id;
      sampleUpdate.adPromotionUpdatedAt = new Date();
    }
    if (videoLink) {
      sampleUpdate.fulfillmentUpdatedBy = req.user._id;
      sampleUpdate.fulfillmentUpdatedAt = new Date();
    }

    await SampleManagement.findByIdAndUpdate(sample._id, sampleUpdate);

    res.status(201).json({
      success: true,
      message: '添加视频成功',
      data: { video }
    });

  } catch (error) {
    console.error('Add sample video error:', error);
    res.status(500).json({
      success: false,
      message: '添加视频失败: ' + error.message
    });
  }
});

// ==========================================
// Excel导入（重构后）
// ==========================================

/**
 * @route   POST /api/samples/import
 * @desc    导入样品申请Excel（重构后：匹配Influencer获取ObjectId）
 * @access  Private
 */
router.post('/import', authenticate, authorize('samples:create', 'samplesBd:create'), upload.single('file'), async (req, res) => {
  try {
    console.log('[Sample Import] 导入请求接收');

    if (!req.file) {
      console.error('[Sample Import] 未上传文件');
      return res.status(400).json({ success: false, message: '请上传Excel文件' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    console.log(`[Sample Import] 解析完成，共 ${jsonData.length} 行数据`);

    if (jsonData.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Excel文件为空' });
    }

    const result = { added: 0, updated: 0, failed: 0, errors: [] };

    for (let i = 0; i < jsonData.length; i++) {
      try {
        const row = jsonData[i];
        const rawDate = row['日期'];
        const date = parseExcelDate(rawDate);
        const shippingDate = parseExcelDate(row['发货日期']);
        const receivedDate = parseExcelDate(row['收样日期']);
        const adPromotionTime = parseExcelDate(row['投流时间']);

        if (!date) {
          result.failed++;
          result.errors.push({ row: i + 2, error: '日期字段为空或格式错误' });
          continue;
        }
        if (!row['商品名称'] && !row['商品ID']) {
          result.failed++;
          result.errors.push({ row: i + 2, error: '商品名称或商品ID不能为空' });
          continue;
        }
        if (!row['达人账号']) {
          result.failed++;
          result.errors.push({ row: i + 2, error: '达人账号不能为空' });
          continue;
        }

        // ★ 匹配 Product（复用原有逻辑）→ 得到 product._id
        let productObj = null;
        let productName = row['商品名称'] || '';
        const productIdInput = String(row['商品ID'] || '').trim();

        if (productIdInput) {
          try {
            productObj = await Product.findById(productIdInput);
            if (productObj) productName = productObj.name || productName;
          } catch (err) {}
          if (!productObj) {
            productObj = await Product.findOne({ tiktokProductId: productIdInput });
            if (productObj) productName = productObj.name || productName;
          }
          if (!productObj) {
            productObj = await Product.findOne({ sku: productIdInput });
            if (productObj) productName = productObj.name || productName;
          }
          if (!productObj) {
            productObj = await Product.findOne({ tiktokSku: productIdInput });
            if (productObj) productName = productObj.name || productName;
          }
          if (!productObj && productName) {
            productObj = await Product.findOne({ name: productName });
            if (productObj) productName = productObj.name || productName;
          }
          if (!productObj && productName) {
            productObj = await Product.findOne({ name: { $regex: productName, $options: 'i' } });
            if (productObj) productName = productObj.name || productName;
          }
        }

        if (!productObj) {
          result.failed++;
          result.errors.push({ row: i + 2, message: `商品不存在: ${productIdInput || productName}` });
          continue;
        }

        // ★ 匹配 Influencer → 得到 influencer._id
        const influencerObj = await Influencer.findOne({
          companyId: req.companyId,
          tiktokId: row['达人账号']
        });

        if (!influencerObj) {
          result.failed++;
          result.errors.push({ row: i + 2, message: `达人不存在: ${row['达人账号']}` });
          continue;
        }

        // 匹配 salesman
        const salesmanName = row['归属业务员'] || '';
        let matchedSalesmanId = undefined;
        if (salesmanName && typeof salesmanName === 'string') {
          const user = await User.findOne({ username: salesmanName });
          if (user) matchedSalesmanId = user._id;
        }

        // ★ 重构后的唯一键
        const uniqueKey = {
          date: date,
          influencerId: influencerObj._id,
          productId: productObj._id
        };

        const existing = await SampleManagement.findOne({
          companyId: req.companyId,
          ...uniqueKey
        });

        const sampleData = {
          companyId: req.companyId,
          creatorId: req.user._id,
          date: date,
          productId: productObj._id,           // ★ ObjectId
          influencerId: influencerObj._id,     // ★ ObjectId
          salesmanId: matchedSalesmanId,       // ★ ObjectId
          shippingInfo: row['收货信息'] || '',
          isSampleSent: row['是否寄样'] === '是' || row['是否寄样'] === true,
          trackingNumber: row['发货单号'] || '',
          shippingDate: shippingDate,
          logisticsCompany: row['物流公司'] || '',
          receivedDate: receivedDate,
          fulfillmentTime: row['履约时间'] || '',
          isAdPromotion: row['是否投流'] === '是' || row['是否投流'] === true,
          adPromotionTime: adPromotionTime,
          isOrderGenerated: row['是否出单'] === '是' || row['是否出单'] === true
        };

        if (existing) {
          await SampleManagement.updateOne({ _id: existing._id }, sampleData);
          result.updated++;

          // 如果有视频链接/推流码，创建Video记录
          if (row['达人视频链接'] || row['视频推流码']) {
            const existingVideos = await Video.find({ sampleId: existing._id });
            const hasMatchingVideo = existingVideos.some(v =>
              v.videoLink === (row['达人视频链接'] || '') &&
              v.videoStreamCode === (row['视频推流码'] || '')
            );
            if (!hasMatchingVideo) {
              await Video.create({
                companyId: req.companyId,
                sampleId: existing._id,
                productId: productObj._id,
                influencerId: influencerObj._id,
                videoLink: row['达人视频链接'] || '',
                videoStreamCode: row['视频推流码'] || '',
                isAdPromotion: row['是否投流'] === '是' || row['是否投流'] === true,
                createdBy: req.user._id,
                updatedBy: req.user._id
              });
            }
          }
        } else {
          // 新增时计算重复提交
          const prevRecords = await SampleManagement.find({
            companyId: req.companyId,
            influencerId: influencerObj._id,
            productId: productObj._id,
            date: { $lt: date }
          }).sort({ date: -1 }).limit(10);

          sampleData.duplicateCount = prevRecords.length;
          sampleData.previousSubmissions = prevRecords.map(r => ({
            sampleId: r._id, date: r.date,
            productName: productObj.name, influencerAccount: influencerObj.tiktokId,
            sampleStatus: r.sampleStatus, salesman: r.salesmanId, createdAt: r.createdAt
          }));

          const newSample = await SampleManagement.create(sampleData);
          result.added++;

          // 如果有视频信息，创建Video记录
          if (row['达人视频链接'] || row['视频推流码']) {
            await Video.create({
              companyId: req.companyId,
              sampleId: newSample._id,
              productId: productObj._id,
              influencerId: influencerObj._id,
              videoLink: row['达人视频链接'] || '',
              videoStreamCode: row['视频推流码'] || '',
              isAdPromotion: row['是否投流'] === '是' || row['是否投流'] === true,
              createdBy: req.user._id,
              updatedBy: req.user._id
            });
          }
        }

      } catch (err) {
        console.error(`[Sample Import] 处理第 ${i + 2} 行时出错:`, err);
        result.failed++;
        result.errors.push({ row: i + 2, error: err.message });
      }
    }

    fs.unlinkSync(req.file.path);
    console.log('[Sample Import] 导入完成:', result);

    res.json({
      success: true,
      message: `导入完成：新增 ${result.added} 条，更新 ${result.updated} 条，失败 ${result.failed} 条`,
      data: result
    });

  } catch (error) {
    console.error('[Sample Import] 导入错误:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: '导入失败: ' + error.message });
  }
});

function parseExcelDate(value) {
  if (!value) return null;
  if (typeof value === 'number') return new Date((value - 25569) * 86400 * 1000);
  if (typeof value === 'string') {
    const parts = value.match(/^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2}):(\d{2}))?$/);
    if (parts) {
      const [, day, month, year, hours = 0, minutes = 0, seconds = 0] = parts;
      const d = new Date(year, month - 1, day, hours, minutes, seconds);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

module.exports = router;
