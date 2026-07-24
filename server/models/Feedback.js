const mongoose = require('mongoose');
const { Schema } = mongoose;

// 达人通过官方 LINE 提交的意见反馈
const feedbackSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  influencerId: { type: Schema.Types.ObjectId, ref: 'Influencer', required: true },
  lineUserId: { type: String, default: '' },
  content: { type: String, required: true },
  status: { type: String, enum: ['pending', 'replied'], default: 'pending' },
  reply: { type: String, default: '' },
  replyAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', feedbackSchema);
