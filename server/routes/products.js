const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { Product } = require('../models');

const router = express.Router();

/**
 * @route   GET /api/products
 * @desc    获取商品列表
 * @access  Private
 */
router.get('/', authenticate, authorize('products:read'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    
    const query = { companyId: req.companyId };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    const products = await Product.find(query)
      .populate('supplierId', 'name')
      .populate('storeId', 'name')
      .populate('categoryId', 'name')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

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
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: '获取商品列表失败'
    });
  }
});

/**
 * @route   POST /api/products
 * @desc    创建商品
 * @access  Private
 */
router.post('/', authenticate, authorize('products:create'), async (req, res) => {
  try {
    const productData = {
      ...req.body,
      companyId: req.companyId
    };

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      message: '创建商品成功',
      data: { product }
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: '创建商品失败'
    });
  }
});

/**
 * @route   GET /api/products/:id
 * @desc    获取商品详情
 * @access  Private
 */
router.get('/:id', authenticate, authorize('products:read'), async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      companyId: req.companyId
    })
    .populate('supplierId', 'name contact')
    .populate('storeId', 'name country')
    .populate('categoryId', 'name')
    .populate('gradeId', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    res.json({
      success: true,
      data: { product }
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: '获取商品详情失败'
    });
  }
});

module.exports = router;
