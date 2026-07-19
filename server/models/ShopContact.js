const mongoose = require('mongoose');

const shopContactSchema = new mongoose.Schema({
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
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  trackerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  trackerName: {
    type: String,
    default: ''
  },
  // LINE 绑定（供应端卖家；方案A：lineBindingToken 绑定码；linkToken 预留方案B）
  lineUserId: {
    type: String,
    default: ''
  },
  lineBindingToken: {
    type: String,
    default: ''
  },
  linkToken: {
    type: String,
    default: ''
  },
  lineBoundAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

shopContactSchema.index({ companyId: 1, shopId: 1 });
shopContactSchema.index({ companyId: 1, lineUserId: 1 });

const ShopContact = mongoose.model('ShopContact', shopContactSchema);

module.exports = ShopContact;
