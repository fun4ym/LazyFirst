const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['sample', 'product', 'logistics'],
    required: true
  },
  contact: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  address: {
    type: String,
    trim: true
  },
  remarks: {
    type: String,
    default: '',
    trim: true
  }
}, {
  timestamps: true
});

// 索引
supplierSchema.index({ companyId: 1, name: 1 });
supplierSchema.index({ companyId: 1, type: 1 });
supplierSchema.index({ companyId: 1, contact: 1 });
supplierSchema.index({ companyId: 1, phone: 1 });
supplierSchema.index({ companyId: 1, createdAt: -1 });

const Supplier = mongoose.model('Supplier', supplierSchema);

module.exports = Supplier;