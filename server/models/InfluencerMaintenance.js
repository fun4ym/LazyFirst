const mongoose = require('mongoose');

const influencerMaintenanceSchema = new mongoose.Schema({
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
  followers: {
    type: Number,
    required: true,
    default: 0
  },
  gmv: {
    type: Number,
    required: true,
    default: 0
  },
  poolType: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  remark: {
    type: String,
    trim: true
  },
  maintainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  maintainerName: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

influencerMaintenanceSchema.index({ influencerId: 1, createdAt: -1 });
influencerMaintenanceSchema.index({ companyId: 1, maintainerId: 1 });

module.exports = mongoose.model('InfluencerMaintenance', influencerMaintenanceSchema);
