const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const Department = require('../models/Department');

const router = express.Router();

/**
 * @route   GET /api/departments
 * @desc    获取部门列表
 * @access  Private
 */
router.get('/', authenticate, authorize('departments:read'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    const query = { companyId: req.companyId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const departments = await Department.find(query)
      .populate('managerId', 'realName')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Department.countDocuments(query);

    res.json({
      success: true,
      data: {
        departments,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: '获取部门列表失败'
    });
  }
});

/**
 * @route   GET /api/departments/:id
 * @desc    获取部门详情
 * @access  Private
 */
router.get('/:id', authenticate, authorize('departments:read'), async (req, res) => {
  try {
    const department = await Department.findOne({
      _id: req.params.id,
      companyId: req.companyId
    })
    .populate('managerId', 'realName')
    .populate('parentId', 'name');

    if (!department) {
      return res.status(404).json({
        success: false,
        message: '部门不存在'
      });
    }

    res.json({
      success: true,
      data: { department }
    });

  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({
      success: false,
      message: '获取部门详情失败'
    });
  }
});

/**
 * @route   POST /api/departments
 * @desc    创建部门
 * @access  Private
 */
router.post('/', authenticate, authorize('departments:create'), [
  body('name').trim().notEmpty().withMessage('部门名称不能为空'),
  body('description').trim().notEmpty().withMessage('部门描述不能为空'),
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

    const { parentId, name, description, managerId, status } = req.body;

    const department = await Department.create({
      companyId: req.companyId,
      parentId: parentId || null,
      name,
      description,
      managerId: managerId || null,
      status: status || 'active'
    });

    res.status(201).json({
      success: true,
      message: '创建成功',
      data: { department }
    });

  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({
      success: false,
      message: '创建部门失败'
    });
  }
});

/**
 * @route   PUT /api/departments/:id
 * @desc    更新部门
 * @access  Private
 */
router.put('/:id', authenticate, authorize('departments:update'), [
  body('name').trim().notEmpty().withMessage('部门名称不能为空'),
  body('description').trim().notEmpty().withMessage('部门描述不能为空'),
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

    const { parentId, name, description, managerId, status } = req.body;

    const department = await Department.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      { parentId: parentId || null, name, description, managerId: managerId || null, status },
      { new: true }
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: '部门不存在'
      });
    }

    res.json({
      success: true,
      message: '更新成功',
      data: { department }
    });

  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({
      success: false,
      message: '更新部门失败'
    });
  }
});

/**
 * @route   DELETE /api/departments/:id
 * @desc    删除部门
 * @access  Private
 */
router.delete('/:id', authenticate, authorize('departments:delete'), async (req, res) => {
  try {
    const department = await Department.findOneAndDelete({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: '部门不存在'
      });
    }

    res.json({
      success: true,
      message: '删除成功'
    });

  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({
      success: false,
      message: '删除部门失败'
    });
  }
});

module.exports = router;
