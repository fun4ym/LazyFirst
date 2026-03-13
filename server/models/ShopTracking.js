const mongoose = require('mongoose');

const shopTrackingSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  trackingDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

shopTrackingSchema.index({ companyId: 1, shopId: 1, trackingDate: -1 });

const ShopTracking = mongoose.model('ShopTracking', shopTrackingSchema);

module.exports = ShopTracking;
