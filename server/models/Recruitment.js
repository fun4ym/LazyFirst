const mongoose = require('mongoose');

const recruitmentSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  // 招募名称
  name: {
    type: String,
    required: true,
    trim: true
  },
  // 简介
  description: {
    type: String,
    default: ''
  },
  // 是否强要求（满足所有条件才能参与）
  isStrict: {
    type: Boolean,
    default: false
  },
  // GMV要求
  requirementGmv: {
    type: Number,
    default: 0
  },
  // 粉丝数要求(K)
  requirementFollowers: {
    type: Number,
    default: 0
  },
  // 月销件数要求
  requirementMonthlySales: {
    type: Number,
    default: 0
  },
  // 视频均播要求
  requirementAvgViews: {
    type: Number,
    default: 0
  },
  // 包含产品（关联Product）
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  // 可调用人员（关联User，默认所有人可调用则为空数组）
  callableUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // 启用状态
  enabled: {
    type: Boolean,
    default: true
  },
  // 新增人
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // 最后编辑人
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // 识别码
  identificationCode: {
    type: String,
    default: ''
  },
  // 页面样式配置
  pageStyle: {
    layoutStyle: {
      type: String,
      default: 'style1'
    },
    themeColor: {
      type: String,
      default: '#775999'
    }
  }
}, {
  timestamps: true
});

// 索引
recruitmentSchema.index({ companyId: 1, enabled: 1 });
recruitmentSchema.index({ name: 'text', description: 'text' });

const Recruitment = mongoose.model('Recruitment', recruitmentSchema);

module.exports = Recruitment;
