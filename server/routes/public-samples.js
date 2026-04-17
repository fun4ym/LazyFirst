const express = require('express');
const SampleManagement = require('../models/SampleManagement');
const Video = require('../models/Video');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const Company = require('../models/Company');
const Influencer = require('../models/Influencer');
const User = require('../models/User');

const router = express.Router();

/**
 * @route   GET /api/public/samples
 * @desc    通过店铺识别码获取样品申请列表（公开接口，无需登录）
 * @access  Public
 * @notes   重构后适配新数据模型：productId是ObjectId，influencerId替换influencerAccount
 */
router.get('/', async (req, res) => {
  try {
    const { s: identificationCode } = req.query;

    if (!identificationCode) {
      return res.status(400).json({ success: false, message: '缺少识别码参数' });
    }

    // 1. 通过识别码查找店铺
    const shop = await Shop.findOne({ identificationCode });
    if (!shop) {
      return res.status(404).json({ success: false, message: '店铺不存在或识别码无效' });
    }

    let companyInfo = null;
    if (shop.companyId) {
      const company = await Company.findById(shop.companyId).select('name logo avatar');
      if (company) {
        companyInfo = { _id: company._id, name: company.name, logo: company.logo || company.avatar || '' };
      }
    }

    // ★ 重构后：用shopId查Product的_id列表（不再是tiktokProductId）
    const products = await Product.find({ shopId: shop._id }).select('_id tiktokProductId name images productImages');

    if (products.length === 0) {
      return res.json({
        success: true,
        data: {
          shop: { _id: shop._id, shopName: shop.shopName, identificationCode: shop.identificationCode, identificationCodeGeneratedAt: shop.identificationCodeGeneratedAt },
          samples: [],
          pagination: { total: 0, page: 1, limit: 20, pages: 0 }
        }
      });
    }

    // ★ 用Product._id列表查询样品
    const productIds = products.map(p => p._id);

    const { page = 1, limit = 20, sampleStatus, isOrderGenerated, date, productName, influencerAccount } = req.query;

    // ★ productId 现在是 ObjectId
    const query = { productId: { $in: productIds } };

    if (sampleStatus) query.sampleStatus = sampleStatus;
    if (isOrderGenerated !== undefined) query.isOrderGenerated = isOrderGenerated === 'true';
    if (date) query.date = { $gte: new Date(date), $lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)) };

    // ★ 商品名称筛选 → 先查Product获取_ids
    if (productName) {
      const matchedProducts = await Product.find({
        _id: { $in: productIds },
        name: { $regex: productName, $options: 'i' }
      }).select('_id').lean();
      query.productId = matchedProducts.length > 0 ? { $in: matchedProducts.map(p => p._id) } : { $in: [] };
    }

    // ★ 达人账号筛选 → 先查Influencer获取_ids
    if (influencerAccount) {
      const matchedInfluencers = await Influencer.find({
        tiktokId: { $regex: influencerAccount, $options: 'i' }
      }).select('_id').lean();
      if (matchedInfluencers.length > 0) {
        query.influencerId = { $in: matchedInfluencers.map(inf => inf._id) };
      } else {
        query.influencerId = { $in: [] };
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // ★ populate关联查询
    const samples = await SampleManagement.find(query)
      .populate('influencerId', 'tiktokId tiktokName latestFollowers latestGmv')
      .populate('salesmanId', 'realName username')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ date: -1 });

    const total = await SampleManagement.countDocuments(query);

    // 获取样品的Videos
    const sampleIds = samples.map(s => s._id);
    const videos = sampleIds.length > 0 ? await Video.find({ sampleId: { $in: sampleIds } }).lean() : [];
    const videoMap = {};
    videos.forEach(v => {
      if (!videoMap[v.sampleId.toString()]) videoMap[v.sampleId.toString()] = [];
      videoMap[v.sampleId.toString()].push(v);
    });

    // 构建商品信息映射
    const productMap = {};
    products.forEach(p => {
      productMap[p._id.toString()] = {
        name: p.name,
        tiktokProductId: p.tiktokProductId,
        image: p.images?.[0] || p.productImages?.[0] || ''
      };
    });

    // 组装返回数据（带兼容字段）
    const samplesData = samples.map(sample => {
      const sampleVideos = videoMap[sample._id.toString()] || [];
      const latestVideo = sampleVideos[0] || null;

      return {
        _id: sample._id,
        date: sample.date,
        // 兼容字段
        productName: sample.productId?.name || '',
        productId: sample.productId?.tiktokProductId || '',       // TikTok ID用于展示
        productImage: sample.productId?.images?.[0] || sample.productId?.productImages?.[0] || '',
        influencerAccount: sample.influencerId?.tiktokId || '',
        followerCount: sample.influencerId?.latestFollowers || 0,
        gmv: sample.influencerId?.latestGmv || 0,
        salesman: sample.salesmanId?.realName || sample.salesmanId?.username || '',
        shippingInfo: sample.shippingInfo,
        isSampleSent: sample.isSampleSent,
        sampleStatus: sample.sampleStatus,
        trackingNumber: sample.trackingNumber,
        shippingDate: sample.shippingDate,
        receivedDate: sample.receivedDate,
        isOrderGenerated: sample.isOrderGenerated,
        orderCount: sample.orderCount,
        // Video信息
        videoLink: latestVideo?.videoLink || '',
        videoStreamCode: latestVideo?.videoStreamCode || '',
        isAdPromotion: sampleVideos.some(v => v.isAdPromotion) || sample.isAdPromotion || false,
        adPromotionTime: latestVideo?.adPromotionTime || sample.adPromotionTime,
        duplicateCount: sample.duplicateCount || 0,
        previousSubmissions: (sample.previousSubmissions || []).map(ps => ({
          ...ps.toObject ? ps.toObject() : ps,
          influencerAccount: ps.influencerAccount || '',
          salesman: ps.salesman || ''
        })),
        createdAt: sample.createdAt,
        updatedAt: sample.updatedAt
      };
    });

    res.json({
      success: true,
      data: {
        company: companyInfo,
        shop: { _id: shop._id, shopName: shop.shopName, identificationCode: shop.identificationCode, identificationCodeGeneratedAt: shop.identificationCodeGeneratedAt },
        samples: samplesData,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
      }
    });

  } catch (error) {
    console.error('Public samples API error:', error);
    res.status(500).json({ success: false, message: '获取样品申请列表失败' });
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

    if (!identificationCode) return res.status(400).json({ success: false, message: '缺少识别码参数' });

    let idsArray = sampleIds;
    if (typeof sampleIds === 'string') idsArray = sampleIds.split(',').filter(id => id.trim());
    if (!idsArray || !Array.isArray(idsArray) || idsArray.length === 0) return res.status(400).json({ success: false, message: '缺少样品记录ID' });

    const shop = await Shop.findOne({ identificationCode });
    if (!shop) return res.status(404).json({ success: false, message: '店铺不存在或识别码无效' });

    // ★ 重构后用Product._id匹配
    const products = await Product.find({ shopId: shop._id }).select('_id');
    const productObjectIdList = products.map(p => p._id);

    const query = { _id: { $in: idsArray }, productId: { $in: productObjectIdList } };
    const { logisticsCompany, trackingNumber } = req.query;
    const updateData = {};

    if (sampleStatus !== undefined) {
      updateData.sampleStatus = sampleStatus;
      updateData.isSampleSent = sampleStatus === 'sent';
      updateData.sampleStatusUpdatedAt = new Date();
      if (sampleStatus === 'sent') {
        if (logisticsCompany !== undefined) updateData.logisticsCompany = logisticsCompany;
        if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
      }
    }

    if (isAdPromotion !== undefined) {
      updateData.isAdPromotion = isAdPromotion === 'true';
      updateData.adPromotionUpdatedAt = new Date();
    }

    const result = await SampleManagement.updateMany(query, { $set: updateData });
    res.json({ success: true, message: `更新成功，共更新 ${result.modifiedCount} 条记录`, data: { modifiedCount: result.modifiedCount, matchedCount: result.matchedCount } });

  } catch (error) {
    console.error('Public samples batch update error:', error);
    res.status(500).json({ success: false, message: '批量更新失败' });
  }
});

module.exports = router;
