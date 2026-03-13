const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductCategory'
  },
  gradeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductGrade'
  },
  name: {
    type: String,
    required: true
  },
  sku: {
    type: String,
    required: true
  },
  tiktokSku: String,
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  commissionRate: {
    type: Number,
    default: 0.15
  },
  cooperationMode: {
    commissionEnabled: {
      type: Boolean,
      default: true
    },
    sampleRequired: {
      type: Boolean,
      default: true
    },
    sampleMode: {
      type: String,
      enum: ['online', 'offline'],
      default: 'offline'
    },
    sampleRequirements: String,
    activityParticipation: {
      type: Boolean,
      default: true
    }
  },
  images: [String],
  description: String,
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// 索引
productSchema.index({ companyId: 1, supplierId: 1 });
productSchema.index({ companyId: 1, storeId: 1 });
productSchema.index({ companyId: 1, sku: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
