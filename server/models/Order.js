const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  influencerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Influencer'
  },
  // Excel导入字段
  orderNo: {
    type: String,
    required: true
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
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  products: [{
    productId: mongoose.Schema.Types.ObjectId,
    productName: String,
    quantity: Number,
    unitPrice: Number,
    totalAmount: Number
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  commissionRate: {
    type: Number,
    default: 0.15
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// 索引
orderSchema.index({ companyId: 1, influencerId: 1 });
orderSchema.index({ companyId: 1, orderNo: 1 });
orderSchema.index({ companyId: 1, status: 1 });
orderSchema.index({ companyId: 1, createTime: -1 });
orderSchema.index({ companyId: 1, commissionSettlementTime: -1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
