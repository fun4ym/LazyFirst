const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  sampleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SampleManagement',
    required: false,
    default: null,
    comment: '所属样品记录（可选）'
  },
  // ★ 商品引用（ObjectId，指向Product表）
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false,
    comment: '商品引用（ObjectId）'
  },
  // TikTok商品ID（原始字符串，冗余存储）
  tiktokProductId: {
    type: String,
    required: false,
    comment: 'TikTok商品ID（原始字符串）'
  },
  influencerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Influencer',
    required: false,
    comment: '关联达人（冗余，方便直接查）'
  },
  videoLink: {
    type: String,
    default: '',
    comment: '达人视频链接'
  },
  videoStreamCode: {
    type: String,
    default: '',
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
  // 维护信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    comment: '创建人（登记人）'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    comment: '最后修改人'
  }
}, {
  timestamps: true
});

// 索引
videoSchema.index({ sampleId: 1 });
videoSchema.index({ companyId: 1, sampleId: 1 });
videoSchema.index({ companyId: 1, influencerId: 1 });
videoSchema.index({ companyId: 1, createdAt: -1 });

const Video = mongoose.model('Video', videoSchema);

module.exports = Video;
