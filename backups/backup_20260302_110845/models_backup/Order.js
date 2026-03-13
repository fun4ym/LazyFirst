const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
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
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  },
  orderNo: {
    type: String,
    required: true,
    unique: true
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  platform: {
    type: String,
    default: 'tiktok'
  },
  products: [{
    productId: mongoose.Schema.Types.ObjectId,
    productName: String,
    quantity: Number,
    unitPrice: Number,
    totalAmount: Number
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  commissionRate: {
    type: Number,
    default: 0.15
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// 索引
orderSchema.index({ companyId: 1, influencerId: 1 });
orderSchema.index({ companyId: 1, orderNo: 1 });
orderSchema.index({ companyId: 1, status: 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
