const User = require('../models/User');

const checkPermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.userId).populate('roleId', 'name permissions');
      
      if (!user) {
        return res.status(401).json({ error: '用户不存在' });
      }

      const role = user.roleId;
      if (!role) {
        return res.status(403).json({ error: '用户没有角色' });
      }

      // 管理员拥有所有权限
      const isAdmin = role.name === 'admin' || role.name === '超级管理员' || role.name === '管理员' || role.permissions?.includes('*');
      if (isAdmin) {
        return next();
      }

      // 检查是否有权限
      const hasPermission = requiredPermissions.every(perm => role.permissions?.includes(perm));
      if (!hasPermission) {
        return res.status(403).json({ error: '没有权限' });
      }

      next();
    } catch (error) {
      console.error('checkPermission error:', error);
      res.status(500).json({ error: '服务器错误' });
    }
  };
};

module.exports = checkPermission;
