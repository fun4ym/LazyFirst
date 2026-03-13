const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  tikTokActivityId: {
    type: String,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['self_initiated', 'merchant_initiated'],
    default: 'self_initiated'
  },
  partnerCenter: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  budget: {
    type: Number,
    default: 0,
    min: 0
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'upcoming', 'active', 'ended'],
    default: 'pending'
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

activitySchema.index({ companyId: 1, createdAt: -1 });
activitySchema.index({ status: 1 });

module.exports = mongoose.model('Activity', activitySchema);
