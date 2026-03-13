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
    type: String,
    required: true,
    comment: '商品ID'
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
  salesman: {
    type: String,
    comment: '归属业务员'
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
    comment: '是否寄样'
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
