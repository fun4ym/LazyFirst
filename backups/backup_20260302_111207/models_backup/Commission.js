const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
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
  bdId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  sampleRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SampleRequest'
  },
  orderAmount: {
    type: Number,
    required: true
  },
  commissionAmount: {
    type: Number,
    required: true
  },
  commissionRate: {
    type: Number,
    required: true
  },
  calculatedDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'settled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// 索引
commissionSchema.index({ companyId: 1, bdId: 1 });
commissionSchema.index({ companyId: 1, status: 1 });
commissionSchema.index({ companyId: 1, orderId: 1 });

const Commission = mongoose.model('Commission', commissionSchema);

module.exports = Commission;
