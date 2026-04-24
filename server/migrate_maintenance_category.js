/**
 * 迁移脚本：为现有维护记录设置正确的分类（category）
 * 
 * 分类规则：
 * 1. recordType === 'sample_application' -> category = 'sample_application'
 * 2. remark 包含“拉黑”或“黑名单” -> category = 'blacklist'
 * 3. maintainerName 包含“系统导入”或“导入” -> category = 'import'
 * 4. 默认 -> category = 'create'
 * 
 * 运行方式：node migrate_maintenance_category.js
 * 
 * 注意：此脚本会更新所有维护记录，请确保在非高峰期运行。
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 连接数据库
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tap_system';

async function migrate() {
  console.log('=== 开始迁移维护记录分类 ===');
  console.log('连接数据库:', MONGODB_URI);
  
  await mongoose.connect(MONGODB_URI);
  console.log('数据库连接成功');
  
  const db = mongoose.connection.db;
  const collection = db.collection('influencermaintenances');
  
  // 获取所有维护记录
  const records = await collection.find({}).toArray();
  console.log(`共 ${records.length} 条维护记录`);
  
  let updatedCount = 0;
  let skippedCount = 0;
  
  for (const record of records) {
    const originalCategory = record.category;
    let newCategory = originalCategory;
    
    // 根据规则推断分类
    if (record.recordType === 'sample_application') {
      newCategory = 'sample_application';
    } else if (record.remark && (record.remark.includes('拉黑') || record.remark.includes('黑名单'))) {
      newCategory = 'blacklist';
    } else if (record.maintainerName && (record.maintainerName.includes('系统导入') || record.maintainerName.includes('导入'))) {
      newCategory = 'import';
    } else {
      newCategory = 'create';
    }
    
    // 如果分类没有变化，跳过
    if (originalCategory === newCategory) {
      skippedCount++;
      continue;
    }
    
    // 更新记录
    try {
      await collection.updateOne(
        { _id: record._id },
        { $set: { category: newCategory } }
      );
      updatedCount++;
      
      if (updatedCount <= 10) {
        console.log(`  更新 ${record._id}: ${originalCategory || '(空)'} -> ${newCategory}`);
      }
    } catch (err) {
      console.error(`  更新失败 ${record._id}:`, err.message);
    }
  }
  
  console.log('\n=== 迁移完成 ===');
  console.log(`总计: ${records.length} 条记录`);
  console.log(`更新: ${updatedCount} 条`);
  console.log(`跳过: ${skippedCount} 条（分类未变）`);
  
  // 验证结果 - 使用聚合管道
  const stats = await collection.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]).toArray();
  console.log('\n分类统计:');
  stats.forEach(stat => {
    console.log(`  ${stat._id || '(空)'}: ${stat.count} 条`);
  });
  
  await mongoose.disconnect();
  console.log('\n数据库连接已关闭');
}

migrate().catch(err => {
  console.error('迁移失败:', err);
  process.exit(1);
});