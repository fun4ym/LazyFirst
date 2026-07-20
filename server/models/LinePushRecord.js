// LINE 主动推送发送记录
// 记录每次人工发起的「活动推送 / 新品推送」，供前端「发送记录」弹层查询。
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LinePushRecordSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  // campaign = 活动推送；product = 新品推送
  type: { type: String, enum: ['campaign', 'product'], required: true, index: true },
  // 关联对象 id：活动 id 或 商品 id
  refId: { type: Schema.Types.ObjectId, required: false },
  // 关联对象名称（冗余存储，便于列表展示，避免联表）
  refName: { type: String, default: '' },
  operatorId: { type: Schema.Types.ObjectId, ref: 'User' },
  operatorName: { type: String, default: '' },
  mode: { type: String, enum: ['multicast', 'narrowcast'], default: 'multicast' },
  // 受众筛选条件（标签 id / 品类 id / 粉丝区间），前端用 base-data 解析为名称
  audienceCriteria: { type: Object, default: {} },
  recipientCount: { type: Number, default: 0 },
  status: { type: String, enum: ['success', 'failed', 'partial'], default: 'success' },
  error: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('LinePushRecord', LinePushRecordSchema);
