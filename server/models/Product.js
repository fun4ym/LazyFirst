const mongoose = require('mongoose');

// 活动配置子文档（包含达人要求、样品信息、佣金配置）
const activityConfigSchema = new mongoose.Schema({
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    required: true
  },
  // 达人要求
  requirementGmv: {
    type: Number,
    default: 0
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
    default: '',
    maxlength: 1000
  },
  // 样品信息
  sampleMethod: {
    type: String,
    default: ''
  },
  cooperationCountry: {
    type: String,
    default: ''
  },
  // 推广时佣金配置
  promotionInfluencerRate: {
    type: Number,
    default: 0
  },
  promotionOriginalRate: {
    type: Number,
    default: 0
  },
  promotionCompanyRate: {
    type: Number,
    default: 0
  },
  // 投广告时佣金配置
  adInfluencerRate: {
    type: Number,
    default: 0
  },
  adOriginalRate: {
    type: Number,
    default: 0
  },
  adCompanyRate: {
    type: Number,
    default: 0
  }
}, { _id: true });

const productSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop'
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductCategory'
  },
  gradeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductGrade'
  },
  name: {
    type: String,
    required: true
  },
  sku: {
    type: String,
    required: true
  },
  tiktokSku: String,
  // TikTok shop信息（从合作产品迁移）
  tiktokProductId: String,
  productCategory: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  commissionRate: {
    type: Number,
    default: 0.15
  },
  // 广场佣金率（从合作产品迁移）
  squareCommissionRate: {
    type: Number,
    default: 0
  },
  cooperationMode: {
    commissionEnabled: {
      type: Boolean,
      default: true
    },
    sampleRequired: {
      type: Boolean,
      default: true
    },
    sampleMode: {
      type: String,
      enum: ['online', 'offline'],
      default: 'offline'
    },
    sampleRequirements: String,
    activityParticipation: {
      type: Boolean,
      default: true
    }
  },
  // 商品信息
  productGrade: {
    type: String,
    enum: ['ordinary', 'hot', 'main', 'new'],
    default: 'ordinary'
  },
  tapExclusiveLink: {
    type: String,
    default: ''
  },
  productImages: [String],
  productIntro: {
    type: String,
    default: ''
  },
  referenceVideo: {
    type: String,
    default: ''
  },
  sellingPoints: {
    type: String,
    default: ''
  },
  // 活动配置（一个商品可参与多个活动，每个活动有独立的要求和佣金）
  activityConfigs: [activityConfigSchema],
  images: [String],
  description: String,
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// 验证同一产品不能参与同一活动多次
productSchema.pre('save', function(next) {
  if (this.activityConfigs && this.activityConfigs.length > 0) {
    const activityIds = this.activityConfigs.map(ac => ac.activityId.toString());
    const uniqueIds = [...new Set(activityIds)];
    if (activityIds.length !== uniqueIds.length) {
      return next(new Error('同一产品不能重复参与同一活动'));
    }
  }
  next();
});

// 索引
productSchema.index({ companyId: 1, supplierId: 1 });
productSchema.index({ companyId: 1, storeId: 1 });
productSchema.index({ companyId: 1, sku: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
