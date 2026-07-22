const mongoose = require('mongoose');

const influencerMonthlyStatSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  influencerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Influencer',
    required: true
  },
  month: {
    type: String,
    required: true
  },
  // 成交订单（所有订单）数量
  totalOrders: {
    type: Number,
    default: 0
  },
  // 未打款订单（有但无打款时间或打款单号）数量
  unpaidOrders: {
    type: Number,
    default: 0
  },
  // 成交订单总金额
  totalAmount: {
    type: Number,
    default: 0
  },
  // 未打款订单总金额
  unpaidAmount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// 每个influencer每个月最多一条记录
influencerMonthlyStatSchema.index(
  { companyId: 1, influencerId: 1, month: 1 },
  { unique: true }
);

module.exports = mongoose.model('InfluencerMonthlyStat', influencerMonthlyStatSchema);
