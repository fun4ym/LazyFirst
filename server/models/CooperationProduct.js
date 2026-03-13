const mongoose = require('mongoose');

// 活动佣金配置子文档
const activityCommissionSchema = new mongoose.Schema({
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    required: true
  },
  influencerCommissionRate: {
    type: Number,
    default: 0
  },
  tapCommissionRate: {
    type: Number,
    default: 0
  },
  bdCommissionRate: {
    type: Number,
    default: 0
  },
  businessCommissionRate: {
    type: Number,
    default: 0
  }
}, { _id: true });

const cooperationProductSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  // TikTok shop信息
  productId: {
    type: String,
    required: true,
    trim: true
  },
  productName: {
    type: String,
    default: '',
    trim: true
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    default: null
  },
  productCategory: {
    type: String,
    default: '',
    trim: true
  },
  squareCommissionRate: {
    type: Number,
    default: 0
  },
  // 样品信息
  productGrade: {
    type: String,
    enum: ['ordinary', 'hot', 'main', 'new'],
    default: 'ordinary'
  },
  tapExclusiveLink: {
    type: String,
    default: '',
    trim: true
  },
  sampleMethod: {
    type: String,
    default: '',
    trim: true
  },
  cooperationCountry: {
    type: String,
    default: '',
    trim: true
  },
  sampleTarget: {
    type: String,
    default: '',
    trim: true
  },
  influencerRequirement: {
    type: String,
    default: '',
    trim: true
  },
  // 商品信息
  productImages: [{
    type: String
  }],
  productIntro: {
    type: String,
    default: '',
    trim: true
  },
  referenceVideo: {
    type: String,
    default: '',
    trim: true
  },
  sellingPoints: {
    type: String,
    default: '',
    trim: true
  },
  // 活动佣金配置 - 一个产品可以参与多个活动
  activityCommissions: [activityCommissionSchema],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

cooperationProductSchema.index({ companyId: 1, productId: 1 });
cooperationProductSchema.index({ companyId: 1, status: 1 });

// 验证同一产品不能参与同一活动多次
cooperationProductSchema.pre('save', function(next) {
  const activityIds = this.activityCommissions.map(ac => ac.activityId.toString());
  const uniqueIds = [...new Set(activityIds)];
  if (activityIds.length !== uniqueIds.length) {
    next(new Error('同一产品不能重复参与同一活动'));
  }
  next();
});

const CooperationProduct = mongoose.model('CooperationProduct', cooperationProductSchema);

module.exports = CooperationProduct;
