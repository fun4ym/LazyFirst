const mongoose = require('mongoose');

const TempIdMappingSchema = new mongoose.Schema({
  tableName: { type: String, required: true }, // 'shop' | 'product' | 'influencer'
  originalId: { type: String, required: true }, // Excel中的原始ID
  newId: { type: mongoose.Schema.Types.ObjectId, required: true }, // MongoDB生成的新ID
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
  createdAt: { type: Date, default: Date.now }
});

// 索引
TempIdMappingSchema.index({ tableName: 1, originalId: 1 }, { unique: true });
TempIdMappingSchema.index({ tableName: 1, newId: 1 });

module.exports = mongoose.model('TempIdMapping', TempIdMappingSchema);
