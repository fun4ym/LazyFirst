const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    获取用户列表
 * @access  Private
 */
router.get('/', authenticate, authorize('users:read'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, roleId } = req.query;

    const query = { companyId: req.companyId };

    if (search) {
      query.$or = [
        { realName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (roleId) {
      query.roleId = roleId;
    }

    const users = await User.find(query)
      .select('-password')
      .populate('companyId', 'name')
      .populate('roleId', 'name')
      .populate('deptId', 'name')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    获取用户详情
 * @access  Private
 */
router.get('/:id', authenticate, authorize('users:read'), async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      companyId: req.companyId
    })
    .select('-password')
    .populate('companyId', 'name')
    .populate('roleId', 'name permissions')
    .populate('deptId', 'name');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: '获取用户详情失败'
    });
  }
});

/**
 * @route   POST /api/users
 * @desc    创建用户
 * @access  Private
 */
router.post('/', authenticate, authorize('users:create'), [
  body('username').trim().notEmpty().withMessage('用户名不能为空'),
  body('password').isLength({ min: 6 }).withMessage('密码至少6位'),
  body('realName').trim().notEmpty().withMessage('真实姓名不能为空'),
  body('phone').trim().notEmpty().withMessage('手机号不能为空'),
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

    const { username, password, realName, phone, email, roleId, deptId, status } = req.body;

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在'
      });
    }

    const user = await User.create({
      companyId: req.companyId,
      username,
      password,
      realName,
      phone,
      email,
      roleId: roleId || null,
      deptId: deptId || null,
      status: status || 'active'
    });

    res.status(201).json({
      success: true,
      message: '创建成功',
      data: { user: user.toJSON() }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: '创建用户失败'
    });
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    更新用户
 * @access  Private
 */
router.put('/:id', authenticate, authorize('users:update'), [
  body('realName').trim().notEmpty().withMessage('真实姓名不能为空'),
  body('phone').trim().notEmpty().withMessage('手机号不能为空'),
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

    const { realName, phone, email, roleId, deptId, status, password } = req.body;

    const updateData = { realName, phone, email, roleId, deptId, status };
    if (password) {
      updateData.password = password;
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      message: '更新成功',
      data: { user }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: '更新用户失败'
    });
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    删除用户
 * @access  Private
 */
router.delete('/:id', authenticate, authorize('users:delete'), async (req, res) => {
  try {
    const user = await User.findOneAndDelete({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      message: '删除成功'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: '删除用户失败'
    });
  }
});

/**
 * @route   POST /api/users/change-password
 * @desc    用户修改自己的密码
 * @access  Private
 */
router.post('/change-password', authenticate, [
  body('oldPassword').trim().notEmpty().withMessage('旧密码不能为空'),
  body('newPassword').isLength({ min: 6 }).withMessage('新密码至少6位'),
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

    const { oldPassword, newPassword } = req.body;
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 验证旧密码
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: '旧密码错误'
      });
    }

    // 更新密码
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: '密码修改成功'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: '修改密码失败'
    });
  }
});

/**
 * @route   PUT /api/users/:id/password
 * @desc    管理员修改用户密码
 * @access  Private
 */
router.put('/:id/password', authenticate, authorize('users:update'), [
  body('newPassword').isLength({ min: 6 }).withMessage('新密码至少6位'),
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

    const { newPassword } = req.body;
    const targetUserId = req.params.id;

    const user = await User.findOne({
      _id: targetUserId,
      companyId: req.companyId
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 更新密码
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: '密码重置成功'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: '重置密码失败'
    });
  }
});

module.exports = router;
