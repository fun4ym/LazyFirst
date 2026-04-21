/**
 * 迁移脚本：为BdDaily记录添加videoPublishCount字段
 * 说明：由于新增了videoPublishCount字段，需要为现有记录设置默认值0
 */

require('dotenv').config();
const mongoose = require('mongoose');
const BdDaily = require('./models/BdDaily');

async function main() {
  try {
    console.log('=== 开始迁移：为BdDaily记录添加videoPublishCount字段 ===');
    
    // 连接数据库
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tap_system';
    await mongoose.connect(mongoUri);
    console.log('✅ 数据库连接成功');
    
    // 统计现有记录总数
    const totalRecords = await BdDaily.countDocuments();
    console.log(`📊 现有BdDaily记录总数: ${totalRecords}`);
    
    // 查找没有videoPublishCount字段的记录
    const recordsWithoutVideoCount = await BdDaily.find({
      $or: [
        { videoPublishCount: { $exists: false } },
        { videoPublishCount: null }
      ]
    });
    
    console.log(`📊 需要添加videoPublishCount字段的记录数: ${recordsWithoutVideoCount.length}`);
    
    if (recordsWithoutVideoCount.length > 0) {
      console.log('🔄 开始添加videoPublishCount字段...');
      
      // 批量更新记录
      const updateOperations = recordsWithoutVideoCount.map(record => ({
        updateOne: {
          filter: { _id: record._id },
          update: { $set: { videoPublishCount: 0 } }
        }
      }));
      
      // 执行批量更新
      const result = await BdDaily.bulkWrite(updateOperations);
      console.log('✅ 批量更新完成');
      console.log(`📊 更新记录数: ${result.modifiedCount}`);
    } else {
      console.log('✅ 所有记录都已包含videoPublishCount字段，无需迁移');
    }
    
    // 验证迁移结果
    const recordsAfter = await BdDaily.find({
      $or: [
        { videoPublishCount: { $exists: false } },
        { videoPublishCount: null }
      ]
    }).countDocuments();
    
    if (recordsAfter === 0) {
      console.log('✅ 迁移成功完成！所有记录都已包含videoPublishCount字段');
    } else {
      console.log(`⚠️  警告：仍有 ${recordsAfter} 条记录缺少videoPublishCount字段`);
    }
    
  } catch (error) {
    console.error('❌ 迁移过程中发生错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
    process.exit(0);
  }
}

// 执行迁移
main();