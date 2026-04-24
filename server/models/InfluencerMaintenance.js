const mongoose = require('mongoose');

const influencerMaintenanceSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  influencerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Influencer',
    required: true
  },
  followers: {
    type: Number,
    required: true,
    default: 0
  },
  gmv: {
    type: Number,
    required: true,
    default: 0
  },
  monthlySalesCount: {
    type: Number,
    default: 0
  },
  avgVideoViews: {
    type: Number,
    default: 0
  },
  poolType: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  remark: {
    type: String,
    trim: true
  },
  maintainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  maintainerName: {
    type: String,
    required: true
  },
  // 记录类型：maintenance-维护记录, sample_application-样品申请
  recordType: {
    type: String,
    enum: ['maintenance', 'sample_application'],
    default: 'maintenance'
  },
  // 分类：import-数据导入, create-新增/手动维护, sample_application-样品申请, blacklist-标记黑名单
  category: {
    type: String,
    enum: ['import', 'create', 'sample_application', 'blacklist'],
    default: 'create'
  },
  // 关联的样品ID（当recordType为sample_application时）
  sampleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SampleManagement'
  }
}, {
  timestamps: true
});

influencerMaintenanceSchema.index({ influencerId: 1, createdAt: -1 });
influencerMaintenanceSchema.index({ companyId: 1, maintainerId: 1 });

module.exports = mongoose.model('InfluencerMaintenance', influencerMaintenanceSchema);
