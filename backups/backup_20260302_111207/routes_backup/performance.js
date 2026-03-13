const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const Performance = require('../models/Performance');

const router = express.Router();

/**
 * @route   GET /api/performance
 * @desc    获取业绩报表列表
 * @access  Private
 */
router.get('/', authenticate, authorize('performance:read'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      summaryDate,
      userId,
      deptId,
      status
    } = req.query;

    const query = { companyId: req.companyId };

    if (summaryDate) {
      query.summaryDate = summaryDate;
    }

    if (userId) {
      query.userId = userId;
    }

    if (deptId) {
      query.deptId = deptId;
    }

    if (status) {
      query.status = status;
    }

    const reports = await Performance.find(query)
      .populate('userId', 'realName')
      .populate('deptId', 'name')
      .populate('creatorId', 'realName')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Performance.countDocuments(query);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get performance error:', error);
    res.status(500).json({
      success: false,
      message: '获取业绩报表列表失败'
    });
  }
});

/**
 * @route   POST /api/performance/generate
 * @desc    生成业绩报表
 * @access  Private
 */
router.post('/generate', authenticate, authorize('performance:create'), async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().substring(0, 7);

    const existingReport = await Performance.findOne({
      summaryDate: currentMonth,
      companyId: req.companyId
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: '该月业绩报表已生成'
      });
    }

    const Order = require('../models/Order');
    const orders = await Order.find({
      companyId: req.companyId,
      status: 'completed',
      createdAt: {
        $gte: new Date(currentMonth + '-01'),
        $lt: new Date(new Date(currentMonth + '-01').setMonth(new Date(currentMonth + '-01').getMonth() + 1))
      }
    }).populate('userId', 'realName deptId');

    const userReports = {};

    orders.forEach(order => {
      const userId = order.userId?._id;
      if (!userId) return;

      if (!userReports[userId]) {
        userReports[userId] = {
          userId,
          deptId: order.userId?.deptId,
          gmv: 0,
          orderCount: 0,
          totalProfit: 0
        };
      }

      userReports[userId].gmv += order.totalAmount || 0;
      userReports[userId].orderCount += 1;
      userReports[userId].totalProfit += (order.totalAmount || 0) * 0.3; // 假设利润率为30%
    });

    const reports = await Promise.all(
      Object.values(userReports).map(async (report) => {
        const commissionRule = await require('../models/CommissionRule').findOne({
          deptId: report.deptId,
          'ranges.0': { $lte: report.gmv },
          status: 'active'
        });

        let commissionRate = 0;
        let commissionType = 'fixed';

        if (commissionRule) {
          for (const range of commissionRule.ranges) {
            if (report.gmv >= range.rangeStart && (!range.rangeEnd || report.gmv <= range.rangeEnd)) {
              commissionRate = range.commissionRate;
              commissionType = range.commissionType;
              break;
            }
          }
        }

        const commissionAmount = report.gmv * commissionRate;

        return await Performance.create({
          ...report,
          summaryDate: currentMonth,
          commissionRate,
          commissionType,
          commissionAmount,
          status: 'pending',
          companyId: req.companyId,
          creatorId: req.user._id
        });
      })
    );

    res.json({
      success: true,
      message: '业绩报表生成成功',
      data: { reports }
    });
  } catch (error) {
    console.error('Generate performance error:', error);
    res.status(500).json({
      success: false,
      message: '生成业绩报表失败'
    });
  }
});

/**
 * @route   PUT /api/performance/:id/audit
 * @desc    审核业绩报表
 * @access  Private
 */
router.put('/:id/audit', authenticate, authorize('performance:audit'), async (req, res) => {
  try {
    const report = await Performance.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      { status: 'approved' },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: '业绩报表不存在'
      });
    }

    res.json({
      success: true,
      message: '审核成功',
      data: { report }
    });
  } catch (error) {
    console.error('Audit performance error:', error);
    res.status(500).json({
      success: false,
      message: '审核失败'
    });
  }
});

/**
 * @route   PUT /api/performance/audit
 * @desc    批量审核业绩报表
 * @access  Private
 */
router.put('/audit', authenticate, authorize('performance:audit'), [
  body('ids').isArray().withMessage('ids必须是数组')
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

    const { ids } = req.body;

    await Performance.updateMany(
      { _id: { $in: ids }, companyId: req.companyId },
      { status: 'approved' }
    );

    res.json({
      success: true,
      message: '批量审核成功'
    });
  } catch (error) {
    console.error('Batch audit error:', error);
    res.status(500).json({
      success: false,
      message: '批量审核失败'
    });
  }
});

module.exports = router;
