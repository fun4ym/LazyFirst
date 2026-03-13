const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { Commission, Order, Influencer, SampleRequest } = require('../models');

const router = express.Router();

/**
 * @route   GET /api/commissions
 * @desc    获取分润记录列表
 * @access  Private
 */
router.get('/', authenticate, authorize('commissions:read'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      bdId,
      startDate,
      endDate
    } = req.query;
    
    const query = { companyId: req.companyId };
    
    if (status) {
      query.status = status;
    }

    if (bdId) {
      query.bdId = bdId;
    }

    if (startDate || endDate) {
      query.calculatedDate = {};
      if (startDate) query.calculatedDate.$gte = new Date(startDate);
      if (endDate) query.calculatedDate.$lte = new Date(endDate);
    }

    const commissions = await Commission.find(query)
      .populate('bdId', 'realName phone')
      .populate('influencerId', 'tiktokInfo.displayName')
      .populate('orderId', 'orderNo totalAmount')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ calculatedDate: -1 });

    const total = await Commission.countDocuments(query);

    res.json({
      success: true,
      data: {
        commissions,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get commissions error:', error);
    res.status(500).json({
      success: false,
      message: '获取分润记录失败'
    });
  }
});

/**
 * @route   POST /api/commissions/calculate
 * @desc    计算分润
 * @access  Private
 */
router.post('/calculate', authenticate, authorize('commissions:calculate'), async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: '订单ID不能为空'
      });
    }

    // 查找订单
    const order = await Order.findOne({
      _id: orderId,
      companyId: req.companyId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    // 查找达人
    const influencer = await Influencer.findById(order.influencerId);
    if (!influencer) {
      return res.status(404).json({
        success: false,
        message: '达人不存在'
      });
    }

    // 获取BD（从达人归属信息获取）
    const bdId = influencer.crmInfo.assignedTo;
    if (!bdId) {
      return res.status(400).json({
        success: false,
        message: '该达人未分配BD，无法计算分润'
      });
    }

    // 查找样品申请记录
    const sampleRequest = await SampleRequest.findOne({
      influencerId: order.influencerId,
      productId: order.productId,
      companyId: req.companyId,
      status: 'approved'
    }).sort({ createdAt: -1 });

    // 计算分润
    const commissionAmount = order.totalAmount * order.commissionRate;

    // 创建分润记录
    const commission = await Commission.create({
      companyId: req.companyId,
      influencerId: order.influencerId,
      bdId: bdId,
      orderId: order._id,
      sampleRequestId: sampleRequest?._id,
      orderAmount: order.totalAmount,
      commissionAmount: commissionAmount,
      commissionRate: order.commissionRate,
      calculatedDate: new Date(),
      status: 'pending'
    });

    res.json({
      success: true,
      message: '计算分润成功',
      data: { commission }
    });

  } catch (error) {
    console.error('Calculate commission error:', error);
    res.status(500).json({
      success: false,
      message: '计算分润失败'
    });
  }
});

module.exports = router;
