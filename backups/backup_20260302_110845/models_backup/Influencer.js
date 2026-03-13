const mongoose = require('mongoose');

const influencerSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  tiktokInfo: {
    cid: String,
    partnerCenterId: String,
    tiktokId: String,
    username: String,
    displayName: String,
    avatar: String
  },
  crmInfo: {
    poolType: {
      type: String,
      enum: ['public', 'private'],
      default: 'public'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedAt: Date,
    lastActivityAt: Date
  },
  basicInfo: {
    realName: String,
    phone: String,
    wechat: String,
    email: String,
    address: String,
    country: String
  },
  statistics: {
    followers: {
      type: Number,
      default: 0
    },
    gmv: {
      type: Number,
      default: 0
    },
    avgViews: {
      type: Number,
      default: 0
    },
    avgSales: {
      type: Number,
      default: 0
    }
  },
  tags: [String],
  expertise: [String],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// 索引
influencerSchema.index({ companyId: 1, 'crmInfo.poolType': 1 });
influencerSchema.index({ companyId: 1, 'crmInfo.assignedTo': 1 });
influencerSchema.index({ companyId: 1, 'tiktokInfo.cid': 1 });

const Influencer = mongoose.model('Influencer', influencerSchema);

module.exports = Influencer;
