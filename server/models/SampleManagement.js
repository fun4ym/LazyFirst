const mongoose = require('mongoose');

const sampleManagementSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  // Excel导入字段
  date: {
    type: Date,
    required: true,
    comment: '日期'
  },
  productName: {
    type: String,
    required: true,
    comment: '商品名称'
  },
  productId: {
    type: String,  // 存 TikTok 商品 ID（String），用于展示
    required: true,
    comment: 'TikTok商品ID'
  },
  influencerAccount: {
    type: String,
    required: true,
    comment: '达人账号'
  },
  followerCount: {
    type: Number,
    default: 0,
    comment: '粉丝数'
  },
  // 月销件数
  monthlySalesCount: {
    type: Number,
    default: 0,
    comment: '月销件数'
  },
  // 视频均播
  avgVideoViews: {
    type: Number,
    default: 0,
    comment: '视频均播'
  },
  salesman: {
    type: String,
    comment: '归属业务员ID'
  },
  shippingInfo: {
    type: String,
    comment: '收货信息'
  },
  sampleImage: {
    type: String,
    comment: '样品图片URL'
  },
  isSampleSent: {
    type: Boolean,
    default: false,
    comment: '是否寄样（兼容旧数据）'
  },
  // 寄样状态：pending-待审核, shipping-寄样中, sent-已寄样, refused-不合作
  sampleStatus: {
    type: String,
    enum: ['pending', 'shipping', 'sent', 'refused'],
    default: 'pending',
    comment: '寄样状态'
  },
  // 不合作原因
  refusalReason: {
    type: String,
    comment: '不合作原因'
  },
  // 寄样状态更新记录
  sampleStatusUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    comment: '寄样状态更新人'
  },
  sampleStatusUpdatedAt: {
    type: Date,
    comment: '寄样状态更新时间'
  },
  trackingNumber: {
    type: String,
    comment: '发货单号'
  },
  shippingDate: {
    type: Date,
    comment: '发货日期'
  },
  logisticsCompany: {
    type: String,
    comment: '物流公司'
  },
  receivedDate: {
    type: Date,
    comment: '收样日期'
  },
  fulfillmentTime: {
    type: String,
    comment: '履约时间'
  },
  videoLink: {
    type: String,
    comment: '达人视频链接'
  },
  videoStreamCode: {
    type: String,
    comment: '视频推流码'
  },
  isAdPromotion: {
    type: Boolean,
    default: false,
    comment: '是否投流'
  },
  adPromotionTime: {
    type: Date,
    comment: '投流时间'
  },
  isOrderGenerated: {
    type: Boolean,
    default: false,
    comment: '是否出单'
  },
  // 履约信息更新记录
  fulfillmentUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    comment: '履约信息更新人'
  },
  fulfillmentUpdatedAt: {
    type: Date,
    comment: '履约信息更新时间'
  },
  // 投流信息更新记录
  adPromotionUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    comment: '投流信息更新人'
  },
  adPromotionUpdatedAt: {
    type: Date,
    comment: '投流信息更新时间'
  },
  // 系统字段
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    comment: '创建人'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 唯一索引：日期 + 达人账号 + 商品ID
sampleManagementSchema.index({ companyId: 1, date: 1, influencerAccount: 1, productId: 1 }, { unique: true });

// 辅助索引
sampleManagementSchema.index({ companyId: 1, influencerAccount: 1 });
sampleManagementSchema.index({ companyId: 1, productId: 1 });
sampleManagementSchema.index({ companyId: 1, isSampleSent: 1 });
sampleManagementSchema.index({ companyId: 1, isOrderGenerated: 1 });

const SampleManagement = mongoose.model('SampleManagement', sampleManagementSchema);

module.exports = SampleManagement;
