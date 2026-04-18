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
  // ★ 改为 ObjectId ref Product（原来是String存TikTok商品ID）
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    comment: '商品ID（ObjectId引用Product）'
  },
  // ★ 新增，替换原来的 influencerAccount (String)
  influencerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Influencer',
    required: false,
    comment: '达人ID（ObjectId引用Influencer）'
  },
  // ★ 替换原来的 salesman (String/ObjectId混合)
  salesmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    comment: '归属业务员ID'
  },
  shippingInfo: {
    type: String,
    comment: '收货信息'
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
  // ★ 移到Video表：videoLink, videoStreamCode
  // 保留 isAdPromotion 作为样品级别的快捷标记
  isAdPromotion: {
    type: Boolean,
    default: false,
    comment: '是否投流（快捷标记）'
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
  // 重复提交统计
  duplicateCount: {
    type: Number,
    default: 0,
    comment: '重复提交次数（相同商品+达人）'
  },
  previousSubmissions: {
    type: [
      {
        sampleId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'SampleManagement',
          comment: '样品记录ID'
        },
        date: {
          type: Date,
          comment: '提交日期'
        },
        createdAt: {
          type: Date,
          comment: '创建时间'
        }
      }
    ],
    default: [],
    comment: '同品上次提交记录'
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

// ★ 唯一索引改为 {companyId, date, influencerId, productId}
sampleManagementSchema.index({ companyId: 1, date: 1, influencerId: 1, productId: 1 }, { unique: true });

// 辅助索引
sampleManagementSchema.index({ companyId: 1, influencerId: 1 });
sampleManagementSchema.index({ companyId: 1, productId: 1 });
sampleManagementSchema.index({ companyId: 1, isSampleSent: 1 });
sampleManagementSchema.index({ companyId: 1, isOrderGenerated: 1 });
sampleManagementSchema.index({ companyId: 1, salesmanId: 1 });

const SampleManagement = mongoose.model('SampleManagement', sampleManagementSchema);

module.exports = SampleManagement;
