/**
 * 权限配置常量
 * 统一管理所有菜单项、权限、数据权限的对应关系
 */

// 模块定义 - 对应菜单
export const MODULES = {
  // 仪表盘
  DASHBOARD: { code: 'dashboard', name: '仪表盘', dataScope: false },

  // BD工作台
  BD_WORKSPACE: { code: 'bd-workspace', name: 'BD工作台', dataScope: false },
  INFLUENCERS: { code: 'influencers', name: '达人列表', parent: 'bd-workspace' },
  SAMPLES_BD: { code: 'samples-bd', name: '样品申请(B D)', parent: 'bd-workspace' },

  // 供应链
  SUPPLY_CHAIN: { code: 'supply-chain', name: '供应链', dataScope: false },
  PRODUCTS: { code: 'products', name: '产品管理', parent: 'supply-chain' },
  ACTIVITIES: { code: 'activities', name: '活动管理', parent: 'supply-chain' },

  // 数据采集
  DATA_COLLECTION: { code: 'data-collection', name: '数据采集', dataScope: false },
  SAMPLES: { code: 'samples', name: '样品管理', parent: 'data-collection' },
  ORDERS: { code: 'orders', name: '订单管理', parent: 'data-collection' },

  // 报表管理
  REPORTS: { code: 'reports', name: '报表管理', dataScope: false },
  BD_DASHBOARD: { code: 'bd-dashboard', name: 'BD仪表盘', parent: 'reports' },
  BD_DAILY: { code: 'bd-daily', name: 'BD日报', parent: 'reports' },
  PERFORMANCE: { code: 'performance', name: '业绩报表', parent: 'reports' },

  // 系统设置
  SETTINGS: { code: 'settings', name: '系统设置', dataScope: false },
  USERS: { code: 'users', name: '用户管理', parent: 'settings' },
  ROLES: { code: 'roles', name: '角色管理', parent: 'settings' },
  DEPARTMENTS: { code: 'departments', name: '部门管理', parent: 'settings' },
  COMMISSION_RULES: { code: 'commission-rules', name: '分润规则', parent: 'settings' },
  BASE_DATA: { code: 'base-data', name: '基础数据', parent: 'settings' },
  SYSTEM_MODELS: { code: 'system-models', name: '系统模型', parent: 'settings' },
}

// 操作权限 - 对应按钮/控件
export const OPERATIONS = {
  // 基础操作
  READ: { code: 'read', name: '查看' },
  CREATE: { code: 'create', name: '新增' },
  UPDATE: { code: 'update', name: '编辑' },
  DELETE: { code: 'delete', name: '删除' },
  EXPORT: { code: 'export', name: '导出' },
  IMPORT: { code: 'import', name: '导入' },
  APPROVE: { code: 'approve', name: '审批' },
  CALCULATE: { code: 'calculate', name: '计算' },
}

// 控件权限 - 对应字段
export const FIELD_PERMISSIONS = {
  // 达人字段
  INFLUENCER_NAME: { code: 'field:influencer:name', name: '达人名称', module: 'influencers' },
  INFLUENCER_ACCOUNT: { code: 'field:influencer:account', name: '账号信息', module: 'influencers' },
  INFLUENCER_CONTACT: { code: 'field:influencer:contact', name: '联系方式', module: 'influencers' },
  INFLUENCER_PRICE: { code: 'field:influencer:price', name: '报价信息', module: 'influencers' },
  INFLUENCER_STATS: { code: 'field:influencer:stats', name: '数据统计', module: 'influencers' },

  // 样品字段
  SAMPLE_PRODUCT: { code: 'field:sample:product', name: '产品信息', module: 'samples' },
  SAMPLE_INFLUENCER: { code: 'field:sample:influencer', name: '达人信息', module: 'samples' },
  SAMPLE_STATUS: { code: 'field:sample:status', name: '状态', module: 'samples' },
  SAMPLE_AMOUNT: { code: 'field:sample:amount', name: '金额', module: 'samples' },

  // 订单字段
  ORDER_PRODUCT: { code: 'field:order:product', name: '产品信息', module: 'orders' },
  ORDER_AMOUNT: { code: 'field:order:amount', name: '订单金额', module: 'orders' },
  ORDER_PROFIT: { code: 'field:order:profit', name: '利润', module: 'orders' },
}

// 数据权限类型
export const DATA_SCOPES = {
  SELF: { code: 'self', name: '只看自己' },
  DEPT: { code: 'dept', name: '看本部门' },
  ALL: { code: 'all', name: '看全部' },
}

/**
 * 权限生成器
 * 根据模块和操作生成权限码
 */
export function makePermission(module, operation) {
  return `${module}:${operation}`
}

/**
 * 获取模块的所有权限
 */
export function getModulePermissions(moduleCode) {
  return Object.values(OPERATIONS).map(op => makePermission(moduleCode, op.code))
}

/**
 * 权限配置映射表
 * 菜单项 -> 权限码的映射
 */
export const PERMISSION_MAP = {
  // 仪表盘
  '/dashboard': [],

  // BD工作台
  '/influencer-managements': [makePermission('influencers', 'read')],
  '/samples-bd': [makePermission('samples-bd', 'read'), makePermission('samples-bd', 'create')],

  // 供应链
  '/products': [makePermission('products', 'read')],
  '/activities': [makePermission('activities', 'read')],

  // 数据采集
  '/samples': [makePermission('samples', 'read')],
  '/orders': [makePermission('orders', 'read')],

  // 报表
  '/bd-dashboard': [makePermission('bd-dashboard', 'read')],
  '/bd-daily': [makePermission('bd-daily', 'read')],
  '/performance': [makePermission('performance', 'read')],

  // 系统设置
  '/settings/users': [makePermission('users', 'read')],
  '/settings/roles': [makePermission('roles', 'read')],
  '/settings/departments': [makePermission('departments', 'read')],
  '/settings/commission-rules': [makePermission('commission-rules', 'read')],
  '/settings/base-data': [makePermission('base-data', 'read')],
  '/settings/system-models': [makePermission('system-models', 'read')],
}

/**
 * 模块数据权限配置
 * 每个模块可以独立配置数据权限
 */
export const MODULE_DATA_SCOPE = {
  influencers: { ownerField: 'assignedTo', label: '达人' },
  'samples-bd': { ownerField: 'salesmanId', label: '样品' },
  samples: { ownerField: 'salesmanId', label: '样品' },
  orders: { ownerField: 'salesmanId', label: '订单' },
  products: { ownerField: 'userId', label: '产品' },
  activities: { ownerField: 'userId', label: '活动' },
  'bd-daily': { ownerField: 'userId', label: '日报' },
  performance: { ownerField: 'userId', label: '业绩' },
}
