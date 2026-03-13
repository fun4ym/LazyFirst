const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { Influencer } = require('../models');

const router = express.Router();

/**
 * @route   GET /api/influencers
 * @desc    获取达人列表
 * @access  Private
 */
router.get('/', authenticate, authorize('influencers:read'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      poolType, 
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const query = { companyId: req.companyId };
    
    // 搜索
    if (search) {
      query.$or = [
        { 'tiktokInfo.displayName': { $regex: search, $options: 'i' } },
        { 'tiktokInfo.username': { $regex: search, $options: 'i' } },
        { 'basicInfo.realName': { $regex: search, $options: 'i' } }
      ];
    }

    // 池类型过滤
    if (poolType) {
      query['crmInfo.poolType'] = poolType;
    }

    // 状态过滤
    if (status) {
      query.status = status;
    }

    // 构建排序
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const influencers = await Influencer.find(query)
      .populate('crmInfo.assignedTo', 'realName phone avatar')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort(sort);

    const total = await Influencer.countDocuments(query);

    res.json({
      success: true,
      data: {
        influencers,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get influencers error:', error);
    res.status(500).json({
      success: false,
      message: '获取达人列表失败'
    });
  }
});

/**
 * @route   POST /api/influencers
 * @desc    创建达人
 * @access  Private
 */
router.post('/', authenticate, authorize('influencers:create'), [
  body('tiktokInfo.displayName').trim().notEmpty().withMessage('达人名称不能为空'),
  body('tiktokInfo.tiktokId').notEmpty().withMessage('TikTok ID不能为空'),
  body('basicInfo.phone').isMobilePhone().withMessage('手机号格式不正确')
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

    const influencerData = {
      ...req.body,
      companyId: req.companyId,
      crmInfo: {
        poolType: 'public',
        ...req.body.crmInfo
      }
    };

    const influencer = await Influencer.create(influencerData);

    res.status(201).json({
      success: true,
      message: '创建达人成功',
      data: { influencer }
    });

  } catch (error) {
    console.error('Create influencer error:', error);
    res.status(500).json({
      success: false,
      message: '创建达人失败'
    });
  }
});

/**
 * @route   GET /api/influencers/:id
 * @desc    获取达人详情
 * @access  Private
 */
router.get('/:id', authenticate, authorize('influencers:read'), async (req, res) => {
  try {
    const influencer = await Influencer.findOne({
      _id: req.params.id,
      companyId: req.companyId
    })
    .populate('crmInfo.assignedTo', 'realName phone avatar');

    if (!influencer) {
      return res.status(404).json({
        success: false,
        message: '达人不存在'
      });
    }

    res.json({
      success: true,
      data: { influencer }
    });

  } catch (error) {
    console.error('Get influencer error:', error);
    res.status(500).json({
      success: false,
      message: '获取达人详情失败'
    });
  }
});

/**
 * @route   PUT /api/influencers/:id
 * @desc    更新达人信息
 * @access  Private
 */
router.put('/:id', authenticate, authorize('influencers:update'), async (req, res) => {
  try {
    const influencer = await Influencer.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!influencer) {
      return res.status(404).json({
        success: false,
        message: '达人不存在'
      });
    }

    res.json({
      success: true,
      message: '更新达人成功',
      data: { influencer }
    });

  } catch (error) {
    console.error('Update influencer error:', error);
    res.status(500).json({
      success: false,
      message: '更新达人失败'
    });
  }
});

/**
 * @route   DELETE /api/influencers/:id
 * @desc    删除达人
 * @access  Private
 */
router.delete('/:id', authenticate, authorize('influencers:delete'), async (req, res) => {
  try {
    const influencer = await Influencer.findOneAndDelete({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!influencer) {
      return res.status(404).json({
        success: false,
        message: '达人不存在'
      });
    }

    res.json({
      success: true,
      message: '删除达人成功'
    });

  } catch (error) {
    console.error('Delete influencer error:', error);
    res.status(500).json({
      success: false,
      message: '删除达人失败'
    });
  }
});

/**
 * @route   POST /api/influencers/:id/assign
 * @desc    分配达人给BD
 * @access  Private
 */
router.post('/:id/assign', authenticate, authorize('influencers:assign'), [
  body('assignedTo').notEmpty().withMessage('必须指定维护人')
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

    const { assignedTo } = req.body;

    const influencer = await Influencer.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      {
        'crmInfo.assignedTo': assignedTo,
        'crmInfo.poolType': 'private',
        'crmInfo.assignedAt': new Date(),
        'crmInfo.lastActivityAt': new Date()
      },
      { new: true }
    ).populate('crmInfo.assignedTo', 'realName');

    if (!influencer) {
      return res.status(404).json({
        success: false,
        message: '达人不存在'
      });
    }

    res.json({
      success: true,
      message: '分配达人成功',
      data: { influencer }
    });

  } catch (error) {
    console.error('Assign influencer error:', error);
    res.status(500).json({
      success: false,
      message: '分配达人失败'
    });
  }
});

/**
 * @route   POST /api/influencers/:id/reclaim
 * @desc    回收达人到公海
 * @access  Private
 */
router.post('/:id/reclaim', authenticate, authorize('influencers:reclaim'), async (req, res) => {
  try {
    const influencer = await Influencer.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      {
        'crmInfo.assignedTo': null,
        'crmInfo.poolType': 'public',
        'crmInfo.assignedAt': null
      },
      { new: true }
    );

    if (!influencer) {
      return res.status(404).json({
        success: false,
        message: '达人不存在'
      });
    }

    res.json({
      success: true,
      message: '回收达人成功',
      data: { influencer }
    });

  } catch (error) {
    console.error('Reclaim influencer error:', error);
    res.status(500).json({
      success: false,
      message: '回收达人失败'
    });
  }
});

module.exports = router;
