const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const Role = require('../models/Role');

const router = express.Router();

/**
 * @route   GET /api/roles
 * @desc    获取角色列表
 * @access  Private
 */
router.get('/', authenticate, authorize('roles:read'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    const query = { companyId: req.companyId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const roles = await Role.find(query)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Role.countDocuments(query);

    res.json({
      success: true,
      data: {
        roles,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      message: '获取角色列表失败'
    });
  }
});

/**
 * @route   GET /api/roles/:id
 * @desc    获取角色详情
 * @access  Private
 */
router.get('/:id', authenticate, authorize('roles:read'), async (req, res) => {
  try {
    const role = await Role.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: '角色不存在'
      });
    }

    res.json({
      success: true,
      data: { role }
    });

  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json({
      success: false,
      message: '获取角色详情失败'
    });
  }
});

/**
 * @route   POST /api/roles
 * @desc    创建角色
 * @access  Private
 */
router.post('/', authenticate, authorize('roles:create'), [
  body('name').trim().notEmpty().withMessage('角色名称不能为空'),
  body('description').trim().notEmpty().withMessage('角色描述不能为空'),
  body('permissions').isArray().withMessage('权限必须是数组'),
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

    const { name, description, permissions, dataScope, moduleDataScopes, status, code } = req.body;

    // 自动生成code：name转大写+下划线，或使用前端传来的code
    const roleCode = code || (name ? name.toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_' + Date.now().toString(-36) : 'ROLE_' + Date.now().toString(36));

    const role = await Role.create({
      companyId: req.companyId,
      code: roleCode,
      name,
      description,
      permissions: permissions || [],
      dataScope: dataScope || 'self',
      moduleDataScopes: moduleDataScopes || {},
      status: status || 'active'
    });

    res.status(201).json({
      success: true,
      message: '创建成功',
      data: { role }
    });

  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({
      success: false,
      message: '创建角色失败'
    });
  }
});

/**
 * @route   PUT /api/roles/:id
 * @desc    更新角色
 * @access  Private
 */
router.put('/:id', authenticate, authorize('roles:update'), [
  body('name').trim().notEmpty().withMessage('角色名称不能为空'),
  body('description').trim().notEmpty().withMessage('角色描述不能为空'),
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

    const { name, description, permissions, dataScope, moduleDataScopes, status } = req.body;

    const role = await Role.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      { name, description, permissions, dataScope, moduleDataScopes, status },
      { new: true }
    );

    if (!role) {
      return res.status(404).json({
        success: false,
        message: '角色不存在'
      });
    }

    res.json({
      success: true,
      message: '更新成功',
      data: { role }
    });

  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      success: false,
      message: '更新角色失败'
    });
  }
});

/**
 * @route   DELETE /api/roles/:id
 * @desc    删除角色
 * @access  Private
 */
router.delete('/:id', authenticate, authorize('roles:delete'), async (req, res) => {
  try {
    const role = await Role.findOneAndDelete({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: '角色不存在'
      });
    }

    res.json({
      success: true,
      message: '删除成功'
    });

  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({
      success: false,
      message: '删除角色失败'
    });
  }
});

module.exports = router;
