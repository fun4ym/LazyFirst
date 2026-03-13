const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { Order } = require('../models');

const router = express.Router();

/**
 * @route   GET /api/orders
 * @desc    获取订单列表
 * @access  Private
 */
router.get('/', authenticate, authorize('orders:read'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      influencerId,
      startDate,
      endDate
    } = req.query;
    
    const query = { companyId: req.companyId };
    
    if (status) {
      query.status = status;
    }

    if (influencerId) {
      query.influencerId = influencerId;
    }

    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate);
      if (endDate) query.orderDate.$lte = new Date(endDate);
    }

    const orders = await Order.find(query)
      .populate('influencerId', 'tiktokInfo.displayName basicInfo.realName')
      .populate('productId', 'name sku')
      .populate('storeId', 'name')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ orderDate: -1 });

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: '获取订单列表失败'
    });
  }
});

/**
 * @route   POST /api/orders
 * @desc    创建订单
 * @access  Private
 */
router.post('/', authenticate, authorize('orders:create'), async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      companyId: req.companyId
    };

    const order = await Order.create(orderData);

    res.status(201).json({
      success: true,
      message: '创建订单成功',
      data: { order }
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: '创建订单失败'
    });
  }
});

module.exports = router;
