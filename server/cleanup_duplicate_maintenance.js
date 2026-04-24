/**
 * 清理重复的维护记录脚本
 * 
 * 问题：同一秒内同一达人可能产生多条维护记录（如导入+样品申请）
 * 解决方案：保留最新的一条（按 _id 或 createdAt），删除其他重复记录
 * 
 * 运行方式：node cleanup_duplicate_maintenance.js
 * 
 * 注意：此脚本会删除数据，请先备份数据库！
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 连接数据库
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tap_system';

async function cleanup() {
  console.log('=== 开始清理重复维护记录 ===');
  console.log('连接数据库:', MONGODB_URI);
  
  await mongoose.connect(MONGODB_URI);
  console.log('数据库连接成功');
  
  const db = mongoose.connection.db;
  const collection = db.collection('influencermaintenances');
  
  // 查找同一秒内同一达人的重复记录
  const duplicates = await collection.aggregate([
    {
      $group: {
        _id: {
          influencerId: "$influencerId",
          // 按秒分组（忽略毫秒）
          time: { 
            $dateToString: { 
              format: "%Y-%m-%dT%H:%M:%S", 
              date: "$createdAt" 
            } 
          }
        },
        records: { $push: "$$ROOT" },
        count: { $sum: 1 }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();
  
  console.log(`发现 ${duplicates.length} 组重复记录`);
  
  let totalDeleted = 0;
  
  for (const group of duplicates) {
    const { influencerId, time } = group._id;
    const records = group.records;
    
    // 按 _id 降序排序，保留最新的记录
    records.sort((a, b) => b._id.toString().localeCompare(a._id.toString()));
    
    // 保留第一条（最新的），删除其余
    const keepRecord = records[0];
    const deleteRecords = records.slice(1);
    
    console.log(`\n达人 ${influencerId} 在 ${time} 有 ${records.length} 条记录：`);
    console.log(`  保留: ${keepRecord._id} (${keepRecord.category || '无分类'})`);
    
    for (const record of deleteRecords) {
      console.log(`  删除: ${record._id} (${record.category || '无分类'})`);
      await collection.deleteOne({ _id: record._id });
      totalDeleted++;
    }
  }
  
  console.log('\n=== 清理完成 ===');
  console.log(`总计删除: ${totalDeleted} 条重复记录`);
  
  // 验证剩余记录数
  const totalCount = await collection.countDocuments();
  console.log(`剩余维护记录: ${totalCount} 条`);
  
  await mongoose.disconnect();
  console.log('\n数据库连接已关闭');
}

cleanup().catch(err => {
  console.error('清理失败:', err);
  process.exit(1);
});