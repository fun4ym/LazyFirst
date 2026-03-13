const mongoose = require('mongoose');

const activityHistorySchema = new mongoose.Schema({
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['create', 'update', 'delete', 'status_change']
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  previousData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  newData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changedByName: {
    type: String
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
}, {
  timestamps: true
});

activityHistorySchema.index({ activityId: 1, createdAt: -1 });
activityHistorySchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityHistory', activityHistorySchema);
