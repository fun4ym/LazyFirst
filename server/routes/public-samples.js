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

    // ★ 获取店铺的所有产品
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

    // ★ 用Product._id和tiktokProductId列表查询样品（SampleManagement.productId存储为ObjectId，但模式定义为String）
    const mongoose = require('mongoose');
    // product._id 本身就是 ObjectId，直接使用
    const productObjectIds = products.map(p => p._id).filter(Boolean);
    const productIdsByTikTokId = products.map(p => p.tiktokProductId).filter(Boolean);
    
    console.log(`[DEBUG] public-samples.js: productObjectIds count=${productObjectIds.length}, productIdsByTikTokId count=${productIdsByTikTokId.length}`);
    console.log(`[DEBUG] public-samples.js: first few productObjectIds:`, productObjectIds.slice(0,5).map(id => id.toString()));
    console.log(`[DEBUG] public-samples.js: first few productIdsByTikTokId:`, productIdsByTikTokId.slice(0,5));

    const { page = 1, limit = 20, sampleStatus, isOrderGenerated, date, productName, influencerAccount } = req.query;

    // ★ 构建查询：样品可以通过 productId 匹配店铺产品，或通过 shopId 直接匹配店铺
    const query = { companyId: shop.companyId };
    const orConditions = [];
    
    // 条件1：通过 productId 匹配店铺产品（ObjectId 或 TikTok ID）
    if (productObjectIds.length > 0) {
      orConditions.push({ productId: { $in: productObjectIds } });
    }
    if (productIdsByTikTokId.length > 0) {
      orConditions.push({ productId: { $in: productIdsByTikTokId } });
    }
    
    // 条件2：通过 shopId 直接匹配店铺（ObjectId）
    orConditions.push({ shopId: shop._id });  // 匹配 ObjectId 类型的 shopId
    // 注意：shop.shopNumber 是字符串，不能直接匹配 ObjectId 类型的 shopId 字段
    // 如果需要匹配 shopNumber，需要将 shopId 字段类型改为 String 或 Mixed
    
    if (orConditions.length > 0) {
      query.$or = orConditions;
    } else {
      // 如果没有有效的ID，则确保查询不返回任何结果
      query.productId = { $in: [] };
    }
    
    console.log(`[DEBUG] public-samples.js: shop._id=${shop._id}, shop.shopNumber=${shop.shopNumber}`);

    if (sampleStatus) query.sampleStatus = sampleStatus;
    if (isOrderGenerated !== undefined) query.isOrderGenerated = isOrderGenerated === 'true';
    if (date) query.date = { $gte: new Date(date), $lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)) };

    // ★ 商品名称筛选 → 先查Product获取_ids
    if (productName) {
      const matchedProducts = await Product.find({
        shopId: shop._id,
        name: { $regex: productName, $options: 'i' }
      }).select('_id').lean();
      const matchedIds = matchedProducts.map(p => p._id.toString()).filter(Boolean);
      query.productId = matchedIds.length > 0 ? { $in: matchedIds } : { $in: [] };
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

    console.log(`[DEBUG] public-samples.js: final query=`, JSON.stringify(query, null, 2));
    // ★ populate关联查询
    const samples = await SampleManagement.find(query)
      .populate('influencerId', 'tiktokId tiktokName latestFollowers latestGmv monthlySalesCount avgVideoViews')
      .populate('salesmanId', 'realName username')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ date: -1 });

    const total = await SampleManagement.countDocuments(query);

    // 获取样品的Videos
    const sampleIds = samples.map(s => s._id);
    console.log(`[DEBUG] public-samples.js: shop.companyId=${shop.companyId}, sampleIds count=${sampleIds.length}`);
    const videos = sampleIds.length > 0 ? await Video.find({ companyId: shop.companyId, sampleId: { $in: sampleIds } }).lean() : [];
    console.log(`[DEBUG] public-samples.js: videos found=${videos.length}`);
    const videoMap = {};
    videos.forEach(v => {
      if (!videoMap[v.sampleId.toString()]) videoMap[v.sampleId.toString()] = [];
      videoMap[v.sampleId.toString()].push(v);
    });

    // 构建商品信息映射（同时支持_id和tiktokProductId作为键）
    const productMapById = {};
    const productMapByTikTokId = {};
    products.forEach(p => {
      const productInfo = {
        name: p.name,
        tiktokProductId: p.tiktokProductId,
        image: p.images?.[0] || p.productImages?.[0] || '',
        _id: p._id
      };
      productMapById[p._id.toString()] = productInfo;
      if (p.tiktokProductId) {
        productMapByTikTokId[p.tiktokProductId] = productInfo;
      }
    });

    // 组装返回数据（带兼容字段）
    const samplesData = samples.map(sample => {
      const sampleVideos = videoMap[sample._id.toString()] || [];
      const latestVideo = sampleVideos[0] || null;
      
      // 从商品映射获取产品信息（优先按_id查找，找不到再按tiktokProductId查找）
      const productInfo = productMapById[sample.productId] || productMapByTikTokId[sample.productId] || {};
      const productName = productInfo.name || '';
      const productImage = productInfo.image || '';
      const displayProductId = productInfo.tiktokProductId || sample.productId || '';

      return {
        _id: sample._id,
        date: sample.date,
        // 兼容字段
        productName: productName,
        productId: displayProductId,       // TikTok ID用于展示
        productImage: productImage,
        shopName: shop.shopName,           // 添加店铺名称
        influencerAccount: sample.influencerId?.tiktokId || sample.influencerAccount || '',
        followerCount: sample.influencerId?.latestFollowers || 0,
        gmv: sample.influencerId?.latestGmv || 0,
        salesman: sample.salesmanId?.realName || sample.salesmanId?.username || sample.salesman || '',
        shippingInfo: sample.shippingInfo,
        isSampleSent: sample.isSampleSent,
        sampleStatus: sample.sampleStatus,
        trackingNumber: sample.trackingNumber,
        shippingDate: sample.shippingDate,
        receivedDate: sample.receivedDate,
        isOrderGenerated: sample.isOrderGenerated,
        orderCount: sample.orderCount,
        // Video信息
        videoLink: latestVideo?.videoLink || sample.videoLink || '',
        videoStreamCode: latestVideo?.videoStreamCode || sample.videoStreamCode || '',
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

    // ★ 获取店铺产品的_id列表进行匹配（样本的productId存储的是Product._id的字符串表示）
    const products = await Product.find({ shopId: shop._id }).select('_id');
    const productObjectIds = products.map(p => p._id.toString()).filter(Boolean);
    
    if (productObjectIds.length === 0) {
      return res.json({ success: false, message: '该店铺没有有效的产品ID' });
    }

    const query = { _id: { $in: idsArray }, productId: { $in: productObjectIds } };
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
