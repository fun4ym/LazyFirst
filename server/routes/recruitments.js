const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const Recruitment = require('../models/Recruitment');
const Product = require('../models/Product');
const User = require('../models/User');

const router = express.Router();

/**
 * @route   GET /api/recruitments
 * @desc    获取招募列表
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { keyword, enabled } = req.query;
    
    const query = { companyId: req.companyId };
    
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }
    
    if (enabled !== undefined) {
      query.enabled = enabled === 'true';
    }

    const recruitments = await Recruitment.find(query)
      .populate('products', 'name sku tiktokProductId images price commissionRate squareCommissionRate promotionInfluencerRate activityConfigs')
      .populate('creatorId', 'username nickname')
      .populate('callableUsers', 'username nickname')
      .populate('updatedBy', 'username nickname')
      .sort({ createdAt: -1 });

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json({
      success: true,
      data: recruitments
    });
  } catch (error) {
    console.error('Get recruitments error:', error);
    res.status(500).json({
      success: false,
      message: '获取招募列表失败'
    });
  }
});

/**
 * @route   GET /api/recruitments/:id
 * @desc    获取单个招募详情
 * @access  Private
 */
router.get('/products/list', authenticate, authorize('recruitments:read'), async (req, res) => {
  try {
    console.log('[Recruitments] products/list - companyId:', req.companyId, 'userId:', req.userId);
    const products = await Product.find({ companyId: req.companyId, status: 'active' })
      .select('_id name sku tiktokProductId images price activityConfigs')
      .sort({ createdAt: -1 })
      .limit(500);
    console.log('[Recruitments] products found:', products.length);

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Get products list error:', error);
    res.status(500).json({
      success: false,
      message: '获取产品列表失败'
    });
  }
});

router.get('/users/list', authenticate, authorize('recruitments:read'), async (req, res) => {
  try {
    console.log('[Recruitments] users/list - companyId:', req.companyId, 'userId:', req.userId);
    const users = await User.find({ companyId: req.companyId, status: 'active' })
      .select('_id username nickname')
      .sort({ createdAt: -1 });
    console.log('[Recruitments] users found:', users.length);

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get users list error:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
});

router.get('/:id', authenticate, authorize('recruitments:read'), async (req, res) => {
  try {
    const recruitment = await Recruitment.findOne({
      _id: req.params.id,
      companyId: req.companyId
    })
      .populate('products', 'name sku tiktokProductId images price commissionRate squareCommissionRate promotionInfluencerRate activityConfigs')
      .populate('creatorId', 'username nickname')
      .populate('callableUsers', 'username nickname');

    if (!recruitment) {
      return res.status(404).json({
        success: false,
        message: '招募信息不存在'
      });
    }

    res.json({
      success: true,
      data: recruitment
    });
  } catch (error) {
    console.error('Get recruitment detail error:', error);
    res.status(500).json({
      success: false,
      message: '获取招募详情失败'
    });
  }
});

/**
 * @route   POST /api/recruitments
 * @desc    创建招募
 * @access  Private
 */
router.post('/', authenticate, authorize('recruitments:create'), [
  body('name').notEmpty().withMessage('招募名称不能为空')
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

    const {
      name,
      description,
      isStrict,
      requirementGmv,
      requirementFollowers,
      requirementMonthlySales,
      requirementAvgViews,
      products,
      callableUsers,
      enabled,
      pageStyle
    } = req.body;

    const recruitment = new Recruitment({
      companyId: req.companyId,
      name,
      description,
      isStrict: isStrict || false,
      requirementGmv: requirementGmv || 0,
      requirementFollowers: requirementFollowers || 0,
      requirementMonthlySales: requirementMonthlySales || 0,
      requirementAvgViews: requirementAvgViews || 0,
      products: products || [],
      callableUsers: callableUsers || [],
      enabled: enabled !== false,
      pageStyle: pageStyle || { layoutStyle: 'style1', themeColor: '#775999' },
      creatorId: req.user._id,
      updatedBy: req.user._id
    });

    await recruitment.save();

    const populated = await Recruitment.findById(recruitment._id)
      .populate('products', 'name sku tiktokProductId images commissionRate squareCommissionRate promotionInfluencerRate activityConfigs')
      .populate('creatorId', 'username nickname')
      .populate('callableUsers', 'username nickname')
      .populate('updatedBy', 'username nickname');

    res.json({
      success: true,
      message: '创建成功',
      data: populated
    });
  } catch (error) {
    console.error('Create recruitment error:', error);
    res.status(500).json({
      success: false,
      message: '创建失败'
    });
  }
});

/**
 * @route   PUT /api/recruitments/:id
 * @desc    更新招募
 * @access  Private
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const recruitment = await Recruitment.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!recruitment) {
      return res.status(404).json({
        success: false,
        message: '招募信息不存在'
      });
    }

    const {
      name,
      description,
      isStrict,
      requirementGmv,
      requirementFollowers,
      requirementMonthlySales,
      requirementAvgViews,
      products,
      callableUsers,
      enabled,
      pageStyle
    } = req.body;

    if (name !== undefined) recruitment.name = name;
    if (description !== undefined) recruitment.description = description;
    if (isStrict !== undefined) recruitment.isStrict = isStrict;
    if (requirementGmv !== undefined) recruitment.requirementGmv = requirementGmv;
    if (requirementFollowers !== undefined) recruitment.requirementFollowers = requirementFollowers;
    if (requirementMonthlySales !== undefined) recruitment.requirementMonthlySales = requirementMonthlySales;
    if (requirementAvgViews !== undefined) recruitment.requirementAvgViews = requirementAvgViews;
    if (products !== undefined) recruitment.products = products;
    if (callableUsers !== undefined) recruitment.callableUsers = callableUsers;
    if (enabled !== undefined) recruitment.enabled = enabled;
    if (pageStyle !== undefined) recruitment.pageStyle = pageStyle;
    recruitment.updatedBy = req.userId;

    await recruitment.save();

    const populated = await Recruitment.findById(recruitment._id)
      .populate('products', 'name sku tiktokProductId images commissionRate squareCommissionRate promotionInfluencerRate activityConfigs')
      .populate('creatorId', 'username nickname')
      .populate('callableUsers', 'username nickname')
      .populate('updatedBy', 'username nickname');

    res.json({
      success: true,
      message: '更新成功',
      data: populated
    });
  } catch (error) {
    console.error('Update recruitment error:', error);
    res.status(500).json({
      success: false,
      message: '更新失败'
    });
  }
});

/**
 * @route   DELETE /api/recruitments/:id
 * @desc    删除招募（通过启用状态）
 * @access  Private
 */
router.delete('/:id', authenticate, authorize('recruitments:delete'), async (req, res) => {
  try {
    const recruitment = await Recruitment.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!recruitment) {
      return res.status(404).json({
        success: false,
        message: '招募信息不存在'
      });
    }

    // 软删除：通过禁用状态
    recruitment.enabled = false;
    await recruitment.save();

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('Delete recruitment error:', error);
    res.status(500).json({
      success: false,
      message: '删除失败'
    });
  }
});

const crypto = require('crypto');

/**
 * @route   POST /api/recruitments/:id/refresh-code
 * @desc    刷新识别码
 * @access  Private
 */
router.post('/:id/refresh-code', authenticate, authorize('recruitments:update'), async (req, res) => {
  try {
    const recruitment = await Recruitment.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!recruitment) {
      return res.status(404).json({
        success: false,
        message: '招募信息不存在'
      });
    }

    // 生成规则：活动名称 + 系统时间 + 1126 取16位哈希
    const seed = recruitment.name + Date.now() + '1126';
    const hash = crypto.createHash('md5').update(seed).digest('hex').substring(0, 16);
    recruitment.identificationCode = hash;
    await recruitment.save();

    res.json({
      success: true,
      message: '识别码刷新成功',
      data: { identificationCode: hash }
    });
  } catch (error) {
    console.error('Refresh code error:', error);
    res.status(500).json({
      success: false,
      message: '刷新识别码失败'
    });
  }
});

module.exports = router;
