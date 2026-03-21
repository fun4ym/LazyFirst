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
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: '权限验证失败'
      });
    }

    // 获取用户权限列表
    let userPermissions = [];
    
    // 检查是否使用roleId关联的角色系统
    if (req.user.roleId) {
      try {
        const User = require('../models/User');
        const userWithRole = await User.findById(req.user._id).populate('roleId', 'name permissions');
        if (userWithRole && userWithRole.roleId) {
          userPermissions = userWithRole.roleId.permissions || [];
          const roleName = userWithRole.roleId.name || '';
          
          // 超级管理员或拥有 * 权限的用户拥有所有权限
          if (roleName === '超级管理员' || roleName === 'admin' || userPermissions.includes('*')) {
            return next();
          }
        }
      } catch (e) {
        console.error('[authorize] 获取角色权限失败:', e.message);
      }
    } else if (req.user.role) {
      // 兼容旧的role字段
      if (req.user.role === 'admin' || req.user.role === 'bd' || req.user.role === 'viewer') {
        return next();
      }
    }

    // 检查是否有所需权限
    const hasPermission = permissions.some(permission => userPermissions.includes(permission));
    if (!hasPermission && userPermissions.length > 0) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    // 如果没有权限数组（旧数据兼容），则默认允许访问
    next();
  };
};

// 数据权限过滤 - 根据用户角色配置过滤查询
// options: { module: 'influencers', ownerField: 'userId', deptField: 'deptId', ownerValue }
const filterByDataScope = (options = {}) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const { module, ownerField = 'userId', deptField = 'deptId', ownerValue } = options;

    // 如果ownerValue是函数，在运行时获取值（如username）
    const resolvedOwnerValue = typeof ownerValue === 'function' ? ownerValue(req) : ownerValue;

    // 获取用户的数据权限配置
    let dataScope = 'self';
    let moduleDataScopes = {};
    let userDeptId = req.user.deptId;
    let isSuperAdmin = false;
    
    if (req.user.roleId) {
      try {
        const User = require('../models/User');
        const userWithRole = await User.findById(req.user._id).populate('roleId', 'name dataScope moduleDataScopes permissions');
        if (userWithRole && userWithRole.roleId) {
          // 检查是否是超级管理员
          const roleName = userWithRole.roleId.name || '';
          const rolePermissions = userWithRole.roleId.permissions || [];
          isSuperAdmin = roleName === '超级管理员' || roleName === 'admin' || rolePermissions.includes('*');
          
          // 获取全局默认数据权限
          dataScope = userWithRole.roleId.dataScope || 'self';
          // 获取各模块独立配置的数据权限（支持 Object 和 Map 类型）
          if (userWithRole.roleId.moduleDataScopes) {
            if (userWithRole.roleId.moduleDataScopes instanceof Map) {
              moduleDataScopes = Object.fromEntries(userWithRole.roleId.moduleDataScopes)
            } else {
              moduleDataScopes = userWithRole.roleId.moduleDataScopes || {}
            }
          }
        }
      } catch (e) {
        console.error('[filterByDataScope] 获取角色数据权限失败:', e.message);
      }
    }
    
    // 超级管理员拥有全部数据权限，不过滤
    if (isSuperAdmin) {
      req.dataScope = {
        scope: 'all',
        moduleScope: moduleDataScopes,
        userId: req.user._id,
        deptId: userDeptId,
        companyId: req.companyId,
        query: { companyId: req.companyId }
      };
      return next();
    }

    // 如果指定了模块，获取该模块的数据权限；否则使用全局默认
    let finalScope = dataScope;
    if (module && moduleDataScopes[module]) {
      finalScope = moduleDataScopes[module];
    }

    // 将数据权限信息挂载到req，供后续使用
    // 如果指定了ownerValue（自定义值如用户名），则使用它；否则使用用户ID
    const finalOwnerValue = resolvedOwnerValue || req.user._id;
    req.dataScope = {
      scope: finalScope,
      moduleScope: moduleDataScopes, // 保存所有模块的权限配置
      userId: req.user._id,
      deptId: userDeptId,
      companyId: req.companyId,
      // 构建的查询条件
      query: buildDataScopeQuery(finalScope, finalOwnerValue, userDeptId, req.companyId, ownerField, deptField)
    };

    console.log('[DataScope] 用户数据权限:', { module, finalScope, userId: req.user._id, deptId: userDeptId, moduleDataScopes });

    next();
  };
};

// 构建数据权限查询条件
const buildDataScopeQuery = (dataScope, userId, deptId, companyId, ownerField, deptField) => {
  const query = { companyId };

  switch (dataScope) {
    case 'self':
      // 只看自己创建的数据
      query[ownerField] = userId;
      break;
    case 'dept':
      // 看本部门的数据
      if (deptId) {
        query[deptField] = deptId;
      } else {
        // 没有部门则只能看自己
        query[ownerField] = userId;
      }
      break;
    case 'all':
      // 看全部数据，不需要额外条件
      break;
    default:
      query[ownerField] = userId;
  }

  return query;
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
  optionalAuth,
  filterByDataScope,
  buildDataScopeQuery
};
