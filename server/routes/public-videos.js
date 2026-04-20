const express = require('express');
const Video = require('../models/Video');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const Influencer = require('../models/Influencer');
const SampleManagement = require('../models/SampleManagement');

const router = express.Router();

/**
 * @route   GET /api/public/videos
 * @desc    获取当前店铺商品相关视频列表（公开接口，无需登录）
 * @access  Public
 * @notes   按更新时间倒序排列，支持商品名称、达人账号、投流状态筛选
 */
router.get('/', async (req, res) => {
  try {
    const { s: identificationCode, page = 1, limit = 20, productName, influencerAccount, isAdPromotion } = req.query;

    if (!identificationCode) {
      return res.status(400).json({ success: false, message: '缺少识别码参数' });
    }

    // 1. 通过识别码查找店铺
    const shop = await Shop.findOne({ identificationCode });
    if (!shop) {
      return res.status(404).json({ success: false, message: '店铺不存在或识别码无效' });
    }

    // 2. 获取店铺的所有商品
    const productQuery = { shopId: shop._id };
    if (productName) {
      productQuery.name = { $regex: productName, $options: 'i' };
    }
    const products = await Product.find(productQuery).select('_id tiktokProductId name images').lean();
    if (products.length === 0) {
      return res.json({
        success: true,
        data: {
          videos: [],
          pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 }
        }
      });
    }

    // 3. 构建视频查询条件
    const productObjectIds = products.map(p => p._id).filter(Boolean);
    const productTikTokIds = products.map(p => p.tiktokProductId).filter(Boolean);
    
    const videoQuery = { companyId: shop.companyId };
    const productConditions = [];
    if (productObjectIds.length > 0) {
      productConditions.push({ productId: { $in: productObjectIds } });
    }
    if (productTikTokIds.length > 0) {
      productConditions.push({ tiktokProductId: { $in: productTikTokIds } });
    }
    if (productConditions.length > 0) {
      videoQuery.$or = productConditions;
    } else {
      videoQuery.productId = { $in: [] }; // 确保无结果
    }

    // 达人账号筛选
    if (influencerAccount) {
      const matchedInfluencers = await Influencer.find({
        tiktokId: { $regex: influencerAccount, $options: 'i' }
      }).select('_id').lean();
      if (matchedInfluencers.length > 0) {
        videoQuery.influencerId = { $in: matchedInfluencers.map(inf => inf._id) };
      } else {
        videoQuery.influencerId = { $in: [] };
      }
    }

    // 投流状态筛选
    if (isAdPromotion !== undefined) {
      videoQuery.isAdPromotion = isAdPromotion === 'true';
    }

    // 4. 执行查询（按更新时间倒序）
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const videos = await Video.find(videoQuery)
      .populate('productId', '_id name tiktokProductId images')
      .populate('influencerId', '_id tiktokId tiktokName latestFollowers')
      .populate('sampleId', '_id sampleStatus date')
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Video.countDocuments(videoQuery);

    // 5. 构建响应数据
    const videosData = videos.map(video => {
      const productInfo = video.productId ? {
        _id: video.productId._id,
        name: video.productId.name,
        tiktokProductId: video.productId.tiktokProductId,
        image: video.productId.images?.[0] || video.productId.images?.[0] || ''
      } : null;

      const influencerInfo = video.influencerId ? {
        tiktokId: video.influencerId.tiktokId,
        tiktokName: video.influencerId.tiktokName,
        latestFollowers: video.influencerId.latestFollowers
      } : null;

      const sampleInfo = video.sampleId ? {
        sampleStatus: video.sampleId.sampleStatus,
        date: video.sampleId.date
      } : null;

      return {
        _id: video._id,
        videoLink: video.videoLink,
        videoStreamCode: video.videoStreamCode,
        isAdPromotion: video.isAdPromotion,
        adPromotionTime: video.adPromotionTime,
        updatedAt: video.updatedAt,
        productInfo,
        influencerInfo,
        sampleInfo
      };
    });

    res.json({
      success: true,
      data: {
        videos: videosData,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Public videos API error:', error);
    res.status(500).json({
      success: false,
      message: '获取视频列表失败'
    });
  }
});

module.exports = router;