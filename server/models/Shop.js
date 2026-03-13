const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  // TikTok店铺信息
  avatar: {
    type: String,
    default: ''
  },
  shopName: {
    type: String,
    required: true,
    trim: true
  },
  shopNumber: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    sparse: true
  },
  contactAddress: {
    type: String,
    default: '',
    trim: true
  },
  remark: {
    type: String,
    default: '',
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

shopSchema.index({ companyId: 1, shopNumber: 1 });
shopSchema.index({ companyId: 1, shopName: 1 });
shopSchema.index({ companyId: 1, status: 1 });

const Shop = mongoose.model('Shop', shopSchema);

module.exports = Shop;
