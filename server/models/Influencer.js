const mongoose = require('mongoose');

const influencerSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  // TikTok信息
  tiktokName: {
    type: String,
    required: true,
    trim: true
  },
  tiktokId: {
    type: String,
    required: true,
    trim: true
  },
  formerNames: {
    type: String,
    default: '',
    trim: true
  },
  formerIds: {
    type: String,
    default: '',
    trim: true
  },
  originalTiktokId: {
    type: String,
    default: ''
  },
  // 状态：启用/禁用
  status: {
    type: String,
    enum: ['enabled', 'disabled'],
    default: 'enabled'
  },
  // 归类标签
  categoryTags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BaseData'
  }],
  // 真实信息
  realName: {
    type: String,
    default: '',
    trim: true
  },
  nickname: {
    type: String,
    default: '',
    trim: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: 'other'
  },
  addresses: [{
    type: String,
    trim: true
  }],
  phoneNumbers: [{
    type: String,
    trim: true
  }],
  socialAccounts: [{
    type: String,
    trim: true
  }],
  // 达人归属
  poolType: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  // 最新维护信息
  latestFollowers: {
    type: Number,
    default: 0
  },
  latestGmv: {
    type: Number,
    default: 0
  },
  latestMaintenanceTime: {
    type: Date
  },
  latestMaintainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  latestMaintainerName: {
    type: String,
    default: ''
  },
  latestRemark: {
    type: String,
    default: ''
  },
  // 黑名单相关
  isBlacklisted: {
    type: Boolean,
    default: false
  },
  blacklistedAt: {
    type: Date
  },
  blacklistedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  blacklistedByName: {
    type: String,
    default: ''
  },
  blacklistReason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// 虚拟字段：维护状态
influencerSchema.virtual('maintenanceStatus').get(function() {
  if (this.poolType === 'public') {
    return 'public';
  }

  const latestMaintenanceTime = this.latestMaintenanceTime;
  if (!latestMaintenanceTime) {
    return 'pending';
  }

  const now = new Date();
  const daysSinceLastMaintenance = Math.floor((now - latestMaintenanceTime) / (1000 * 60 * 60 * 24));

  if (daysSinceLastMaintenance <= 7) {
    return 'normal';
  } else if (daysSinceLastMaintenance <= 14) {
    return 'maintenance_needed';
  } else if (daysSinceLastMaintenance <= 21) {
    return 'at_risk';
  } else if (daysSinceLastMaintenance <= 24) {
    return 'about_to_release';
  } else {
    return 'released';
  }
});

// 索引
influencerSchema.index({ companyId: 1, poolType: 1 });
influencerSchema.index({ companyId: 1, assignedTo: 1 });
influencerSchema.index({ companyId: 1, tiktokId: 1 });
influencerSchema.index({ companyId: 1, tiktokName: 1 });
influencerSchema.index({ companyId: 1, status: 1 });

// 设置虚拟字段
influencerSchema.set('toJSON', { virtuals: true });
influencerSchema.set('toObject', { virtuals: true });

const Influencer = mongoose.model('Influencer', influencerSchema);

module.exports = Influencer;
