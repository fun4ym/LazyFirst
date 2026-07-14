/**
 * 迁移脚本：修复BdDaily集合中大小写重复记录
 * 执行命令：node migrate_bddaily_fix_duplicates.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// 连接数据库
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tap_system';

async function fixBdDailyDuplicates() {
  console.log('=== 开始修复：BdDaily大小写重复记录 ===');
  
  try {
    // 连接数据库
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功');

    // 获取BdDaily模型
    const BdDaily = require('../models/BdDaily');

    // 1. 查找所有大小写冲突
    console.log('\n🔍 查找所有大小写冲突...');
    
    const allRecords = await BdDaily.find({}).sort({ date: 1, salesman: 1 });
    console.log(`📊 总记录数: ${allRecords.length} 条`);

    // 按小写名字和日期分组
    const conflictMap = new Map();
    
    for (const record of allRecords) {
      if (!record.salesman) continue;
      
      const lowerName = record.salesman.toLowerCase();
      const dateKey = record.date.toISOString().split('T')[0];
      const companyId = record.companyId.toString();
      
      const mapKey = `${companyId}_${dateKey}_${lowerName}`;
      
      if (!conflictMap.has(mapKey)) {
        conflictMap.set(mapKey, {
          companyId,
          date: record.date,
          lowerName,
          records: []
        });
      }
      
      conflictMap.get(mapKey).records.push(record);
    }

    // 找出有冲突的组（同一公司、同一天、同一名字但大小写不同）
    const conflicts = [];
    
    for (const [key, group] of conflictMap.entries()) {
      if (group.records.length > 1) {
        // 检查是否真的存在大小写不同
        const salesmen = [...new Set(group.records.map(r => r.salesman))];
        if (salesmen.length > 1) {
          conflicts.push(group);
        }
      }
    }

    console.log(`📈 发现 ${conflicts.length} 组大小写冲突`);

    if (conflicts.length === 0) {
      console.log('✅ 没有大小写冲突记录');
      await mongoose.disconnect();
      return;
    }

    // 2. 显示冲突详情
    console.log('\n🔍 冲突详情：');
    for (const conflict of conflicts) {
      const dateStr = conflict.date.toISOString().split('T')[0];
      const salesmen = [...new Set(conflict.records.map(r => r.salesman))];
      console.log(`  • ${dateStr} - ${conflict.lowerName}: ${salesmen.join(', ')} (${conflict.records.length} 条记录)`);
      
      for (const record of conflict.records) {
        console.log(`      - ${record.salesman}: 申样${record.sampleCount}, 成功${record.sampleSentCount}, 收入${record.revenue}`);
      }
    }

    // 3. 执行合并策略
    console.log('\n🔄 开始执行合并策略...');
    console.log('策略：将大写记录合并到小写记录，然后删除大写记录');
    
    let mergedCount = 0;
    let deletedCount = 0;
    
    for (const conflict of conflicts) {
      try {
        // 找出小写记录（如果有多个，取第一个）
        let lowercaseRecords = conflict.records.filter(r => 
          r.salesman.toLowerCase() === r.salesman
        );
        
        let uppercaseRecords = conflict.records.filter(r => 
          r.salesman.toLowerCase() !== r.salesman
        );
        
        if (lowercaseRecords.length === 0 || uppercaseRecords.length === 0) {
          console.log(`  ⚠️ 跳过：没有明确的大小写区分 ${conflict.lowerName}`);
          continue;
        }

        // 确定目标记录（小写记录）
        const targetRecord = lowercaseRecords[0];
        
        // 合并所有大写记录到小写记录
        for (const sourceRecord of uppercaseRecords) {
          if (sourceRecord._id.toString() === targetRecord._id.toString()) {
            continue; // 跳过自身
          }
          
          console.log(`  🔄 合并: ${sourceRecord.salesman} → ${targetRecord.salesman} (${conflict.date.toISOString().split('T')[0]})`);
          
          // 合并数据
          const updateData = {
            sampleCount: (targetRecord.sampleCount || 0) + (sourceRecord.sampleCount || 0),
            sampleSentCount: (targetRecord.sampleSentCount || 0) + (sourceRecord.sampleSentCount || 0),
            sampleRefusedCount: (targetRecord.sampleRefusedCount || 0) + (sourceRecord.sampleRefusedCount || 0),
            orderCount: (targetRecord.orderCount || 0) + (sourceRecord.orderCount || 0),
            revenue: (targetRecord.revenue || 0) + (sourceRecord.revenue || 0),
            estimatedCommission: (targetRecord.estimatedCommission || 0) + (sourceRecord.estimatedCommission || 0),
            commission: (targetRecord.commission || 0) + (sourceRecord.commission || 0),
            orderGeneratedCount: (targetRecord.orderGeneratedCount || 0) + (sourceRecord.orderGeneratedCount || 0)
          };

          // 合并sampleIds
          const sampleIds = [];
          if (targetRecord.sampleIds) sampleIds.push(...targetRecord.sampleIds.split(','));
          if (sourceRecord.sampleIds) sampleIds.push(...sourceRecord.sampleIds.split(','));
          if (sampleIds.length > 0) {
            updateData.sampleIds = [...new Set(sampleIds)].join(',');
          }

          // 合并revenueIds
          const revenueIds = [];
          if (targetRecord.revenueIds) revenueIds.push(...targetRecord.revenueIds.split(','));
          if (sourceRecord.revenueIds) revenueIds.push(...sourceRecord.revenueIds.split(','));
          if (revenueIds.length > 0) {
            updateData.revenueIds = [...new Set(revenueIds)].join(',');
          }

          // 更新目标记录
          await BdDaily.findByIdAndUpdate(targetRecord._id, updateData);
          
          // 删除源记录
          await BdDaily.findByIdAndDelete(sourceRecord._id);
          
          console.log(`     合并后: 申样${updateData.sampleCount}, 成功${updateData.sampleSentCount}, 收入${updateData.revenue}`);
          
          mergedCount++;
          deletedCount++;
        }
        
      } catch (error) {
        console.error(`  ❌ 合并失败: ${conflict.lowerName}`, error.message);
      }
    }

    // 4. 现在可以安全地进行大小写转换了
    console.log('\n🔄 开始执行大小写转换...');
    
    // 获取所有剩余的大写记录
    const remainingUppercase = await BdDaily.find({
      salesman: { $regex: /^[A-Z]/ }  // 首字母大写
    });
    
    let convertedCount = 0;
    
    for (const record of remainingUppercase) {
      const newSalesman = record.salesman.toLowerCase();
      
      try {
        await BdDaily.findByIdAndUpdate(record._id, {
          $set: { salesman: newSalesman }
        });
        
        console.log(`  ✅ 转换: ${record.salesman} → ${newSalesman}`);
        convertedCount++;
        
      } catch (error) {
        console.error(`  ❌ 转换失败: ${record.salesman}`, error.message);
      }
    }

    // 5. 验证最终结果
    console.log('\n🔍 验证最终结果：');
    
    const finalDistinctSalesmen = await BdDaily.distinct('salesman').sort();
    const finalUppercaseCount = finalDistinctSalesmen.filter(name => 
      name && name[0] === name[0].toUpperCase() && name[0] !== name[0].toLowerCase()
    ).length;
    
    console.log(`📊 最终统计：`);
    console.log(`  • 总salesman值: ${finalDistinctSalesmen.length} 个`);
    console.log(`  • 首字母大写数量: ${finalUppercaseCount} 个`);
    console.log(`  • 合并记录数: ${mergedCount} 条`);
    console.log(`  • 删除记录数: ${deletedCount} 条`);
    console.log(`  • 转换记录数: ${convertedCount} 条`);
    
    if (finalUppercaseCount === 0) {
      console.log('✅ 所有首字母大写已成功处理！');
    } else {
      const remainingUppercase = finalDistinctSalesmen.filter(name => 
        name && name[0] === name[0].toUpperCase() && name[0] !== name[0].toLowerCase()
      );
      console.log('⚠️ 仍然存在首字母大写的值：');
      console.log(remainingUppercase.join(', '));
    }

    // 6. 验证是否还有重复记录
    console.log('\n🔍 验证是否还有重复记录...');
    
    const finalRecords = await BdDaily.find({}).sort({ date: 1, salesman: 1 });
    const finalConflictMap = new Map();
    
    for (const record of finalRecords) {
      if (!record.salesman) continue;
      
      const lowerName = record.salesman.toLowerCase();
      const dateKey = record.date.toISOString().split('T')[0];
      const companyId = record.companyId.toString();
      
      const mapKey = `${companyId}_${dateKey}_${lowerName}`;
      
      if (!finalConflictMap.has(mapKey)) {
        finalConflictMap.set(mapKey, []);
      }
      
      finalConflictMap.get(mapKey).push(record);
    }
    
    const finalConflicts = [];
    for (const [key, records] of finalConflictMap.entries()) {
      if (records.length > 1) {
        finalConflicts.push({ key, records });
      }
    }
    
    if (finalConflicts.length === 0) {
      console.log('✅ 验证通过：没有重复记录');
    } else {
      console.log(`⚠️ 警告：仍然有 ${finalConflicts.length} 组重复记录`);
      for (const conflict of finalConflicts) {
        const dateStr = conflict.records[0].date.toISOString().split('T')[0];
        const salesmen = conflict.records.map(r => r.salesman).join(', ');
        console.log(`  • ${dateStr}: ${salesmen}`);
      }
    }

  } catch (error) {
    console.error('❌ 修复过程中出错:', error);
    process.exit(1);
  } finally {
    // 断开数据库连接
    await mongoose.disconnect();
    console.log('✅ 数据库连接已关闭');
  }
}

// 执行修复
fixBdDailyDuplicates().then(() => {
  console.log('🎉 修复任务完成！');
  process.exit(0);
}).catch(error => {
  console.error('💥 修复任务失败:', error);
  process.exit(1);
});