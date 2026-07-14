/**
 * 通过商品名称匹配迁移孤立样品记录 (处理重复键)
 */
const mongoose = require('mongoose');
mongoose.connect('mongodb://tapsystem:5Qb0Q9WqztimCNuzfVoX@mongodb:27017/tap_system?authSource=tap_system');
const Sample = require('./models/SampleManagement');
const Product = require('./models/Product');

async function migrateByName() {
  console.log('开始通过商品名称匹配迁移...');
  
  // 先获取所有product name -> tiktokProductId 映射
  const products = await Product.find({}, { name: 1, tiktokProductId: 1 });
  const nameMap = {};
  products.forEach(p => { if(p.name) nameMap[p.name] = p.tiktokProductId || p._id.toString(); });
  console.log('商品映射表:', Object.keys(nameMap).length, '条');
  
  // 找到孤立记录 (productId 是24位十六进制)
  const orphans = await Sample.find({ productId: { $regex: '^[0-9a-fA-F]{24}$' } });
  console.log('孤立记录:', orphans.length, '条');
  
  let updated = 0, deleted = 0, skipped = 0;
  for (const s of orphans) {
    const newId = nameMap[s.productName];
    if (newId) {
      try {
        // 先检查是否已存在相同记录
        const existing = await Sample.findOne({
          companyId: s.companyId,
          date: s.date,
          influencerAccount: s.influencerAccount,
          productId: newId,
          _id: { $ne: s._id }
        });
        
        if (existing) {
          // 存在重复，删除当前记录
          await Sample.deleteOne({ _id: s._id });
          deleted++;
        } else {
          await Sample.updateOne({ _id: s._id }, { productId: newId });
          updated++;
        }
      } catch (e) {
        if (e.code === 11000) {
          // 重复键错误，删除当前记录
          await Sample.deleteOne({ _id: s._id });
          deleted++;
        } else {
          throw e;
        }
      }
    } else {
      await Sample.deleteOne({ _id: s._id });
      deleted++;
    }
  }
  console.log('完成 - 更新:', updated, '删除重复:', deleted, '跳过:', skipped);
  await mongoose.disconnect();
}

migrateByName().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
