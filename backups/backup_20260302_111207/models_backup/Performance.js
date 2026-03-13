const mongoose = require('mongoose');

const performanceSchema = new mongoose.Schema({
  summaryDate: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  gmv: {
    type: Number,
    default: 0,
    min: 0
  },
  orderCount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalProfit: {
    type: Number,
    default: 0,
    min: 0
  },
  commissionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  commissionType: {
    type: String,
    enum: ['fixed', 'tiered'],
    default: 'fixed'
  },
  commissionAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved'],
    default: 'pending'
  },
  remark: {
    type: String,
    trim: true
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
}, {
  timestamps: true
});

performanceSchema.index({ summaryDate: 1, userId: 1, companyId: 1 });
performanceSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model('Performance', performanceSchema);
