const mongoose = require('mongoose');

const aiModelSchema = new mongoose.Schema({
  // 模型名称（如 "seedance 2", "HY3 preview"）
  name: {
    type: String,
    required: true,
    trim: true
  },
  // 模型类型（如 "video_generation", "text_generation", "image_generation"）
  type: {
    type: String,
    required: true,
    enum: ['video_generation', 'text_generation', 'image_generation', 'multimodal'],
    default: 'video_generation'
  },
  // 提供商（如 "openai", "stability", "hunyuan", "custom"）
  provider: {
    type: String,
    required: true,
    default: 'custom'
  },
  // API密钥配置（支持多种密钥类型）
  config: {
    // 通用字段
    apiKey: {
      type: String,
      default: ''
    },
    apiSecret: {
      type: String,
      default: ''
    },
    baseUrl: {
      type: String,
      default: ''
    },
    // 模型特定配置
    modelId: {
      type: String,
      default: ''
    },
    maxTokens: {
      type: Number,
      default: 2048
    },
    temperature: {
      type: Number,
      default: 0.7
    },
    // 其他动态配置
    extra: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  // 说明
  description: {
    type: String,
    default: ''
  },
  // 状态（active/inactive）
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  // 创建者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // 默认模型（用于工作区默认选择）
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// 确保只有一个默认模型
aiModelSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await mongoose.model('AiModel').updateMany(
      { _id: { $ne: this._id }, isDefault: true },
      { $set: { isDefault: false } }
    );
  }
  next();
});

const AiModel = mongoose.model('AiModel', aiModelSchema);

module.exports = AiModel;