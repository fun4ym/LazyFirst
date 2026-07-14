/**
 * 迁移脚本：将 samplemanagements 表中的 productId 从 ObjectId 转换为 TikTok 商品 ID
 * 同时修复 shopId 字段
 * 
 * 问题原因：之前导入样品时，productId 和 shopId 存的是 MongoDB ObjectId 而不是实际值
 * 修复方法：
 *   第一阶段：根据 productId (_id) 查找 Product 表，获取 tiktokProductId
 *   第二阶段：找不到的，用商品名称去 Product.name 匹配，获取 tiktokProductId
 * 
 * 运行方式：node migrate_sample_productId.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 连接数据库
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tap_system';

async function migrate() {
  console.log('=== 开始迁移样品 productId ===');
  console.log('连接数据库:', MONGODB_URI);
  
  await mongoose.connect(MONGODB_URI);
  console.log('数据库连接成功');
  
  const db = mongoose.connection.db;
  
  // ========== 阶段0：加载 Product 数据 ==========
  console.log('\n[阶段0] 加载 Product 表数据...');
  
  // 获取所有 Product，建立 {name: tiktokProductId} 映射（用于名称匹配）
  const products = await db.collection('products').find({}).toArray();
  const productNameMap = {};  // name -> tiktokProductId
  const productIdMap = {};    // _id (ObjectId) -> tiktokProductId
  
  products.forEach(p => {
    // 按名称映射（去空格和大小写）
    if (p.name) {
      productNameMap[p.name.trim()] = p.tiktokProductId || p.sku || null;
    }
    // 按 ObjectId 映射
    if (p._id) {
      productIdMap[p._id.toString()] = p.tiktokProductId || p.sku || null;
    }
  });
  
  console.log(`  已加载 ${products.length} 个商品`);
  console.log(`  名称映射: ${Object.keys(productNameMap).length} 个`);
  console.log(`  ObjectId映射: ${Object.keys(productIdMap).length} 个`);
  
  // ========== 阶段1：处理 ObjectId 格式的 productId ==========
  console.log('\n[阶段1] 处理 ObjectId 格式的 productId...');
  
  const samples = await db.collection('samplemanagements').find({}).toArray();
  const objectIdSamples = samples.filter(s => /^[0-9a-f]{24}$/i.test(String(s.productId || '')));
  
  console.log(`\n统计结果:`);
  console.log(`- 总样品记录: ${samples.length}`);
  console.log(`- ObjectId格式: ${objectIdSamples.length}`);
  
  if (objectIdSamples.length === 0) {
    console.log('\n没有需要阶段1迁移的记录');
  } else {
    // 统计能匹配的数量
    let stage1CanMatch = 0;
    let stage1NeedNameMatch = 0;
    
    for (const sample of objectIdSamples) {
      const objectId = String(sample.productId);
      if (productIdMap[objectId]) {
        stage1CanMatch++;
      } else {
        stage1NeedNameMatch++;
      }
    }
    
    console.log(`- 阶段1可直接匹配: ${stage1CanMatch}`);
    console.log(`- 阶段1需用名称匹配: ${stage1NeedNameMatch}`);
    
    // 执行阶段1更新
    let stage1Updated = 0;
    for (const sample of objectIdSamples) {
      const objectId = String(sample.productId);
      const tiktokProductId = productIdMap[objectId];
      
      if (tiktokProductId) {
        await db.collection('samplemanagements').updateOne(
          { _id: sample._id },
          { $set: { productId: tiktokProductId } }
        );
        stage1Updated++;
      }
    }
    console.log(`  阶段1实际更新: ${stage1Updated} 条`);
  }
  
  // ========== 阶段2：用商品名称匹配 ==========
  console.log('\n[阶段2] 用商品名称匹配...');
  
  // 再次查询，找出还是 ObjectId 格式的样品
  const remainingSamples = await db.collection('samplemanagements').find({}).toArray();
  const stillObjectId = remainingSamples.filter(s => /^[0-9a-f]{24}$/i.test(String(s.productId || '')));
  
  console.log(`剩余 ObjectId 格式: ${stillObjectId.length}`);
  
  if (stillObjectId.length > 0) {
    let stage2Matched = 0;
    let stage2Unmatched = 0;
    
    for (const sample of stillObjectId) {
      const productName = sample.productName ? sample.productName.trim() : null;
      
      if (productName && productNameMap[productName]) {
        try {
          await db.collection('samplemanagements').updateOne(
            { _id: sample._id },
            { $set: { productId: productNameMap[productName] } }
          );
          stage2Matched++;
          
          if (stage2Matched <= 3) {
            console.log(`  [MATCH] "${productName.substring(0, 40)}..." -> ${productNameMap[productName]}`);
          }
        } catch (err) {
          // 忽略重复键错误（数据本身有问题）
          if (err.code === 11000) {
            stage2Unmatched++; // 标记为无法迁移（会重复）
            console.log(`  [SKIP-DUP] 重复键: "${productName.substring(0, 30)}..."`);
          } else {
            throw err;
          }
        }
      } else {
        stage2Unmatched++;
        if (stage2Unmatched <= 5) {
          console.log(`  [UNMATCH] productId: ${sample.productId}, productName: "${(productName || '无').substring(0, 40)}"`);
        }
      }
    }
    
    console.log(`\n阶段2匹配结果:`);
    console.log(`- 成功匹配: ${stage2Matched}`);
    console.log(`- 无法匹配: ${stage2Unmatched}`);
  }
  
  // ========== 最终验证 ==========
  console.log('\n=== 迁移完成，验证结果 ===');
  
  const afterSamples = await db.collection('samplemanagements').find({}).toArray();
  const afterObjectIdCount = afterSamples.filter(s => /^[0-9a-f]{24}$/i.test(String(s.productId || ''))).length;
  
  console.log(`\n验证结果:`);
  console.log(`- 总样品数: ${afterSamples.length}`);
  console.log(`- 剩余 ObjectId 格式: ${afterObjectIdCount} 条`);
  
  if (afterObjectIdCount === 0) {
    console.log('\n✅ 所有 productId 已成功转换为 TikTok 商品 ID！');
  } else {
    console.log(`\n⚠️ 还有 ${afterObjectIdCount} 条未迁移，请检查这些商品是否在 Product 表中存在`);
  }
  
  await mongoose.disconnect();
  console.log('\n数据库连接已关闭');
}

migrate().catch(err => {
  console.error('迁移失败:', err);
  process.exit(1);
});
