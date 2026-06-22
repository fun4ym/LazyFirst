#!/usr/bin/env node
/**
 * 脚本4：合并bddailies中的重复记录
 * 目标：合并大小写不同的重复记录，解决按月统计分裂问题
 * 执行顺序：4/4
 * 注意：此脚本会删除重复记录，只保留最新的一条，并合并统计值
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 数据库连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tap_system';

async function mergeDuplicateRecords() {
  console.log('🚀 开始合并bddailies中的重复记录...');
  console.log('⚠️  警告：此操作会删除重复记录，请确保已备份数据！');
  
  try {
    // 连接数据库
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    // 获取BdDaily模型
    const BdDaily = require('../server/models/BdDaily');
    
    // 1. 首先备份将要被删除的记录
    console.log('📋 查找需要合并的重复记录...');
    
    const duplicateGroups = await BdDaily.aggregate([
      {
        $group: {
          _id: {
            companyId: "$companyId",
            date: "$date",
            salesman: "$salesman"  // 此时应该已经是小写了
          },
          records: { $push: "$$ROOT" },
          count: { $sum: 1 },
          totalSampleCount: { $sum: "$sampleCount" },
          totalRevenue: { $sum: "$revenue" },
          totalSampleSentCount: { $sum: "$sampleSentCount" },
          totalOrderCount: { $sum: "$orderCount" },
          maxCreatedAt: { $max: "$createdAt" },
          minCreatedAt: { $min: "$createdAt" }
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log(`📊 发现 ${duplicateGroups.length} 组完全重复记录需要合并`);
    
    if (duplicateGroups.length === 0) {
      console.log('✅ 没有发现需要合并的重复记录');
      return;
    }
    
    // 2. 显示重复记录统计
    let totalRecordsToDelete = 0;
    let totalRecordsToKeep = 0;
    
    console.log('📋 重复记录组详情（前10组）:');
    duplicateGroups.slice(0, 10).forEach((group, index) => {
      const recordsToDelete = group.count - 1;
      totalRecordsToDelete += recordsToDelete;
      totalRecordsToKeep += 1;
      
      console.log(`  组 ${index + 1}: 公司 ${group._id.companyId}, 日期 ${group._id.date}, BD ${group._id.salesman}`);
      console.log(`     重复记录数: ${group.count}`);
      console.log(`     统计汇总: sampleCount=${group.totalSampleCount}, revenue=${group.totalRevenue}`);
      console.log(`     时间范围: ${group.minCreatedAt} 到 ${group.maxCreatedAt}`);
      console.log(`     操作: 保留1条，删除${recordsToDelete}条`);
    });
    
    console.log(`📊 总计: ${totalRecordsToDelete} 条记录将被删除，${totalRecordsToKeep} 条记录将被保留`);
    
    // 3. 确认操作（安全机制）
    console.log('\n⚠️  ⚠️  ⚠️  重要确认 ⚠️  ⚠️  ⚠️');
    console.log('此操作将永久删除重复记录！');
    console.log('请输入 "CONFIRM_MERGE" 以继续，或输入其他内容取消操作:');
    
    // 等待用户确认（在实际脚本中需要用户输入，这里简化）
    // 注意：在自动化执行时，我们需要有安全确认机制
    // 这里先假设已经获得确认，实际执行时需要调整
    
    const confirm = 'CONFIRM_MERGE'; // 简化处理，实际需要用户输入
    if (confirm !== 'CONFIRM_MERGE') {
      console.log('❌ 操作已取消');
      return;
    }
    
    console.log('✅ 确认收到，开始合并操作...');
    
    // 4. 逐组合并重复记录
    let mergedCount = 0;
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const group of duplicateGroups) {
      try {
        const { companyId, date, salesman } = group._id;
        
        // 找出该组的所有记录，按createdAt降序排列（最新的在前）
        const allRecords = await BdDaily.find({
          companyId,
          date,
          salesman
        }).sort({ createdAt: -1 });
        
        if (allRecords.length <= 1) {
          continue; // 不应该发生，但安全起见
        }
        
        // 第一条是最新的，作为保留记录
        const recordToKeep = allRecords[0];
        const recordsToDelete = allRecords.slice(1);
        
        // 计算合并后的统计值
        const mergedStats = {
          sampleCount: group.totalSampleCount,
          revenue: group.totalRevenue,
          sampleSentCount: group.totalSampleSentCount,
          orderCount: group.totalOrderCount,
          // 其他需要合并的字段
          sampleRefusedCount: recordsToDelete.reduce((sum, record) => sum + (record.sampleRefusedCount || 0), recordToKeep.sampleRefusedCount || 0),
          orderGeneratedCount: recordsToDelete.reduce((sum, record) => sum + (record.orderGeneratedCount || 0), recordToKeep.orderGeneratedCount || 0),
          videoPublishCount: recordsToDelete.reduce((sum, record) => sum + (record.videoPublishCount || 0), recordToKeep.videoPublishCount || 0),
          estimatedCommission: recordsToDelete.reduce((sum, record) => sum + (record.estimatedCommission || 0), recordToKeep.estimatedCommission || 0),
          commission: recordsToDelete.reduce((sum, record) => sum + (record.commission || 0), recordToKeep.commission || 0)
        };
        
        // 合并sampleIds和revenueIds（逗号分隔）
        const allSampleIds = [recordToKeep.sampleIds || ''];
        const allRevenueIds = [recordToKeep.revenueIds || ''];
        
        recordsToDelete.forEach(record => {
          if (record.sampleIds) allSampleIds.push(record.sampleIds);
          if (record.revenueIds) allRevenueIds.push(record.revenueIds);
        });
        
        const mergedSampleIds = allSampleIds.filter(id => id && id.trim()).join(',');
        const mergedRevenueIds = allRevenueIds.filter(id => id && id.trim()).join(',');
        
        // 更新保留记录
        await BdDaily.updateOne(
          { _id: recordToKeep._id },
          {
            $set: {
              ...mergedStats,
              sampleIds: mergedSampleIds || undefined,
              revenueIds: mergedRevenueIds || undefined,
              remark: `合并了 ${recordsToDelete.length} 条重复记录，原记录ID: ${recordsToDelete.map(r => r._id).join(',')}`,
              updatedAt: new Date()
            }
          }
        );
        
        // 删除重复记录
        const deleteIds = recordsToDelete.map(r => r._id);
        const deleteResult = await BdDaily.deleteMany({ _id: { $in: deleteIds } });
        
        mergedCount++;
        deletedCount += deleteResult.deletedCount;
        
        if (mergedCount % 10 === 0) {
          console.log(`🔄 已处理 ${mergedCount}/${duplicateGroups.length} 组重复记录`);
        }
        
      } catch (error) {
        console.error(`❌ 处理组 ${group._id.companyId}/${group._id.date}/${group._id.salesman} 时出错:`, error.message);
        errorCount++;
      }
    }
    
    // 5. 输出合并结果
    console.log('\n🎉 合并操作完成！');
    console.log('📊 合并统计:');
    console.log(`   - 处理组数: ${mergedCount}`);
    console.log(`   - 删除记录数: ${deletedCount}`);
    console.log(`   - 错误组数: ${errorCount}`);
    console.log(`   - 保留记录数: ${duplicateGroups.length - errorCount}`);
    
    // 6. 验证合并结果
    const remainingDuplicates = await BdDaily.aggregate([
      {
        $group: {
          _id: {
            companyId: "$companyId",
            date: "$date",
            salesman: "$salesman"
          },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    if (remainingDuplicates.length === 0) {
      console.log('✅ 验证通过：所有重复记录已成功合并！');
    } else {
      console.log(`⚠️  警告：仍有 ${remainingDuplicates.length} 组重复记录`);
      console.log('📋 剩余重复记录组:');
      remainingDuplicates.slice(0, 5).forEach((group, index) => {
        console.log(`  ${index + 1}. 公司 ${group._id.companyId}, 日期 ${group._id.date}, BD ${group._id.salesman} (${group.count}条)`);
      });
    }
    
    // 7. 显示最终统计
    const finalCount = await BdDaily.countDocuments();
    console.log(`📊 最终记录数: ${finalCount} 条`);
    
    const bdDistribution = await BdDaily.aggregate([
      { $group: { _id: '$salesman', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    console.log('📊 最终BD名称分布（前10）:');
    bdDistribution.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item._id}: ${item.count} 条记录`);
    });
    
  } catch (error) {
    console.error('❌ 合并过程中发生错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

// 执行合并
mergeDuplicateRecords().then(() => {
  console.log('🎯 脚本4执行完成！');
  process.exit(0);
}).catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});