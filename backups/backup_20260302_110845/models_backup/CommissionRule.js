const mongoose = require('mongoose');

const commissionRangeSchema = new mongoose.Schema({
  rangeStart: {
    type: Number,
    required: true,
    min: 0
  },
  rangeEnd: {
    type: Number,
    default: null
  },
  commissionRate: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  commissionType: {
    type: String,
    enum: ['fixed', 'tiered'],
    default: 'fixed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const commissionRuleSchema = new mongoose.Schema({
  deptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  ranges: [commissionRangeSchema],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
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

commissionRuleSchema.index({ deptId: 1, companyId: 1 });

module.exports = mongoose.model('CommissionRule', commissionRuleSchema);
