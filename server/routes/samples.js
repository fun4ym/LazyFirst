const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const SampleManagement = require('../models/SampleManagement');
const Product = require('../models/Product');
const Influencer = require('../models/Influencer');
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
 */
router.get('/', authenticate, authorize('samples:read'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      date,
      productName,
      influencerAccount,
      salesman,
      isSampleSent,
      isOrderGenerated
    } = req.query;

    const query = { companyId: req.companyId };

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

    // 业务员筛选
    if (salesman) {
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

    const samples = await SampleManagement.find(query)
      .populate('creatorId', 'realName')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ date: -1 });

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

    // 为每个样品添加黑名单信息
    const samplesWithBlacklist = samples.map(sample => {
      const blacklistInfo = blacklistMap[sample.influencerAccount] || { isBlacklisted: false };
      return {
        ...sample.toObject(),
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
 */
router.post('/', authenticate, authorize('samples:create'), [
  body('date').notEmpty().withMessage('日期不能为空'),
  body('productName').notEmpty().withMessage('商品名称不能为空'),
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
      productName,
      productId,
      influencerAccount,
      followerCount,
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

    // 构建唯一键：日期 + 达人账号 + 商品ID
    const uniqueKey = {
      date: new Date(date),
      influencerAccount,
      productId
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
    const sampleData = {
      companyId: req.companyId,
      creatorId: req.user._id,
      date: new Date(date),
      productName,
      productId,
      influencerAccount,
      followerCount: parseInt(followerCount) || 0,
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

    await SampleManagement.create(sampleData);

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
 */
router.put('/:id', authenticate, authorize('samples:update'), async (req, res) => {
  try {
    const sample = await SampleManagement.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      req.body,
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
 */
router.delete('/:id', authenticate, authorize('samples:delete'), async (req, res) => {
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
 * @route   POST /api/samples/import
 * @desc    导入样品申请Excel
 * @access  Private
 */
router.post('/import', authenticate, authorize('samples:create'), upload.single('file'), async (req, res) => {
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

        // 构建唯一键：日期 + 达人账号 + 商品ID
        const uniqueKey = {
          date: date,
          influencerAccount: row['达人账号'],
          productId: row['商品ID']
        };

        // 检查记录是否已存在
        const existing = await SampleManagement.findOne({
          companyId: req.companyId,
          ...uniqueKey
        });

        // 构建导入数据
        const sampleData = {
          companyId: req.companyId,
          creatorId: req.user._id,
          date: date,
          productName: row['商品名称'],
          productId: row['商品ID'],
          influencerAccount: row['达人账号'],
          followerCount: parseInt(row['粉丝数']) || 0,
          salesman: row['归属业务员'] || '',
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
