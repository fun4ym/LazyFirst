const express = require('express');
const SampleManagement = require('../models/SampleManagement');
const Shop = require('../models/Shop');
const Company = require('../models/Company');
const Influencer = require('../models/Influencer');

const router = express.Router();

/**
 * @route   GET /api/public/samples
 * @desc    通过店铺识别码获取样品申请列表（公开接口，无需登录）
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { s: identificationCode } = req.query;

    if (!identificationCode) {
      return res.status(400).json({
        success: false,
        message: '缺少识别码参数'
      });
    }

    // 1. 通过识别码查找店铺
    const shop = await Shop.findOne({ identificationCode });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: '店铺不存在或识别码无效'
      });
    }

    // 获取公司信息
    let companyInfo = null;
    if (shop.companyId) {
      const company = await Company.findById(shop.companyId).select('name logo avatar');
      if (company) {
        companyInfo = {
          _id: company._id,
          name: company.name,
          logo: company.logo || company.avatar || ''
        };
      }
    }

    // 2. 获取该店铺关联的商品ID列表
    const productIdList = shop.products || [];

    if (productIdList.length === 0) {
      return res.json({
        success: true,
        data: {
          shop: {
            _id: shop._id,
            shopName: shop.shopName,
            identificationCode: shop.identificationCode,
            identificationCodeGeneratedAt: shop.identificationCodeGeneratedAt
          },
          samples: [],
          pagination: { total: 0, page: 1, limit: 20, pages: 0 }
        }
      });
    }

    // 3. 查询样品申请
    const { 
      page = 1, 
      limit = 20,
      sampleStatus,
      isOrderGenerated,
      date,
      productName
    } = req.query;

    const query = {
      productId: { $in: productIdList }
    };

    // 筛选：寄样状态
    if (sampleStatus) {
      query.sampleStatus = sampleStatus;
    }

    // 筛选：是否出单
    if (isOrderGenerated !== undefined) {
      query.isOrderGenerated = isOrderGenerated === 'true';
    }

    // 筛选：申请日期
    if (date) {
      query.date = {
        $gte: new Date(date),
        $lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1))
      };
    }

    // 筛选：商品名称
    if (productName) {
      query.productName = { $regex: productName, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const samples = await SampleManagement.find(query)
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ date: -1 });

    const total = await SampleManagement.countDocuments(query);

    // 获取所有达人账号，用于查询GMV
    const influencerAccounts = [...new Set(samples.map(s => s.influencerAccount).filter(Boolean))];
    
    // 查询达人信息获取GMV
    const influencers = await Influencer.find({ tiktokId: { $in: influencerAccounts } })
      .select('tiktokId latestFollowers latestGmv');
    
    // 构建达人信息映射
    const influencerMap = {};
    influencers.forEach(inf => {
      influencerMap[inf.tiktokId] = {
        latestFollowers: inf.latestFollowers,
        latestGmv: inf.latestGmv
      };
    });

    // 整理返回数据
    const samplesData = samples.map(sample => ({
      _id: sample._id,
      date: sample.date,
      influencerAccount: sample.influencerAccount,
      productName: sample.productName,
      productId: sample.productId,
      followerCount: sample.followerCount,
      gmv: influencerMap[sample.influencerAccount]?.latestGmv || 0,
      salesman: sample.salesman,
      shippingInfo: sample.shippingInfo,
      isSampleSent: sample.isSampleSent,
      sampleStatus: sample.sampleStatus,
      trackingNumber: sample.trackingNumber,
      shippingDate: sample.shippingDate,
      receivedDate: sample.receivedDate,
      isOrderGenerated: sample.isOrderGenerated,
      orderCount: sample.orderCount,
      videoLink: sample.videoLink,
      videoStreamCode: sample.videoStreamCode,
      isAdPromotion: sample.isAdPromotion,
      adPromotionTime: sample.adPromotionTime,
      sampleImage: sample.sampleImage,
      createdAt: sample.createdAt,
      updatedAt: sample.updatedAt
    }));

    res.json({
      success: true,
      data: {
        company: companyInfo,
        shop: {
          _id: shop._id,
          shopName: shop.shopName,
          identificationCode: shop.identificationCode,
          identificationCodeGeneratedAt: shop.identificationCodeGeneratedAt
        },
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
    console.error('Public samples API error:', error);
    res.status(500).json({
      success: false,
      message: '获取样品申请列表失败'
    });
  }
});

/**
 * @route   PUT /api/public/samples/batch
 * @desc    批量更新样品申请（公开接口）
 * @access  Public
 */
router.put('/batch', async (req, res) => {
  try {
    const { s: identificationCode, sampleStatus, isAdPromotion, sampleIds } = req.query;

    if (!identificationCode) {
      return res.status(400).json({
        success: false,
        message: '缺少识别码参数'
      });
    }

    // 处理 sampleIds：可能是数组或逗号分隔的字符串
    let idsArray = sampleIds;
    if (typeof sampleIds === 'string') {
      idsArray = sampleIds.split(',').filter(id => id.trim());
    }
    
    if (!idsArray || !Array.isArray(idsArray) || idsArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: '缺少样品记录ID'
      });
    }

    // 验证识别码
    const shop = await Shop.findOne({ identificationCode });
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: '店铺不存在或识别码无效'
      });
    }

    // 获取该店铺的商品ID列表
    const productIdList = shop.products || [];

    // 构建查询条件：必须是该店铺的商品
    const query = {
      _id: { $in: idsArray },
      productId: { $in: productIdList }
    };

    const updateData = {};

    // 更新寄样状态
    if (sampleStatus !== undefined) {
      updateData.sampleStatus = sampleStatus;
      updateData.isSampleSent = sampleStatus === 'sent';
      updateData.sampleStatusUpdatedAt = new Date();
    }

    // 更新投流开关
    if (isAdPromotion !== undefined) {
      updateData.isAdPromotion = isAdPromotion === 'true';
      updateData.adPromotionUpdatedAt = new Date();
    }

    const result = await SampleManagement.updateMany(
      query,
      { $set: updateData }
    );

    res.json({
      success: true,
      message: `更新成功，共更新 ${result.modifiedCount} 条记录`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      }
    });

  } catch (error) {
    console.error('Public samples batch update error:', error);
    res.status(500).json({
      success: false,
      message: '批量更新失败'
    });
  }
});

module.exports = router;
