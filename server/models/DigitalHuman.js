const mongoose = require('mongoose');

const digitalHumanSchema = new mongoose.Schema({
  // 数字人名称
  name: {
    type: String,
    required: true,
    trim: true
  },
  // 描述
  description: {
    type: String,
    default: ''
  },
  // 头像/形象图片URL（主参考图，取references[0]）
  avatar: {
    type: String,
    default: ''
  },
  // 参考图/视频URL列表（支持多个）
  references: {
    type: [String],
    default: []
  },
  // 配置（声音、形象参数等）
  config: {
    // 声音配置
    voice: {
      type: String,
      default: ''
    },
    voiceSpeed: {
      type: Number,
      default: 1.0
    },
    // 形象配置
    appearance: {
      type: String,
      default: ''
    },
    style: {
      type: String,
      default: 'realistic'
    },
    // 其他动态配置
    extra: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
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
  // 关联的AI模型（可选）
  aiModelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AiModel'
  }
}, {
  timestamps: true
});

const DigitalHuman = mongoose.model('DigitalHuman', digitalHumanSchema);

module.exports = DigitalHuman;