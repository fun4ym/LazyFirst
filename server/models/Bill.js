const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  // 账单号
  billNo: {
    type: String,
    required: true,
    unique: true
  },
  // 有效日期区间
  validStartDate: {
    type: Date,
    required: true
  },
  validEndDate: {
    type: Date,
    required: true
  },
  // 佣金总金额
  totalCommission: {
    type: Number,
    default: 0
  },
  // 是否结清
  isSettled: {
    type: Boolean,
    default: false
  },
  // 结算时间
  settlementTime: {
    type: Date
  },
  // 结算备注（多条记录）
  settlementNotes: [{
    bdName: String,
    bankAccount: String,
    bankFlowNo: String,
    note: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // 包含的订单数量
  orderCount: {
    type: Number,
    default: 0
  },
  // 包含的BD列表
  bdList: [{
    bdName: String,
    commission: Number,
    orderCount: Number
  }],
  // 创建人
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// 生成账单号
billSchema.statics.generateBillNo = async function(companyId) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // 获取当天已生成的账单数量
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));
  
  const count = await this.countDocuments({
    companyId,
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  });
  
  const seq = String(count + 1).padStart(4, '0');
  return `BILL${year}${month}${day}${seq}`;
};

billSchema.index({ companyId: 1, createdAt: -1 });
billSchema.index({ billNo: 1 }, { unique: true });

module.exports = mongoose.model('Bill', billSchema);
