const mongoose = require('mongoose');

/**
 * 视频生成任务模型
 * 存储AI视频生成任务的状态和结果
 */
const videoGenerationTaskSchema = new mongoose.Schema({
  // 达人ID
  influencerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Influencer',
    required: true
  },
  
  // 商品ID
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  
  // 提示词
  prompt: {
    type: String,
    required: true,
    trim: true
  },
  
  // 视频时长（秒）
  duration: {
    type: Number,
    enum: [5, 10],
    required: true
  },
  
  // 分辨率（默认720P）
  resolution: {
    type: String,
    default: '720P'
  },
  
  // 展示模式
  displayMode: {
    type: String,
    enum: ['human', 'animated_human', 'product_only'],
    required: true
  },
  
  // 风格
  style: {
    type: String,
    enum: ['normal', 'crazy'],
    required: true
  },
  
  // 任务状态：pending（等待中）/ processing（处理中）/ completed（完成）/ failed（失败）
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  
  // 火山引擎任务ID
  taskId: {
    type: String,
    default: ''
  },
  
  // 生成的视频URL
  videoUrl: {
    type: String,
    default: ''
  },
  
  // 错误信息
  errorMessage: {
    type: String,
    default: ''
  },
  
  // 消耗的点数
  pointsConsumed: {
    type: Number,
    default: 0
  },
  
  // 公司ID
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // 更新时间
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 更新时自动更新updatedAt字段
videoGenerationTaskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 索引优化
videoGenerationTaskSchema.index({ influencerId: 1, createdAt: -1 });
videoGenerationTaskSchema.index({ status: 1 });
videoGenerationTaskSchema.index({ taskId: 1 });

module.exports = mongoose.model('VideoGenerationTask', videoGenerationTaskSchema);
