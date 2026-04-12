const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const BaseData = require('../models/BaseData');
const PageVisit = require('../models/PageVisit');

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

    res.json({
      success: true,
      data: {
        categories,
        grades,
        shops
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
