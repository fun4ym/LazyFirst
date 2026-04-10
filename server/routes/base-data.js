const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const BaseData = require('../models/BaseData');

const router = express.Router();

/**
 * @route   GET /api/public/base-data
 * @desc    公开获取基础数据列表（给 PublicCollection 页面用）
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { type, limit = 100 } = req.query;
    const query = {};

    if (type) {
      query.type = type;
    }

    const data = await BaseData.find(query)
      .select('_id name code value description type')
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get public base data error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   GET /api/base-data
 * @desc    获取基础数据列表
 * @access  Private
 */
router.get('/', authenticate, authorize('baseData:read'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      search,
      isExport
    } = req.query;

    const query = { companyId: req.companyId };

    if (type) {
      query.type = type;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    if (isExport) {
      const data = await BaseData.find(query)
        .populate('creatorId', 'realName')
        .sort({ createdAt: -1 });

      const headers = ['名称', '代码', '数值/描述', '状态', '创建人', '创建时间'];
      const rows = data.map(item => [
        item.name,
        item.code || '-',
        item.value || item.description || '-',
        item.status === 'active' ? '正常' : '禁用',
        item.creatorId?.realName || '-',
        new Date(item.createdAt).toLocaleString('zh-CN')
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      return res.json({
        success: true,
        data: { data: csvContent }
      });
    }

    const baseData = await BaseData.find(query)
      .populate('creatorId', 'realName')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await BaseData.countDocuments(query);

    res.json({
      success: true,
      data: {
        data: baseData,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get base data error:', error);
    res.status(500).json({
      success: false,
      message: '获取基础数据失败'
    });
  }
});

/**
 * @route   POST /api/base-data
 * @desc    创建基础数据
 * @access  Private
 */
router.post('/', authenticate, authorize('baseData:create'), [
  body('name').notEmpty().withMessage('名称不能为空'),
  body('type').notEmpty().withMessage('类型不能为空')
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

    const { isDefault, type } = req.body;

    // 如果设置为默认，先取消其他记录的默认状态（仅country和priceUnit）
    if (isDefault && (type === 'country' || type === 'priceUnit')) {
      await BaseData.updateMany(
        { companyId: req.companyId, type, isDefault: true },
        { isDefault: false }
      );
    }

    const baseData = await BaseData.create({
      ...req.body,
      companyId: req.companyId,
      creatorId: req.user._id
    });

    // populate 可能出错，使用原始数据
    let responseData = baseData;
    try {
      const populatedBaseData = await BaseData.findById(baseData._id)
        .populate('creatorId', 'realName');
      responseData = populatedBaseData;
    } catch (popError) {
      console.warn('Populate failed, using raw data:', popError.message);
    }

    res.status(201).json({
      success: true,
      message: '创建成功',
      data: { baseData: responseData }
    });
  } catch (error) {
    console.error('Create base data error:', error);
    res.status(500).json({
      success: false,
      message: '创建失败'
    });
  }
});

/**
 * @route   PUT /api/base-data/:id
 * @desc    更新基础数据
 * @access  Private
 */
router.put('/:id', authenticate, authorize('baseData:update'), async (req, res) => {
  try {
    const { isDefault, type } = req.body;

    // 如果设置为默认，先取消其他记录的默认状态（仅country和priceUnit）
    if (isDefault && (type === 'country' || type === 'priceUnit')) {
      await BaseData.updateMany(
        { companyId: req.companyId, type, isDefault: true, _id: { $ne: req.params.id } },
        { isDefault: false }
      );
    }

    const baseData = await BaseData.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      req.body,
      { new: true }
    ).populate('creatorId', 'realName');

    if (!baseData) {
      return res.status(404).json({
        success: false,
        message: '数据不存在'
      });
    }

    res.json({
      success: true,
      message: '更新成功',
      data: { baseData }
    });
  } catch (error) {
    console.error('Update base data error:', error);
    res.status(500).json({
      success: false,
      message: '更新失败'
    });
  }
});

/**
 * @route   DELETE /api/base-data/batch
 * @desc    批量删除基础数据
 * @access  Private
 */
router.delete('/batch', authenticate, authorize('baseData:delete'), [
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

    await BaseData.deleteMany({
      _id: { $in: ids },
      companyId: req.companyId
    });

    res.json({
      success: true,
      message: '批量删除成功'
    });
  } catch (error) {
    console.error('Batch delete error:', error);
    res.status(500).json({
      success: false,
      message: '批量删除失败'
    });
  }
});

/**
 * @route   DELETE /api/base-data/:id
 * @desc    删除基础数据
 * @access  Private
 */
router.delete('/:id', authenticate, authorize('baseData:delete'), async (req, res) => {
  try {
    const baseData = await BaseData.findOneAndDelete({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!baseData) {
      return res.status(404).json({
        success: false,
        message: '数据不存在'
      });
    }

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('Delete base data error:', error);
    res.status(500).json({
      success: false,
      message: '删除失败'
    });
  }
});

module.exports = router;
