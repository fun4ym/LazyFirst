/**
 * 迁移脚本：根据 samplemanagements 的 productId (TikTokID) 
 * 从 Product 表获取 shopId 并更新
 * 
 * 问题：samplemanagements.productId 已经是 TikTok 商品 ID
 * 但 shopId 字段为空，需要根据 productId 关联 Product 表补充
 * 
 * 运行方式：node migrate_sample_shopId.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tap_system';

async function migrate() {
  console.log('=== 开始迁移样品 shopId ===');
  console.log('连接数据库:', MONGODB_URI);
  
  await mongoose.connect(MONGODB_URI);
  console.log('数据库连接成功');
  
  const db = mongoose.connection.db;
  
  // 1. 统计需要迁移的记录（productId 有值但 shopId 为空）
  const total = await db.collection('samplemanagements').countDocuments({});
  const withShopId = await db.collection('samplemanagements').countDocuments({ 
    shopId: { $exists: true, $ne: null } 
  });
  const needMigrate = total - withShopId;
  
  console.log(`\n统计结果:`);
  console.log(`- 总样品记录: ${total}`);
  console.log(`- 已有 shopId: ${withShopId}`);
  console.log(`- 需要补充 shopId: ${needMigrate}`);
  
  if (needMigrate === 0) {
    console.log('\n没有需要迁移的记录，退出');
    await mongoose.disconnect();
    return;
  }
  
  // 2. 获取所有 productId (TikTokID)
  const samples = await db.collection('samplemanagements').find({
    productId: { $exists: true, $ne: null },
    $or: [
      { shopId: { $exists: false } },
      { shopId: null }
    ]
  }).project({ productId: 1, _id: 1 }).toArray();
  
  const productIds = samples.map(s => String(s.productId));
  console.log(`- 需要查询的 productId 数量: ${productIds.length}`);
  
  // 3. 查找 Product 表获取 tiktokProductId -> shopId 映射
  const products = await db.collection('products').find({
    tiktokProductId: { $in: productIds }
  }).project({ tiktokProductId: 1, shopId: 1 }).toArray();
  
  const tiktokToShop = {};
  products.forEach(p => {
    if (p.shopId) {
      tiktokToShop[String(p.tiktokProductId)] = p.shopId;
    }
  });
  
  console.log(`- Product 表中找到对应记录: ${products.length}`);
  
  // 4. 更新 samplemanagements 表
  let updatedCount = 0;
  let skippedCount = 0;
  let notFoundCount = 0;
  
  for (const sample of samples) {
    const productId = String(sample.productId);
    const shopId = tiktokToShop[productId];
    
    if (shopId) {
      try {
        await db.collection('samplemanagements').updateOne(
          { _id: sample._id },
          { $set: { shopId: shopId } }
        );
        updatedCount++;
        
        if (updatedCount <= 5) {
          console.log(`  [${updatedCount}] 更新: sample=${sample._id} -> shopId=${shopId}`);
        }
      } catch (err) {
        console.error(`  更新失败: ${sample._id}`, err.message);
      }
    } else {
      notFoundCount++;
      if (notFoundCount <= 5) {
        console.log(`  [NOT_FOUND] productId=${productId} 在Product表中未找到`);
      }
    }
  }
  
  // 5. 验证结果
  console.log(`\n迁移完成:`);
  console.log(`- 成功更新 shopId: ${updatedCount} 条`);
  console.log(`- 未找到对应Product: ${notFoundCount} 条`);
  
  // 6. 最终统计
  const afterWithShopId = await db.collection('samplemanagements').countDocuments({ 
    shopId: { $exists: true, $ne: null } 
  });
  
  console.log(`\n验证结果:`);
  console.log(`- 迁移前有 shopId: ${withShopId} 条`);
  console.log(`- 迁移后有 shopId: ${afterWithShopId} 条`);
  console.log(`- 新增 shopId: ${afterWithShopId - withShopId} 条`);
  
  await mongoose.disconnect();
  console.log('\n数据库连接已关闭');
}

migrate().catch(err => {
  console.error('迁移失败:', err);
  process.exit(1);
});
