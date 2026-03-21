const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  permissions: [{
    type: String,
    trim: true
  }],
  // 数据权限：self-只看自己, dept-看本部门, all-看全部（全局默认）
  dataScope: {
    type: String,
    enum: ['self', 'dept', 'all'],
    default: 'self'
  },
  // 每个模块独立配置数据权限 { influencers: 'all', samples: 'dept', orders: 'self' }
  // 使用普通 Object 类型，确保与前端 JSON 完全兼容
  moduleDataScopes: {
    type: Object,
    default: {}
  },
  // 允许查看的部门ID列表（dataScope为dept时使用）
  allowedDepts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// 唯一索引：同一公司下角色名称唯一
roleSchema.index({ companyId: 1, name: 1 }, { unique: true });

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;
