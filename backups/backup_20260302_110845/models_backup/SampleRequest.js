const mongoose = require('mongoose');

const sampleRequestSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  influencerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Influencer',
    required: true
  },
  registrarId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  applicantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  // TikTok Partner Center同步状态
  tiktokSync: {
    isSynced: {
      type: Boolean,
      default: false
    },
    syncDate: Date,
    campaignId: String,
    tiktokSampleId: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'shipped', 'rejected', 'received'],
    default: 'pending'
  },
  feedback: {
    result: {
      type: String,
      enum: ['approved', 'rejected']
    },
    feedbackBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    feedbackAt: Date,
    remark: String
  }
}, {
  timestamps: true
});

// 索引
sampleRequestSchema.index({ companyId: 1, registrarId: 1 });
sampleRequestSchema.index({ companyId: 1, influencerId: 1 });
sampleRequestSchema.index({ companyId: 1, status: 1 });
sampleRequestSchema.index({ companyId: 1, 'tiktokSync.isSynced': 1 });

const SampleRequest = mongoose.model('SampleRequest', sampleRequestSchema);

module.exports = SampleRequest;
