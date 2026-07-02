const mongoose = require('mongoose');

/**
 * 提示词模板模型
 * 存储AI视频生成的提示词模板
 */
const promptTemplateSchema = new mongoose.Schema({
  // 模板名称
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  // 产品类型（关联BaseData）
  productType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BaseData',
    required: true
  },
  
  // 展示模式：human（数字人出场）/ animated_human（动画数字人出场）/ product_only（仅产品展示）
  displayMode: {
    type: String,
    enum: ['human', 'animated_human', 'product_only'],
    required: true
  },
  
  // 风格：normal（普通）/ crazy（疯狂）
  style: {
    type: String,
    enum: ['normal', 'crazy'],
    required: true
  },
  
  // 提示词模板
  template: {
    type: String,
    required: true,
    trim: true
  },
  
  // 变量列表（模板中可替换的变量）
  variables: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    }
  }],
  
  // 公司ID
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  // 创建者ID
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
promptTemplateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 索引优化
promptTemplateSchema.index({ companyId: 1 });
promptTemplateSchema.index({ productType: 1, displayMode: 1, style: 1 });

module.exports = mongoose.model('PromptTemplate', promptTemplateSchema);
