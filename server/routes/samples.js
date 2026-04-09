const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize, filterByDataScope } = require('../middleware/auth');
const SampleManagement = require('../models/SampleManagement');
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
 * @desc    获取样品申请列表
 * @access  Private
 * @notes   支持 samples:read (管理员) 和 samples-bd:read (BD) 两种权限
 */
router.get('/', authenticate, authorize('samples:read', 'samplesBd:read'), filterByDataScope({ module: 'samples', ownerField: 'salesman', deptField: 'deptId', ownerValue: (req) => req.user.username }), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      date,
      productName,
      influencerAccount,
      salesman,
      salesmanId,
      isSampleSent,
      isOrderGenerated,
      productId  // 商品ID搜索
    } = req.query;

    // 使用数据权限过滤条件
    const query = { ...req.dataScope.query };
    
    // BD用户按salesman名称过滤（因为样品数据用salesman而不是salesmanId）
    // 兼容存储的 realName 和 username
    if (req.dataScope.scope === 'self' && req.user.username) {
      const salesmanNames = [req.user.username];
      if (req.user.realName) {
        salesmanNames.push(req.user.realName);
      }
      query.$or = [
        { salesmanId: req.user._id },
        { salesman: { $in: salesmanNames } }
      ];
      delete query.salesmanId;
    }

    // 日期筛选
    if (date) {
      query.date = {
        $gte: new Date(date),
        $lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1))
      };
    }

    // 商品名称筛选
    if (productName) {
      query.productName = { $regex: productName, $options: 'i' };
    }

    // 达人账号筛选
    if (influencerAccount) {
      query.influencerAccount = { $regex: influencerAccount, $options: 'i' };
    }

    // 业务员ID筛选（精确匹配）- 使用salesman名称精确匹配
    if (salesmanId) {
      // salesmanId实际上是salesman名称，直接精确匹配
      query.salesman = salesmanId;
    } else if (salesman) {
      // 业务员名称筛选（用于管理模式的模糊搜索）
      query.salesman = { $regex: salesman, $options: 'i' };
    }

    // 是否寄样筛选
    if (isSampleSent !== undefined) {
      query.isSampleSent = isSampleSent === 'true';
    }

    // 是否出单筛选
    if (isOrderGenerated !== undefined) {
      query.isOrderGenerated = isOrderGenerated === 'true';
    }

    // TikTok商品ID筛选（模糊搜索）- productId字段存的就是TikTok商品ID
    if (productId) {
      query.productId = { $regex: productId, $options: 'i' };
    }

    const samples = await SampleManagement.find(query)
      .populate('creatorId', 'realName')
      .populate('fulfillmentUpdatedBy', 'realName')
      .populate('adPromotionUpdatedBy', 'realName')
      .populate('sampleStatusUpdatedBy', 'realName')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ date: -1 });

    // 获取用户ID到名字的映射
    const users = await User.find({ companyId: req.companyId }).select('_id realName username');
    const userIdToName = {};
    users.forEach(u => {
      userIdToName[u._id.toString()] = u.realName || u.username || u._id.toString();
    });

    // 获取商品对应的店铺信息（过滤无效的ObjectId格式）
    const productIds = [...new Set(samples.map(s => s.productId).filter(Boolean))];
    const validObjectIds = productIds.filter(id => /^[0-9a-fA-F]{24}$/.test(id));
    const objectIdList = [];
    for (const id of validObjectIds) {
      try {
        objectIdList.push(mongoose.Types.ObjectId.createFromHexString(id));
      } catch (e) {
        // 跳过无效ID
      }
    }
    
    // 查询 Product 表获取店铺信息
    const productsWithShop = await Product.find({
      $or: [
        { tiktokProductId: { $in: productIds } },
        ...(objectIdList.length > 0 ? [{ _id: { $in: objectIdList } }] : [])
      ]
    }).select('_id shopId tiktokProductId name').lean();

    const productShopMap = {};
    const productNameMap = {};
    productsWithShop.forEach(p => {
      const pid = p.tiktokProductId || (typeof p._id === 'string' ? p._id : p._id.toString());
      productShopMap[pid] = p.shopId;
      productNameMap[pid] = p.name;
    });

    // 获取店铺信息
    const shopIds = [...new Set(Object.values(productShopMap).filter(Boolean))];
    const shops = await Shop.find({ _id: { $in: shopIds } }).select('_id shopName').lean();
    const shopMap = {};
    shops.forEach(s => {
      shopMap[s._id.toString()] = s.shopName;
    });

    // 获取每个样品的达人黑名单状态
    const influencerAccounts = [...new Set(samples.map(s => s.influencerAccount).filter(Boolean))];
    const blacklistedInfluencers = await Influencer.find({
      tiktokId: { $in: influencerAccounts },
      isBlacklisted: true
    }).select('tiktokId isBlacklisted blacklistedAt blacklistedByName blacklistReason');

    const blacklistMap = {};
    blacklistedInfluencers.forEach(inf => {
      blacklistMap[inf.tiktokId] = {
        isBlacklisted: inf.isBlacklisted,
        blacklistedAt: inf.blacklistedAt,
        blacklistedByName: inf.blacklistedByName,
        blacklistReason: inf.blacklistReason
      };
    });

    // 为每个样品添加黑名单信息和店铺信息
    const samplesWithBlacklist = samples.map(sample => {
      const blacklistInfo = blacklistMap[sample.influencerAccount] || { isBlacklisted: false };
      const sampleObj = sample.toObject();
      // 将salesman ID转换为名字
      let salesmanName = sampleObj.salesman;
      if (sampleObj.salesman) {
        const salesmanIdStr = typeof sampleObj.salesman === 'object' ? sampleObj.salesman.toString() : sampleObj.salesman;
        const user = users.find(u => u._id.toString() === salesmanIdStr);
        if (user) {
          salesmanName = user.realName || user.username;
        }
      }
      // 获取店铺信息
      const productIdStr = sampleObj.productId || '';
      const shopId = productShopMap[productIdStr];
      const shopName = shopId ? (shopMap[shopId.toString()] || '') : '';
      // productName：优先用Product表数据
      const productName = productNameMap[productIdStr] || sampleObj.productName || '';
      return {
        ...sampleObj,
        productId: productIdStr,  // 已是TikTok商品ID，直接返回
        productName: productName,
        salesman: salesmanName,
        shopName: shopName,
        isBlacklistedInfluencer: blacklistInfo.isBlacklisted,
        influencerBlacklistInfo: blacklistInfo.isBlacklisted ? blacklistInfo : null
      };
    });

    const total = await SampleManagement.countDocuments(query);

    res.json({
      success: true,
      data: {
        samples: samplesWithBlacklist,
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
 * @desc    创建样品申请（手动录入）
 * @access  Private
 * @notes   支持 samples:create (管理员) 和 samples-bd:create (BD) 两种权限
 */
router.post('/', authenticate, authorize('samples:create', 'samplesBd:create'), [
  body('date').notEmpty().withMessage('日期不能为空'),
  body('productId').notEmpty().withMessage('商品ID不能为空'),
  body('influencerAccount').notEmpty().withMessage('达人账号不能为空')
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
      productName: inputProductName,
      productId: inputProductId,
      influencerAccount,
      followerCount,
      monthlySalesCount,
      avgVideoViews,
      salesman,
      shippingInfo,
      sampleImage,
      isSampleSent,
      trackingNumber,
      shippingDate,
      logisticsCompany,
      receivedDate,
      fulfillmentTime,
      videoLink,
      videoStreamCode,
      isAdPromotion,
      adPromotionTime,
      isOrderGenerated
    } = req.body;

    // 验证并获取 Product 信息
    // inputProductId 是前端传的商品 ID（MongoDB ObjectId）
    let product;
    let productName = inputProductName;

    try {
      product = await Product.findById(inputProductId);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: '商品不存在'
        });
      }
      // 如果没传 productName，使用 Product 的 name
      if (!productName) {
        productName = product.name;
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: '无效的商品ID'
      });
    }

    // 构建唯一键：日期 + 达人账号 + TikTok商品ID
    // productId 存的是 TikTok 商品 ID（String），用于展示
    const uniqueKey = {
      date: new Date(date),
      influencerAccount,
      productId: product.tiktokProductId || product._id.toString()
    };

    // 检查记录是否已存在
    const existing = await SampleManagement.findOne({
      companyId: req.companyId,
      ...uniqueKey
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: '该记录已存在，请使用导入功能更新'
      });
    }

    // 构建数据
    // productId 存 TikTok 商品 ID（String），用于展示
    const sampleData = {
      companyId: req.companyId,
      creatorId: req.user._id,
      date: new Date(date),
      productName,
      productId: product.tiktokProductId || product._id.toString(),  // 存 TikTok 商品 ID
      influencerAccount,
      followerCount: parseInt(followerCount) || 0,
      monthlySalesCount: parseInt(monthlySalesCount) || 0,
      avgVideoViews: parseInt(avgVideoViews) || 0,
      salesman: salesman || '',
      shippingInfo: shippingInfo || '',
      sampleImage: sampleImage || '',
      isSampleSent: isSampleSent || false,
      trackingNumber: trackingNumber || '',
      shippingDate: shippingDate ? new Date(shippingDate) : undefined,
      logisticsCompany: logisticsCompany || '',
      receivedDate: receivedDate ? new Date(receivedDate) : undefined,
      fulfillmentTime: fulfillmentTime || '',
      videoLink: videoLink || '',
      videoStreamCode: videoStreamCode || '',
      isAdPromotion: isAdPromotion || false,
      adPromotionTime: adPromotionTime ? new Date(adPromotionTime) : undefined,
      isOrderGenerated: isOrderGenerated || false
    };

    // 移除 undefined 字段
    Object.keys(sampleData).forEach(key => {
      if (sampleData[key] === undefined) {
        delete sampleData[key];
      }
    });

    const sample = await SampleManagement.create(sampleData);

    // 查找对应的达人，创建维护记录
    const influencer = await Influencer.findOne({
      companyId: req.companyId,
      tiktokId: influencerAccount
    });

    if (influencer) {
      const maintenance = new InfluencerMaintenance({
        companyId: req.companyId,
        influencerId: influencer._id,
        followers: parseInt(followerCount) || 0,
        monthlySalesCount: parseInt(monthlySalesCount) || 0,
        avgVideoViews: parseInt(avgVideoViews) || 0,
        gmv: 0,
        poolType: influencer.poolType,
        remark: `申请样品：${productName}`,
        maintainerId: req.user._id,
        maintainerName: req.user.realName || req.user.username,
        recordType: 'sample_application',
        sampleId: sample._id
      });
      await maintenance.save();

      // 更新达人的最新维护信息
      influencer.latestFollowers = parseInt(followerCount) || 0;
      influencer.latestMaintenanceTime = maintenance.createdAt;
      influencer.latestMaintainerId = req.user._id;
      influencer.latestMaintainerName = req.user.realName || req.user.username;
      influencer.latestRemark = `申请样品：${productName}`;
      await influencer.save();
    }

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
 * @desc    更新样品申请
 * @access  Private
 * @notes   支持 samples:update (管理员) 和 samples-bd:update (BD) 两种权限
 */
router.put('/:id', authenticate, authorize('samples:update', 'samplesBd:update'), async (req, res) => {
  try {
    const { videoLink, videoStreamCode, sampleStatus, refusalReason, ...restBody } = req.body;
    const updateData = { ...restBody };

    // 如果更新了视频链接（履约信息），记录更新人和时间
    if (videoLink !== undefined) {
      updateData.videoLink = videoLink;
      updateData.fulfillmentUpdatedBy = req.user._id;
      updateData.fulfillmentUpdatedAt = new Date();
    }

    // 如果更新了投流码或投流状态（投流信息），记录更新人和时间
    if (videoStreamCode !== undefined || req.body.isAdPromotion !== undefined) {
      if (videoStreamCode !== undefined) {
        updateData.videoStreamCode = videoStreamCode;
      }
      if (req.body.isAdPromotion !== undefined) {
        updateData.isAdPromotion = req.body.isAdPromotion;
      }
      updateData.adPromotionUpdatedBy = req.user._id;
      updateData.adPromotionUpdatedAt = new Date();
    }

    // 如果更新了寄样状态，记录更新人和时间
    if (sampleStatus !== undefined) {
      updateData.sampleStatus = sampleStatus;
      updateData.sampleStatusUpdatedBy = req.user._id;
      updateData.sampleStatusUpdatedAt = new Date();
      // 同步更新 isSampleSent 兼容旧数据
      updateData.isSampleSent = sampleStatus === 'sent';
      // 如果改为已寄样，同步更新物流信息
      if (sampleStatus === 'sent') {
        if (req.body.logisticsCompany !== undefined) {
          updateData.logisticsCompany = req.body.logisticsCompany;
        }
        if (req.body.trackingNumber !== undefined) {
          updateData.trackingNumber = req.body.trackingNumber;
        }
      }
    }

    // 如果更新了不合作原因
    if (refusalReason !== undefined) {
      updateData.refusalReason = refusalReason;
    }

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
 * @desc    删除样品申请
 * @access  Private
 * @notes   支持 samples:delete (管理员) 和 samples-bd:delete (BD) 两种权限
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

/**
 * @route   POST /api/samples/import
 * @desc    导入样品申请Excel
 * @access  Private
 * @notes   支持 samples:create (管理员) 和 samples-bd:create (BD) 两种权限
 */
router.post('/import', authenticate, authorize('samples:create', 'samplesBd:create'), upload.single('file'), async (req, res) => {
  try {
    console.log('[Sample Import] 导入请求接收');

    if (!req.file) {
      console.error('[Sample Import] 未上传文件');
      return res.status(400).json({
        success: false,
        message: '请上传Excel文件'
      });
    }

    console.log('[Sample Import] 文件路径:', req.file.path);
    console.log('[Sample Import] 文件名:', req.file.originalname);

    // 读取Excel文件
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    console.log(`[Sample Import] Excel文件解析完成，共 ${jsonData.length} 行数据`);

    if (jsonData.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Excel文件为空'
      });
    }

    // 打印第一行数据用于调试
    if (jsonData.length > 0) {
      console.log('[Sample Import] 第一行字段:', Object.keys(jsonData[0]));
      console.log('[Sample Import] 第一行数据:', JSON.stringify(jsonData[0], null, 2));
    }

    const result = {
      added: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < jsonData.length; i++) {
      try {
        const row = jsonData[i];

        // 解析日期（日期格式可能是数字或字符串）
        const rawDate = row['日期'];
        const date = parseExcelDate(rawDate);

        // 解析发货日期
        const rawShippingDate = row['发货日期'];
        const shippingDate = parseExcelDate(rawShippingDate);

        // 解析收样日期
        const rawReceivedDate = row['收样日期'];
        const receivedDate = parseExcelDate(rawReceivedDate);

        // 解析投流时间
        const rawAdPromotionTime = row['投流时间'];
        const adPromotionTime = parseExcelDate(rawAdPromotionTime);

        // 检查必填字段
        if (!date) {
          result.failed++;
          result.errors.push({
            row: i + 2,
            error: '日期字段为空或格式错误'
          });
          continue;
        }

        if (!row['商品名称']) {
          result.failed++;
          result.errors.push({
            row: i + 2,
            error: '商品名称不能为空'
          });
          continue;
        }

        if (!row['商品ID']) {
          result.failed++;
          result.errors.push({
            row: i + 2,
            error: '商品ID不能为空'
          });
          continue;
        }

        if (!row['达人账号']) {
          result.failed++;
          result.errors.push({
            row: i + 2,
            error: '达人账号不能为空'
          });
          continue;
        }

        // 根据商品ID或名称查找 Product
        let productIdObj = null;
        let productName = row['商品名称'] || '';
        const productIdInput = String(row['商品ID'] || '').trim();
        
        if (productIdInput) {
          // 1. 尝试用 MongoDB _id 查找
          try {
            const product = await Product.findById(productIdInput);
            if (product) {
              productIdObj = product._id;
              productName = product.name || productName;
            }
          } catch (err) {
            // ID 格式不对，继续尝试其他方式
          }
          
          // 2. 如果没找到，尝试用 tiktokProductId 查找
          if (!productIdObj) {
            const productByTiktokId = await Product.findOne({ tiktokProductId: productIdInput });
            if (productByTiktokId) {
              productIdObj = productByTiktokId._id;
              productName = productByTiktokId.name || productName;
            }
          }
          
          // 3. 如果还没找到，尝试用 sku 查找
          if (!productIdObj) {
            const productBySku = await Product.findOne({ sku: productIdInput });
            if (productBySku) {
              productIdObj = productBySku._id;
              productName = productBySku.name || productName;
            }
          }
          
          // 4. 如果还没找到，尝试用 tiktokSku 查找
          if (!productIdObj) {
            const productByTiktokSku = await Product.findOne({ tiktokSku: productIdInput });
            if (productByTiktokSku) {
              productIdObj = productByTiktokSku._id;
              productName = productByTiktokSku.name || productName;
            }
          }
          
          // 5. 如果还没找到，尝试用 name 查找
          if (!productIdObj && productName) {
            const productByName = await Product.findOne({ name: productName });
            if (productByName) {
              productIdObj = productByName._id;
            }
          }
          
          // 6. 如果还没找到，模糊匹配 name
          if (!productIdObj && productName) {
            const productByNameLike = await Product.findOne({ name: { $regex: productName, $options: 'i' } });
            if (productByNameLike) {
              productIdObj = productByNameLike._id;
              productName = productByNameLike.name || productName;
            }
          }
        }
        
        if (!productIdObj) {
          result.failed++;
          result.errors.push({
            row: rowIndex + 1,
            message: `商品不存在: ${productIdInput || productName}`
          });
          continue;
        }

        // 获取 TikTok 商品 ID
        const tiktokProductId = productByTiktokId?.tiktokProductId || productIdObj.toString();
        
        // 构建唯一键：日期 + 达人账号 + TikTok商品ID
        const uniqueKey = {
          date: date,
          influencerAccount: row['达人账号'],
          productId: tiktokProductId  // 存 TikTok 商品 ID
        };

        // 检查记录是否已存在
        const existing = await SampleManagement.findOne({
          companyId: req.companyId,
          ...uniqueKey
        });

        // 构建导入数据 - salesman 需要匹配 user 表的 username 获取 ID
        const salesmanName = row['归属业务员'] || '';
        let salesmanId = salesmanName;
        
        // 如果 salesman 是字符串，尝试匹配 user 表的 username 获取 ID
        if (salesmanName && typeof salesmanName === 'string') {
          const user = await User.findOne({ username: salesmanName });
          if (user) {
            salesmanId = user._id;
          }
        }

        const sampleData = {
          companyId: req.companyId,
          creatorId: req.user._id,
          date: date,
          productName: productName,
          productId: tiktokProductId,  // 存 TikTok 商品 ID
          influencerAccount: row['达人账号'],
          followerCount: parseInt(row['粉丝数']) || 0,
          salesman: salesmanId,
          shippingInfo: row['收货信息'] || '',
          sampleImage: row['样品图片'] || '',
          isSampleSent: row['是否寄样'] === '是' || row['是否寄样'] === true,
          trackingNumber: row['发货单号'] || '',
          shippingDate: shippingDate,
          logisticsCompany: row['物流公司'] || '',
          receivedDate: receivedDate,
          fulfillmentTime: row['履约时间'] || '',
          videoLink: row['达人视频链接'] || '',
          videoStreamCode: row['视频推流码'] || '',
          isAdPromotion: row['是否投流'] === '是' || row['是否投流'] === true,
          adPromotionTime: adPromotionTime,
          isOrderGenerated: row['是否出单'] === '是' || row['是否出单'] === true
        };

        if (existing) {
          // 记录已存在，更新记录
          console.log(`[Sample Import] 更新记录: ${date.toISOString().split('T')[0]} - ${row['达人账号']} - ${row['商品ID']}`);
          await SampleManagement.updateOne(
            { _id: existing._id },
            sampleData
          );
          result.updated++;
        } else {
          // 新增记录
          await SampleManagement.create(sampleData);
          result.added++;
          console.log(`[Sample Import] 成功添加记录: ${date.toISOString().split('T')[0]} - ${row['达人账号']} - ${row['商品ID']}`);
        }

      } catch (err) {
        console.error(`[Sample Import] 处理第 ${i + 2} 行时出错:`, err);
        result.failed++;
        result.errors.push({
          row: i + 2,
          error: err.message
        });
      }
    }

    // 删除上传的临时文件
    fs.unlinkSync(req.file.path);

    console.log('[Sample Import] 导入完成:', result);

    res.json({
      success: true,
      message: `导入完成：新增 ${result.added} 条，更新 ${result.updated} 条，失败 ${result.failed} 条`,
      data: result
    });

  } catch (error) {
    console.error('[Sample Import] 导入错误:', error);
    console.error('[Sample Import] 错误堆栈:', error.stack);

    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: '导入失败: ' + error.message
    });
  }
});

// 解析Excel日期的辅助函数
function parseExcelDate(value) {
  if (!value) return null;

  // 处理Excel数字日期
  if (typeof value === 'number') {
    return new Date((value - 25569) * 86400 * 1000);
  }

  // 处理字符串日期格式
  if (typeof value === 'string') {
    // 尝试解析 DD/MM/YYYY HH:mm:ss 格式
    const parts = value.match(/^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2}):(\d{2}))?$/);
    if (parts) {
      const [, day, month, year, hours = 0, minutes = 0, seconds = 0] = parts;
      const date = new Date(year, month - 1, day, hours, minutes, seconds);
      return isNaN(date.getTime()) ? null : date;
    }

    // 尝试其他格式
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

module.exports = router;
