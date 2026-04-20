const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const BaseData = require('../models/BaseData');
const PageVisit = require('../models/PageVisit');
const SampleManagement = require('../models/SampleManagement');
const Video = require('../models/Video');

const router = express.Router();

/**
 * @route   GET /api/public/products
 * @desc    获取启用商品列表（公开接口，无需登录）
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, keyword, categoryId, shopId, gradeId, grade, ref } = req.query;

    // 记录推广追踪
    const refUser = ref || req.headers['x-ref-user'] || '';
    if (refUser) {
      PageVisit.create({
        userId: refUser,
        page: 'public-products',
        action: 'view',
        ip: req.ip || req.headers['x-forwarded-for'] || '',
        userAgent: req.headers['user-agent'] || ''
      }).catch(err => console.error('PageVisit log error:', err.message));
    }

    const query = { status: 'active' };

    // 只展示有活动链接的商品
    query['activityConfigs.activityLink'] = { $ne: '' };

    // 关键词搜索（商品名 + TikTok商品ID）
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { tiktokProductId: { $regex: keyword, $options: 'i' } }
      ];
    }

    // 产品类目筛选（按categoryId）
    if (categoryId) {
      query.categoryId = categoryId;
    }

    // 店铺筛选
    if (shopId) {
      query.shopId = shopId;
    }

    // 商品等级筛选（支持gradeId和grade code两种方式）
    if (gradeId) {
      query.gradeId = gradeId;
    } else if (grade) {
      // 通过grade code查找BaseData的_id，再用gradeId筛选
      const gradeData = await BaseData.findOne({ type: 'grade', code: grade, status: 'active' }).select('_id').lean();
      if (gradeData) {
        query.gradeId = gradeData._id;
      } else {
        // fallback到productGrade
        query.productGrade = grade;
      }
    }

    const products = await Product.find(query)
      .populate('shopId', 'shopName')
      .select('_id name tiktokProductId productGrade categoryId gradeId images price sellingPrice currency priceRangeMin priceRangeMax squareCommissionRate commissionRate activityConfigs shopId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Public products API error:', error);
    res.status(500).json({
      success: false,
      message: '获取商品列表失败'
    });
  }
});

/**
 * @route   GET /api/public/products/stats
 * @desc    获取商品统计数据（公开接口，无需登录）
 * @access  Public
 */
router.get('/stats', async (req, res) => {
  try {
    const matchStage = {
      status: 'active',
      'activityConfigs.activityLink': { $ne: '' }
    };

    const [totalResult, commissionResult, priceResult] = await Promise.all([
      Product.countDocuments(matchStage),
      Product.aggregate([
        { $match: matchStage },
        { $unwind: '$activityConfigs' },
        { $match: { 'activityConfigs.activityLink': { $ne: '' } } },
        {
          $group: {
            _id: null,
            maxInfluencerRate: { $max: '$activityConfigs.promotionInfluencerRate' },
            maxSquareRate: { $max: '$squareCommissionRate' },
            products: {
              $push: {
                influencerRate: '$activityConfigs.promotionInfluencerRate',
                squareRate: '$squareCommissionRate'
              }
            }
          }
        }
      ]),
      Product.findOne(matchStage).sort({ sellingPrice: -1 }).select('sellingPrice').lean()
    ]);

    let maxCommissionRate = 0;
    let maxCommissionDiff = 0;

    if (commissionResult.length > 0) {
      const data = commissionResult[0];
      maxCommissionRate = data.maxInfluencerRate || 0;
      // 计算最大佣金差
      data.products.forEach(p => {
        const diff = (p.influencerRate || 0) - (p.squareRate || 0);
        if (diff > maxCommissionDiff) maxCommissionDiff = diff;
      });
    }

    res.json({
      success: true,
      data: {
        totalProducts: totalResult,
        maxCommissionRate: Math.round(maxCommissionRate * 1000) / 10, // 转百分比保留1位
        maxCommissionDiff: Math.round(maxCommissionDiff * 1000) / 10,
        maxSellingPrice: priceResult ? priceResult.sellingPrice || 0 : 0
      }
    });
  } catch (error) {
    console.error('Public products stats error:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败'
    });
  }
});

/**
 * @route   GET /api/public/products/statistics
 * @desc    获取商品统计数据（公开接口，无需登录）
 * @access  Public
 * @notes   每行统计商品（product）有多少申样、通过率多少、视频多少个
 */
router.get('/statistics', async (req, res) => {
  try {
    const { s: identificationCode, page = 1, limit = 20, keyword, categoryId } = req.query;

    if (!identificationCode) {
      return res.status(400).json({ success: false, message: '缺少识别码参数' });
    }

    // 1. 通过识别码查找店铺
    const shop = await Shop.findOne({ identificationCode });
    if (!shop) {
      return res.status(404).json({ success: false, message: '店铺不存在或识别码无效' });
    }

    // 2. 获取店铺的所有商品（基础查询）
    const productQuery = { shopId: shop._id, status: 'active' };
    if (keyword) {
      productQuery.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { tiktokProductId: { $regex: keyword, $options: 'i' } }
      ];
    }
    if (categoryId) {
      productQuery.categoryId = categoryId;
    }

    // 分页参数
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const products = await Product.find(productQuery)
      .select('_id name tiktokProductId images')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Product.countDocuments(productQuery);

    if (products.length === 0) {
      return res.json({
        success: true,
        data: {
          products: [],
          pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 }
        }
      });
    }

    // 3. 对每个商品进行统计计算
    const productIds = products.map(p => p._id.toString());
    const productTikTokIds = products.map(p => p.tiktokProductId).filter(Boolean);

    // 申样统计（SampleManagement）
    const sampleAggregation = await SampleManagement.aggregate([
      {
        $match: {
          companyId: shop.companyId,
          $or: [
            { productId: { $in: productIds } },
            { productId: { $in: productTikTokIds } }
          ]
        }
      },
      {
        $group: {
          _id: '$productId',
          sampleCount: { $sum: 1 },
          sentCount: {
            $sum: { $cond: [{ $eq: ['$sampleStatus', 'sent'] }, 1, 0] }
          },
          orderGeneratedCount: {
            $sum: { $cond: [{ $eq: ['$isOrderGenerated', true] }, 1, 0] }
          }
        }
      }
    ]);

    // 视频统计（Video）
    const videoAggregation = await Video.aggregate([
      {
        $match: {
          companyId: shop.companyId,
          $or: [
            { productId: { $in: products.map(p => p._id) } },
            { tiktokProductId: { $in: productTikTokIds } }
          ]
        }
      },
      {
        $group: {
          _id: { $ifNull: ['$productId', '$tiktokProductId'] },
          videoCount: { $sum: 1 },
          adPromotionCount: {
            $sum: { $cond: [{ $eq: ['$isAdPromotion', true] }, 1, 0] }
          }
        }
      }
    ]);

    // 转换为映射方便查找
    const sampleMap = {};
    sampleAggregation.forEach(item => {
      sampleMap[item._id] = item;
    });

    const videoMap = {};
    videoAggregation.forEach(item => {
      videoMap[item._id] = item;
    });

    // 4. 组装响应数据
    const productsData = products.map(product => {
      const productIdStr = product._id.toString();
      const tiktokId = product.tiktokProductId;
      
      // 查找申样统计（优先按TikTok ID，其次按ObjectId）
      const sampleStats = sampleMap[tiktokId] || sampleMap[productIdStr] || { sampleCount: 0, sentCount: 0, orderGeneratedCount: 0 };
      const videoStats = videoMap[tiktokId] || videoMap[productIdStr] || { videoCount: 0, adPromotionCount: 0 };
      
      // 计算通过率
      const passRate = sampleStats.sampleCount > 0 
        ? ((sampleStats.sentCount / sampleStats.sampleCount) * 100).toFixed(1) + '%'
        : '0%';

      return {
        _id: product._id,
        name: product.name,
        tiktokProductId: product.tiktokProductId,
        image: product.images?.[0] || '',
        stats: {
          sampleCount: sampleStats.sampleCount || 0,
          sentCount: sampleStats.sentCount || 0,
          passRate,
          videoCount: videoStats.videoCount || 0,
          adPromotionCount: videoStats.adPromotionCount || 0,
          orderGeneratedCount: sampleStats.orderGeneratedCount || 0
        }
      };
    });

    res.json({
      success: true,
      data: {
        products: productsData,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Public products statistics API error:', error);
    res.status(500).json({
      success: false,
      message: '获取商品统计数据失败'
    });
  }
});

/**
 * @route   GET /api/public/products/filters
 * @desc    获取筛选项（类目列表、店铺列表）
 * @access  Public
 */
router.get('/filters', async (req, res) => {
  try {
    // 从BaseData获取产品类目（type='category'）
    const categories = await BaseData.find({ type: 'category', status: 'active' })
      .select('_id name englishName')
      .sort({ name: 1 })
      .lean();

    // 从BaseData获取商品等级（type='grade'）
    const grades = await BaseData.find({ type: 'grade', status: 'active' })
      .select('_id name code englishName thaiName')
      .sort({ createdAt: 1 })
      .lean();

    // 获取所有active的店铺
    const shops = await Shop.find({ status: 'active' })
      .select('_id shopName')
      .sort({ shopName: 1 })
      .lean();

    // 获取distinct productGrade值
    const productGradesRaw = await Product.distinct('productGrade', { 
      status: 'active',
      'activityConfigs.activityLink': { $ne: '' },
      productGrade: { $ne: null, $ne: '' }
    });
    
    // 按照指定顺序排序：ordinary, hot, main, new
    const gradeOrder = ['ordinary', 'hot', 'main', 'new'];
    const productGrades = productGradesRaw
      .filter(grade => gradeOrder.includes(grade))
      .sort((a, b) => gradeOrder.indexOf(a) - gradeOrder.indexOf(b));

    res.json({
      success: true,
      data: {
        categories,
        grades,
        shops,
        productGrades
      }
    });
  } catch (error) {
    console.error('Public products filters error:', error);
    res.status(500).json({
      success: false,
      message: '获取筛选项失败'
    });
  }
});

/**
 * @route   POST /api/public/products/track
 * @desc    记录用户点击行为（推广追踪）
 * @access  Public
 */
router.post('/track', async (req, res) => {
  try {
    const { ref, action, productId } = req.body;
    const refUser = ref || req.headers['x-ref-user'] || '';

    if (refUser && action) {
      await PageVisit.create({
        userId: refUser,
        page: 'public-products',
        action,
        productId: productId || '',
        ip: req.ip || req.headers['x-forwarded-for'] || '',
        userAgent: req.headers['user-agent'] || ''
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Track error:', error);
    res.json({ success: true }); // 追踪失败不影响用户体验
  }
});

module.exports = router;
