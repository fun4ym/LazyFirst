const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  tikTokActivityId: {
    type: String,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['self_initiated', 'merchant_initiated'],
    default: 'self_initiated'
  },
  // 活动配置
  partnerCenter: {
    type: String,
    trim: true
  },
  tapLink: {
    type: String,
    trim: true
  },
  sampleMethod: {
    type: String,
    enum: ['线上', '线下', ''],
    default: ''
  },
  cooperationCountry: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  budget: {
    type: Number,
    default: 0,
    min: 0
  },
  // 佣金配置 - 推广
  promotionInfluencerRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  promotionOriginalRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  promotionCompanyRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // 佣金配置 - 广告
  adInfluencerRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  adOriginalRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  adCompanyRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // 达人要求
  requirementGmv: {
    type: Number,
    default: 0
  },
  gmvCurrency: {
    type: String,
    default: ''
  },
  requirementMonthlySales: {
    type: Number,
    default: 0
  },
  requirementFollowers: {
    type: Number,
    default: 0
  },
  requirementAvgViews: {
    type: Number,
    default: 0
  },
  requirementRemark: {
    type: String,
    trim: true
  },
  // 寄样方式
  sampleMethod: {
    type: String,
    enum: ['线上', '线下', ''],
    default: ''
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'upcoming', 'active', 'ended'],
    default: 'pending'
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
}, {
  timestamps: true
});

activitySchema.index({ companyId: 1, createdAt: -1 });
activitySchema.index({ status: 1 });

module.exports = mongoose.model('Activity', activitySchema);
