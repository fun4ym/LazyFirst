const mongoose = require('mongoose');

const reportOrderSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  influencerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Influencer'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Excel导入字段
  orderNo: {
    type: String
  },
  subOrderNo: {
    type: String
  },
  influencerUsername: {
    type: String
  },
  productId: {
    type: String
  },
  productName: {
    type: String
  },
  sku: {
    type: String
  },
  productPrice: {
    type: Number
  },
  orderQuantity: {
    type: Number,
    default: 0
  },
  shopName: {
    type: String
  },
  shopCode: {
    type: String
  },
  orderStatus: {
    type: String
  },
  contentType: {
    type: String
  },
  contentId: {
    type: String
  },
  // 佣金率字段
  affiliatePartnerCommissionRate: {
    type: Number,
    default: 0
  },
  creatorCommissionRate: {
    type: Number,
    default: 0
  },
  serviceProviderRewardCommissionRate: {
    type: Number,
    default: 0
  },
  influencerRewardCommissionRate: {
    type: Number,
    default: 0
  },
  affiliateServiceProviderShopAdCommissionRate: {
    type: Number,
    default: 0
  },
  influencerShopAdCommissionRate: {
    type: Number,
    default: 0
  },
  // 预计佣金
  estimatedCommissionAmount: {
    type: Number,
    default: 0
  },
  estimatedAffiliatePartnerCommission: {
    type: Number,
    default: 0
  },
  estimatedServiceProviderRewardCommission: {
    type: Number,
    default: 0
  },
  estimatedInfluencerRewardCommission: {
    type: Number,
    default: 0
  },
  estimatedCreatorCommission: {
    type: Number,
    default: 0
  },
  estimatedInfluencerShopAdPayment: {
    type: Number,
    default: 0
  },
  estimatedAffiliateServiceProviderShopAdPayment: {
    type: Number,
    default: 0
  },
  // 实际佣金
  actualCommissionAmount: {
    type: Number,
    default: 0
  },
  actualAffiliatePartnerCommission: {
    type: Number,
    default: 0
  },
  actualCreatorCommission: {
    type: Number,
    default: 0
  },
  actualServiceProviderRewardCommission: {
    type: Number,
    default: 0
  },
  actualInfluencerRewardCommission: {
    type: Number,
    default: 0
  },
  actualAffiliateServiceProviderShopAdPayment: {
    type: Number,
    default: 0
  },
  actualInfluencerShopAdPayment: {
    type: Number,
    default: 0
  },
  // 退货退款
  returnedProductCount: {
    type: Number,
    default: 0
  },
  refundedProductCount: {
    type: Number,
    default: 0
  },
  // 时间字段
  summaryDate: {
    type: String,
    required: true,
    trim: true
  },
  createTime: {
    type: Date
  },
  orderDeliveryTime: {
    type: Date
  },
  commissionSettlementTime: {
    type: Date
  },
  // 打款信息
  paymentNo: {
    type: String
  },
  paymentMethod: {
    type: String
  },
  paymentAccount: {
    type: String
  },
  // 其他
  iva: {
    type: String
  },
  isr: {
    type: String
  },
  platform: {
    type: String,
    default: 'tiktok'
  },
  attributionType: {
    type: String
  },
  // 原有字段保持兼容
  merchandiser: {
    type: String,
    trim: true
  },
  bdName: {
    type: String,
    trim: true,
    comment: '归属BD'
  },
  orderCount: {
    type: Number,
    default: 0,
    min: 0
  },
  gmv: {
    type: Number,
    default: 0,
    min: 0
  },
  groupInfo: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true
  },
  // 黑名单标记
  isBlacklistedInfluencer: {
    type: Boolean,
    default: false,
    comment: '标记该订单的达人是否为黑名单'
  },
  // 结算标记
  settlementStatus: {
    type: String,
    enum: ['未结清', '已结清'],
    default: '未结清',
    comment: '结算标记：未结清/已结清'
  },
  // 结清账单号
  settlementBillNo: {
    type: String,
    default: '',
    comment: '结清账单号'
  }
}, {
  timestamps: true
});

reportOrderSchema.index({ summaryDate: 1, companyId: 1 });
reportOrderSchema.index({ companyId: 1, createdAt: -1 });
reportOrderSchema.index({ companyId: 1, commissionSettlementTime: -1 });
// 复合唯一索引：订单ID + 子订单ID + 公司ID
reportOrderSchema.index({ orderNo: 1, subOrderNo: 1, companyId: 1 }, { unique: true });

module.exports = mongoose.model('ReportOrder', reportOrderSchema);
