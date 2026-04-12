const mongoose = require('mongoose');

const pageVisitSchema = new mongoose.Schema({
  userId: {
    type: String,
    default: ''
  },
  page: {
    type: String,
    default: ''
  },
  action: {
    type: String,
    default: 'view'
  },
  productId: {
    type: String,
    default: ''
  },
  ip: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

pageVisitSchema.index({ userId: 1, createdAt: -1 });
pageVisitSchema.index({ page: 1, action: 1 });

const PageVisit = mongoose.model('PageVisit', pageVisitSchema);

module.exports = PageVisit;
