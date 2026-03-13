const mongoose = require('mongoose');

const baseDataSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['country', 'category', 'grade', 'priceUnit', 'timeoutConfig', 'trackingUrl', 'influencerCategory']
  },
  code: {
    type: String,
    trim: true
  },
  englishName: {
    type: String,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed
  },
  description: {
    type: String,
    trim: true
  },
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

baseDataSchema.index({ type: 1, companyId: 1 });
baseDataSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model('BaseData', baseDataSchema);
