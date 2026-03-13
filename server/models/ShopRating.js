const mongoose = require('mongoose');

const shopRatingSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
    unique: true
  },
  creditRating: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  creditRemark: {
    type: String,
    default: ''
  },
  cooperationRating: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  cooperationRemark: {
    type: String,
    default: ''
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

shopRatingSchema.index({ companyId: 1, shopId: 1 });

const ShopRating = mongoose.model('ShopRating', shopRatingSchema);

module.exports = ShopRating;
