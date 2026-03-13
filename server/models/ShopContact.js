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
  }
}, {
  timestamps: true
});

shopContactSchema.index({ companyId: 1, shopId: 1 });

const ShopContact = mongoose.model('ShopContact', shopContactSchema);

module.exports = ShopContact;
