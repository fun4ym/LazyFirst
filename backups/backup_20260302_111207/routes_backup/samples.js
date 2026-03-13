const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const SampleRequest = require('../models/SampleRequest');
const Product = require('../models/Product');
const Influencer = require('../models/Influencer');

const router = express.Router();

/**
 * @route   GET /api/samples
 * @desc    获取样品申请列表
 * @access  Private
 */
router.get('/', authenticate, authorize('samples:read'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      influencerId,
      productId,
      registrarId,
      synced  // 筛选是否已同步TikTok
    } = req.query;

    const query = { companyId: req.companyId };

    // 状态筛选
    if (status) {
      query.status = status;
    }

    // 达人筛选
    if (influencerId) {
      query.influencerId = influencerId;
    }

    // 产品筛选
    if (productId) {
      query.productId = productId;
    }

    // 登记人筛选
    if (registrarId) {
      query.registrarId = registrarId;
    }

    // TikTok同步状态筛选
    if (synced !== undefined) {
      query['tiktokSync.isSynced'] = synced === 'true';
    }

    const samples = await SampleRequest.find(query)
      .populate('productId', 'name sku images')
      .populate('influencerId', 'tiktokInfo.displayName tiktokInfo.tiktokId basicInfo.phone')
      .populate('registrarId', 'realName phone')
      .populate('applicantId', 'realName')
      .populate('activityId', 'name')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await SampleRequest.countDocuments(query);

    res.json({
      success: true,
      data: {
        samples,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get samples error:', error);
    res.status(500).json({
      success: false,
      message: '获取样品申请列表失败'
    });
  }
});

/**
 * @route   POST /api/samples
 * @desc    创建样品申请（BD填写）
 * @access  Private
 */
router.post('/', authenticate, authorize('samples:create'), [
  body('productId').notEmpty().withMessage('产品ID不能为空'),
  body('influencerId').notEmpty().withMessage('达人ID不能为空')
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

    const { productId, influencerId, activityId, applicantId } = req.body;

    // 验证产品是否存在
    const product = await Product.findOne({
      _id: productId,
      companyId: req.companyId
    });
    if (!product) {
      return res.status(400).json({
        success: false,
        message: '产品不存在'
      });
    }

    // 验证达人是否存在
    const influencer = await Influencer.findOne({
      _id: influencerId,
      companyId: req.companyId
    });
    if (!influencer) {
      return res.status(400).json({
        success: false,
        message: '达人不存在'
      });
    }

    // 检查是否已经为该达人申请过此产品的样品
    const existingSample = await SampleRequest.findOne({
      productId,
      influencerId,
      companyId: req.companyId,
      status: { $in: ['pending', 'approved', 'shipped', 'received'] }
    });

    if (existingSample) {
      return res.status(400).json({
        success: false,
        message: '该达人已申请过此产品的样品'
      });
    }

    const sampleData = {
      ...req.body,
      companyId: req.companyId,
      registrarId: req.user._id,
      requestDate: new Date(),
      tiktokSync: {
        isSynced: false
      }
    };

    const sample = await SampleRequest.create(sampleData);

    res.status(201).json({
      success: true,
      message: '创建样品申请成功',
      data: { sample }
    });

  } catch (error) {
    console.error('Create sample error:', error);
    res.status(500).json({
      success: false,
      message: '创建样品申请失败'
    });
  }
});

/**
 * @route   GET /api/samples/:id
 * @desc    获取样品申请详情
 * @access  Private
 */
router.get('/:id', authenticate, authorize('samples:read'), async (req, res) => {
  try {
    const sample = await SampleRequest.findOne({
      _id: req.params.id,
      companyId: req.companyId
    })
    .populate('productId', 'name sku images price commissionRate')
    .populate('influencerId', 'tiktokInfo displayName tiktokId username basicInfo')
    .populate('registrarId', 'realName phone email')
    .populate('applicantId', 'realName')
    .populate('activityId', 'name partnerCenter')
    .populate('feedback.feedbackBy', 'realName');

    if (!sample) {
      return res.status(404).json({
        success: false,
        message: '样品申请不存在'
      });
    }

    res.json({
      success: true,
      data: { sample }
    });

  } catch (error) {
    console.error('Get sample error:', error);
    res.status(500).json({
      success: false,
      message: '获取样品申请详情失败'
    });
  }
});

/**
 * @route   PUT /api/samples/:id
 * @desc    更新样品申请
 * @access  Private
 */
router.put('/:id', authenticate, authorize('samples:update'), async (req, res) => {
  try {
    const sample = await SampleRequest.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      req.body,
      { new: true, runValidators: true }
    ).populate('productId', 'name')
    .populate('influencerId', 'tiktokInfo.displayName');

    if (!sample) {
      return res.status(404).json({
        success: false,
        message: '样品申请不存在'
      });
    }

    res.json({
      success: true,
      message: '更新样品申请成功',
      data: { sample }
    });

  } catch (error) {
    console.error('Update sample error:', error);
    res.status(500).json({
      success: false,
      message: '更新样品申请失败'
    });
  }
});

/**
 * @route   DELETE /api/samples/:id
 * @desc    删除样品申请
 * @access  Private
 */
router.delete('/:id', authenticate, authorize('samples:delete'), async (req, res) => {
  try {
    // 只能删除未同步的申请
    const sample = await SampleRequest.findOne({
      _id: req.params.id,
      companyId: req.companyId,
      'tiktokSync.isSynced': false
    });

    if (!sample) {
      return res.status(404).json({
        success: false,
        message: '样品申请不存在或已同步，无法删除'
      });
    }

    await sample.deleteOne();

    res.json({
      success: true,
      message: '删除样品申请成功'
    });

  } catch (error) {
    console.error('Delete sample error:', error);
    res.status(500).json({
      success: false,
      message: '删除样品申请失败'
    });
  }
});

/**
 * @route   PUT /api/samples/:id/feedback
 * @desc    反馈样品申请
 * @access  Private
 */
router.put('/:id/feedback', authenticate, authorize('samples:feedback'), [
  body('result').isIn(['approved', 'rejected']).withMessage('反馈结果不正确'),
  body('remark').optional()
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

    const { result, remark } = req.body;

    const sample = await SampleRequest.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      {
        'feedback.result': result,
        'feedback.feedbackBy': req.user._id,
        'feedback.feedbackAt': new Date(),
        'feedback.remark': remark,
        status: result === 'approved' ? 'approved' : 'rejected'
      },
      { new: true }
    ).populate('feedback.feedbackBy', 'realName');

    if (!sample) {
      return res.status(404).json({
        success: false,
        message: '样品申请不存在'
      });
    }

    res.json({
      success: true,
      message: '反馈样品申请成功',
      data: { sample }
    });

  } catch (error) {
    console.error('Feedback sample error:', error);
    res.status(500).json({
      success: false,
      message: '反馈样品申请失败'
    });
  }
});

/**
 * @route   PUT /api/samples/:id/sync-tiktok
 * @desc    更新TikTok同步状态（管理员使用）
 * @access  Private
 */
router.put('/:id/sync-tiktok', authenticate, authorize('samples:sync'), [
  body('campaignId').notEmpty().withMessage('Campaign ID不能为空'),
  body('tiktokSampleId').notEmpty().withMessage('TikTok Sample ID不能为空')
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

    const { campaignId, tiktokSampleId } = req.body;

    const sample = await SampleRequest.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      {
        'tiktokSync.isSynced': true,
        'tiktokSync.syncDate': new Date(),
        'tiktokSync.campaignId': campaignId,
        'tiktokSync.tiktokSampleId': tiktokSampleId
      },
      { new: true }
    );

    if (!sample) {
      return res.status(404).json({
        success: false,
        message: '样品申请不存在'
      });
    }

    res.json({
      success: true,
      message: '更新TikTok同步状态成功',
      data: { sample }
    });

  } catch (error) {
    console.error('Sync tiktok error:', error);
    res.status(500).json({
      success: false,
      message: '更新TikTok同步状态失败'
    });
  }
});

/**
 * @route   GET /api/samples/statistics
 * @desc    获取样品申请统计
 * @access  Private
 */
router.get('/statistics/summary', authenticate, authorize('samples:read'), async (req, res) => {
  try {
    const stats = await SampleRequest.aggregate([
      { $match: { companyId: req.companyId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          shipped: { $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] } },
          received: { $sum: { $cond: [{ $eq: ['$status', 'received'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          synced: { $sum: { $cond: ['$tiktokSync.isSynced', 1, 0] } }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      pending: 0,
      approved: 0,
      shipped: 0,
      received: 0,
      rejected: 0,
      synced: 0
    };

    res.json({
      success: true,
      data: { statistics: result }
    });

  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败'
    });
  }
});

module.exports = router;
