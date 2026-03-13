const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const Activity = require('../models/Activity');

const router = express.Router();

/**
 * @route   GET /api/activities
 * @desc    获取活动列表
 * @access  Private
 */
router.get('/', authenticate, authorize('activities:read'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      name,
      type,
      status
    } = req.query;

    const query = { companyId: req.companyId };

    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    const activities = await Activity.find(query)
      .populate('creatorId', 'realName')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Activity.countDocuments(query);

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      message: '获取活动列表失败'
    });
  }
});

/**
 * @route   POST /api/activities
 * @desc    创建活动
 * @access  Private
 */
router.post('/', authenticate, authorize('activities:create'), [
  body('name').notEmpty().withMessage('活动名称不能为空'),
  body('type').notEmpty().withMessage('活动类型不能为空'),
  body('startDate').notEmpty().withMessage('开始时间不能为空'),
  body('endDate').notEmpty().withMessage('结束时间不能为空')
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

    const activity = await Activity.create({
      ...req.body,
      companyId: req.companyId,
      creatorId: req.user._id
    });

    res.status(201).json({
      success: true,
      message: '创建活动成功',
      data: { activity }
    });
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({
      success: false,
      message: '创建活动失败'
    });
  }
});

/**
 * @route   PUT /api/activities/:id
 * @desc    更新活动
 * @access  Private
 */
router.put('/:id', authenticate, authorize('activities:update'), async (req, res) => {
  try {
    const activity = await Activity.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      req.body,
      { new: true }
    );

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    res.json({
      success: true,
      message: '更新活动成功',
      data: { activity }
    });
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({
      success: false,
      message: '更新活动失败'
    });
  }
});

/**
 * @route   DELETE /api/activities/:id
 * @desc    删除活动
 * @access  Private
 */
router.delete('/:id', authenticate, authorize('activities:delete'), async (req, res) => {
  try {
    const activity = await Activity.findOneAndDelete({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    res.json({
      success: true,
      message: '删除活动成功'
    });
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({
      success: false,
      message: '删除活动失败'
    });
  }
});

module.exports = router;
