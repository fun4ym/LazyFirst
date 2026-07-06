const mongoose = require('mongoose');

/**
 * TikTok扩展数据采集表
 * 用于存储Chrome插件采集的达人数据，等待系统同步到influencer表
 */
const tiktokExtensionDataSchema = new mongoose.Schema({
  // 公司ID（自动从登录用户获取）
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  // TikTok信息
  tiktokId: {
    type: String,
    required: true,
    trim: true
  },
  tiktokName: {
    type: String,
    required: true,
    trim: true
  },
  
  // 采集的数据
  followerCount: {
    type: Number,
    default: 0
  },
  estimatedGmv: {
    type: Number,
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
  
  // 采集信息
  collectedAt: {
    type: Date,
    default: Date.now
  },
  collectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // 同步状态
  synced: {
    type: Boolean,
    default: false
  },
  syncedAt: {
    type: Date
  },
  influencerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Influencer'
  },
  
  // 原始数据（用于存储更多字段）
  rawData: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

// 索引
tiktokExtensionDataSchema.index({ companyId: 1, tiktokId: 1 });
tiktokExtensionDataSchema.index({ synced: 1 });
tiktokExtensionDataSchema.index({ collectedAt: -1 });

module.exports = mongoose.model('TiktokExtensionData', tiktokExtensionDataSchema);
