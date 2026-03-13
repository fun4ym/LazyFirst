const mongoose = require('mongoose');

const bdDailySchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    comment: '公司ID'
  },
  // 统计日期
  date: {
    type: Date,
    required: true,
    comment: '日期'
  },
  // BD信息
  salesman: {
    type: String,
    required: true,
    comment: 'BD姓名'
  },
  // 申样统计
  sampleCount: {
    type: Number,
    default: 0,
    comment: '本日申样数'
  },
  sampleIds: {
    type: String,
    comment: '申样记录ID，逗号分隔'
  },
  // 收入统计
  revenue: {
    type: Number,
    default: 0,
    comment: '本日收入（GMV）'
  },
  revenueIds: {
    type: String,
    comment: '收入记录ID（订单ID），逗号分隔'
  },
  // 订单统计
  orderCount: {
    type: Number,
    default: 0,
    comment: '本日订单数'
  },
  commission: {
    type: Number,
    default: 0,
    comment: '本日佣金'
  },
  // 附加统计信息
  orderGeneratedCount: {
    type: Number,
    default: 0,
    comment: '本日出单数'
  },
  // 系统字段
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    comment: '创建人'
  },
  updaterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    comment: '更新人'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    comment: '创建时间'
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    comment: '更新时间'
  },
  remark: {
    type: String,
    comment: '备注'
  }
}, {
  timestamps: true
});

// 唯一索引：公司 + 日期 + BD
bdDailySchema.index({ companyId: 1, date: 1, salesman: 1 }, { unique: true });

// 辅助索引
bdDailySchema.index({ companyId: 1, date: -1 });
bdDailySchema.index({ companyId: 1, salesman: 1 });
bdDailySchema.index({ companyId: 1, createdAt: -1 });

const BdDaily = mongoose.model('BdDaily', bdDailySchema);

module.exports = BdDaily;
