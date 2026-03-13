const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../utils/jwt');

// 验证JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      });
    }

    const token = authHeader.substring(7);
    console.log('[Auth] 收到token, 长度:', token.length);
    console.log('[Auth] JWT_SECRET:', JWT_SECRET);

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('[Auth] Token验证成功, userId:', decoded.userId);

      // 查询用户信息
      const user = await User.findById(decoded.userId)
        .select('-password')
        .populate('companyId', 'name status');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: '用户不存在'
        });
      }

      if (user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: '用户已被禁用'
        });
      }

      req.user = user;
      req.userId = user._id;
      req.companyId = user.companyId._id || user.companyId;
      next();

    } catch (jwtError) {
      console.error('[Auth] Token验证失败:', jwtError.message);
      return res.status(401).json({
        success: false,
        message: '无效的认证令牌'
      });
    }

  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: '认证失败'
    });
  }
};

// 验证权限
const authorize = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: '权限验证失败'
      });
    }

    // 管理员拥有所有权限
    if (req.user.role === 'admin') {
      return next();
    }

    // 如果不是使用 roleId 系统的权限，暂时允许 bd 和 viewer 访问所有功能
    // 后续可以根据需要实现基于角色的权限控制
    if (req.user.role === 'bd' || req.user.role === 'viewer') {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: '权限不足'
    });
  };
};

// 可选认证
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        if (user) {
          req.user = user;
          req.companyId = user.companyId;
        }
      } catch (error) {
        // Token无效，继续处理请求
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};
