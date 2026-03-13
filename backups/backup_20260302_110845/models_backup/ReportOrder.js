const mongoose = require('mongoose');

const reportOrderSchema = new mongoose.Schema({
  summaryDate: {
    type: String,
    required: true,
    trim: true
  },
  shopName: {
    type: String,
    required: true,
    trim: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  merchandiser: {
    type: String,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  influencerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Influencer'
  },
  orderCount: {
    type: Number,
    default: 0,
    min: 0
  },
  gmv: {
    type: Number,
    default: 0,
    min: 0
  },
  groupInfo: {
    type: String,
    trim: true
  },
  country: {
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

reportOrderSchema.index({ summaryDate: 1, companyId: 1 });
reportOrderSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model('ReportOrder', reportOrderSchema);
