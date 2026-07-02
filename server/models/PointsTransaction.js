const mongoose = require('mongoose');

/**
 * 点数交易记录模型
 * 记录达人点数的赚取和消耗历史
 */
const pointsTransactionSchema = new mongoose.Schema({
  // 达人ID
  influencerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Influencer',
    required: true
  },
  
  // 交易类型：earn（获取）/ consume（消耗）/ gift（赠送）
  type: {
    type: String,
    enum: ['earn', 'consume', 'gift'],
    required: true
  },
  
  // 点数数量（正数）
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  
  // 交易后余额
  balance: {
    type: Number,
    required: true,
    min: 0
  },
  
  // 来源：order（订单贡献）/ purchase（购买）/ bd_gift（BD赠送）/ video_generate（视频生成消耗）
  source: {
    type: String,
    enum: ['order', 'purchase', 'bd_gift', 'video_generate'],
    required: true
  },
  
  // 关联ID（订单ID、购买记录ID、BD赠送记录ID、视频生成任务ID）
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  
  // 描述
  description: {
    type: String,
    default: '',
    trim: true
  },
  
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 索引优化
pointsTransactionSchema.index({ influencerId: 1, createdAt: -1 });
pointsTransactionSchema.index({ type: 1 });
pointsTransactionSchema.index({ source: 1 });

module.exports = mongoose.model('PointsTransaction', pointsTransactionSchema);
