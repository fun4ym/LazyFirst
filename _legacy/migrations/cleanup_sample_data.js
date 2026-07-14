/**
 * 数据清理脚本
 * 1. 删除无法按名称匹配的孤立记录
 * 2. 根据 productId + date + influencerAccount 去重，保留 sampleStatus 权重最高的记录
 *    权重: pending < sent < received = refused
 */
const mongoose = require('mongoose');
mongoose.connect('mongodb://tapsystem:5Qb0Q9WqztimCNuzfVoX@mongodb:27017/tap_system?authSource=tap_system');
const Sample = require('./models/SampleManagement');
const Product = require('./models/Product');

// 状态权重映射
const STATUS_WEIGHT = {
  'pending': 0,
  'sent': 1,
  'received': 2,
  'refused': 2,
  'default': -1
};

function getWeight(status) {
  return STATUS_WEIGHT[status] ?? STATUS_WEIGHT['default'];
}

async function cleanData() {
  console.log('=== 步骤1: 删除无法匹配的孤立记录 ===');
  
  // 先获取所有 product name -> tiktokProductId 映射
  const products = await Product.find({}, { name: 1, tiktokProductId: 1 });
  const nameMap = {};
  products.forEach(p => { if(p.name) nameMap[p.name] = p.tiktokProductId || p._id.toString(); });
  console.log('商品映射表:', Object.keys(nameMap).length, '条');

  // 找到孤立记录 (productId 是24位十六进制)
  const orphans = await Sample.find({ productId: { $regex: '^[0-9a-fA-F]{24}$' } });
  console.log('孤立记录:', orphans.length, '条');

  let deletedOrphans = 0;
  for (const s of orphans) {
    const newId = nameMap[s.productName];
    if (!newId) {
      await Sample.deleteOne({ _id: s._id });
      deletedOrphans++;
    }
  }
  console.log('已删除无法匹配的孤立记录:', deletedOrphans, '条');

  console.log('\n=== 步骤2: 去重处理 ===');
  
  // 统计当前有效记录数量
  const totalBefore = await Sample.countDocuments();
  console.log('去重前总记录数:', totalBefore);

  // 获取所有记录并按分组
  const allSamples = await Sample.find({});
  
  // 按 (productId, date, influencerAccount) 分组
  const groups = {};
  for (const s of allSamples) {
    const key = `${s.productId}|${s.date}|${s.influencerAccount}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }

  // 找出有重复的组
  const duplicateKeys = Object.keys(groups).filter(k => groups[k].length > 1);
  console.log('发现重复组数:', duplicateKeys.length);

  let deletedDuplicates = 0;
  let keptRecords = 0;

  for (const key of duplicateKeys) {
    const records = groups[key];
    
    // 按权重排序，权重高的排前面
    records.sort((a, b) => getWeight(b.sampleStatus) - getWeight(a.sampleStatus));

    // 保留第一条（权重最高的），删除其余
    const keep = records[0];
    const toDelete = records.slice(1);

    for (const r of toDelete) {
      await Sample.deleteOne({ _id: r._id });
      deletedDuplicates++;
    }
    keptRecords++;
  }

  const totalAfter = await Sample.countDocuments();
  console.log('\n=== 清理完成 ===');
  console.log('删除孤立记录:', deletedOrphans);
  console.log('删除重复记录:', deletedDuplicates);
  console.log('保留记录数:', keptRecords);
  console.log('去重后总记录数:', totalAfter);
  console.log('实际减少:', totalBefore - totalAfter);

  await mongoose.disconnect();
}

cleanData().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
