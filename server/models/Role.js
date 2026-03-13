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
