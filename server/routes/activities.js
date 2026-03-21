const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const Activity = require('../models/Activity');
const ActivityHistory = require('../models/ActivityHistory');
const { Product } = require('../models');

const router = express.Router();

// 记录变更历史的辅助函数
const recordHistory = async (activityId, action, changes, previousData, newData, userId, userName, companyId) => {
  try {
    await ActivityHistory.create({
      activityId,
      action,
      changes,
      previousData,
      newData,
      changedBy: userId,
      changedByName: userName,
      companyId
    });
  } catch (error) {
    console.error('记录变更历史失败:', error);
  }
};

// 获取变更的字段
const getChangedFields = (previous, current) => {
  const changes = {};
  const previousData = {};
  const newData = {};

  for (const key in current) {
    if (key === '_id' || key === 'createdAt' || key === 'updatedAt' || key === '__v') continue;

    if (previous && previous[key] !== current[key]) {
      changes[key] = true;
      previousData[key] = previous[key];
      newData[key] = current[key];
    }
  }

  return { changes, previousData, newData };
};

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

    const activityData = {
      ...req.body,
      companyId: req.companyId,
      creatorId: req.user._id
    };

    const activity = await Activity.create(activityData);

    // 记录创建历史
    await recordHistory(
      activity._id,
      'create',
      { name: true, type: true, startDate: true, endDate: true, status: true },
      {},
      activityData,
      req.user._id,
      req.user.realName || req.user.username,
      req.companyId
    );

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
    const existingActivity = await Activity.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!existingActivity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    // 获取变更的字段
    const { changes, previousData, newData } = getChangedFields(existingActivity.toObject(), req.body);

    const activity = await Activity.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      req.body,
      { new: true }
    );

    // 检查状态是否变更
    let action = 'update';
    if (req.body.status && req.body.status !== existingActivity.status) {
      action = 'status_change';
    }

    // 如果有变更，记录历史
    if (Object.keys(changes).length > 0) {
      await recordHistory(
        activity._id,
        action,
        changes,
        previousData,
        newData,
        req.user._id,
        req.user.realName || req.user.username,
        req.companyId
      );
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

    // 记录删除历史
    await recordHistory(
      activity._id,
      'delete',
      {},
      activity.toObject(),
      {},
      req.user._id,
      req.user.realName || req.user.username,
      req.companyId
    );

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

/**
 * @route   GET /api/activities/:id/history
 * @desc    获取活动变更历史
 * @access  Private
 */
router.get('/:id/history', authenticate, async (req, res) => {
  try {
    const activity = await Activity.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    const histories = await ActivityHistory.find({ activityId: req.params.id })
      .populate('changedBy', 'realName username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { histories }
    });
  } catch (error) {
    console.error('Get activity history error:', error);
    res.status(500).json({
      success: false,
      message: '获取活动历史失败'
    });
  }
});

/**
 * @route   GET /api/activities/:id/products
 * @desc    获取活动关联的商品列表和数量
 * @access  Private
 */
router.get('/:id/products', authenticate, authorize('activities:read'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const activityId = req.params.id;

    // 检查活动是否存在
    const activity = await Activity.findOne({
      _id: activityId,
      companyId: req.companyId
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    // 查询参与该活动的商品
    const query = {
      companyId: req.companyId,
      'activityCommissions.activityId': activityId
    };

    const products = await Product.find(query)
      .populate('shopId', 'name')
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
    console.error('Get activity products error:', error);
    res.status(500).json({
      success: false,
      message: '获取活动商品列表失败'
    });
  }
});

/**
 * @route   GET /api/activities/product-counts
 * @desc    批量获取各活动的商品数量
 * @access  Private
 */
router.get('/product-counts', authenticate, authorize('activities:read'), async (req, res) => {
  try {
    const { ids } = req.query;
    const activityIds = ids ? ids.split(',') : [];

    if (activityIds.length === 0) {
      return res.json({
        success: true,
        data: {}
      });
    }

    // 统计每个活动关联的商品数量
    const counts = {};
    for (const activityId of activityIds) {
      const count = await Product.countDocuments({
        companyId: req.companyId,
        'activityCommissions.activityId': activityId
      });
      counts[activityId] = count;
    }

    res.json({
      success: true,
      data: counts
    });
  } catch (error) {
    console.error('Get activity product counts error:', error);
    res.status(500).json({
      success: false,
      message: '获取活动商品数量失败'
    });
  }
});

module.exports = router;
