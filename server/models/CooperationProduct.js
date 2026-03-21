const mongoose = require('mongoose');

const cooperationProductSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  platform: { type: String, default: 'tiktok' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CooperationProduct', cooperationProductSchema);
