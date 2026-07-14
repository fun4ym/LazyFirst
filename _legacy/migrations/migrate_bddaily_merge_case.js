/**
 * 迁移脚本：合并BdDaily集合中salesman字段大小写重复记录
 * 执行命令：node migrate_bddaily_merge_case.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// 连接数据库
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tap_system';

async function mergeBdDailyCaseDuplicates() {
  console.log('=== 开始迁移：合并BdDaily大小写重复记录 ===');
  
  try {
    // 连接数据库
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功');

    // 获取BdDaily模型
    const BdDaily = require('../models/BdDaily');

    // 1. 首先查看当前的大小写分布情况
    console.log('\n📊 当前大小写分布情况：');
    const distinctSalesmen = await BdDaily.distinct('salesman').sort();
    
    // 按小写分组
    const lowercaseGroups = {};
    
    for (const salesman of distinctSalesmen) {
      if (!salesman) continue;
      
      const lowercaseKey = salesman.toLowerCase();
      
      if (!lowercaseGroups[lowercaseKey]) {
        lowercaseGroups[lowercaseKey] = {
          uppercase: [],
          lowercase: [],
          mixed: []
        };
      }
      
      // 判断大小写类型
      if (salesman[0] === salesman[0].toUpperCase() && salesman[0] !== salesman[0].toLowerCase()) {
        lowercaseGroups[lowercaseKey].uppercase.push(salesman);
      } else if (salesman[0] === salesman[0].toLowerCase() && salesman[0] !== salesman[0].toUpperCase()) {
        lowercaseGroups[lowercaseKey].lowercase.push(salesman);
      } else {
        lowercaseGroups[lowercaseKey].mixed.push(salesman);
      }
    }

    // 找出有大小写冲突的组
    const conflictGroups = {};
    for (const [lowercaseKey, group] of Object.entries(lowercaseGroups)) {
      if (group.uppercase.length > 0 && group.lowercase.length > 0) {
        conflictGroups[lowercaseKey] = group;
      }
    }

    console.log(`📈 冲突统计：`);
    console.log(`  • 有大小写冲突的组: ${Object.keys(conflictGroups).length} 个`);
    
    if (Object.keys(conflictGroups).length === 0) {
      console.log('✅ 没有大小写冲突记录，可以直接进行大小写转换');
      await mongoose.disconnect();
      return;
    }

    // 2. 显示冲突详情
    console.log('\n🔍 大小写冲突详情：');
    for (const [lowercaseKey, group] of Object.entries(conflictGroups)) {
      console.log(`  • ${lowercaseKey}:`);
      if (group.uppercase.length > 0) {
        console.log(`     大写: ${group.uppercase.join(', ')}`);
      }
      if (group.lowercase.length > 0) {
        console.log(`     小写: ${group.lowercase.join(', ')}`);
      }
    }

    // 3. 分析每个冲突组的重复记录
    console.log('\n🔍 分析重复记录情况...');
    
    const conflictDetails = [];
    
    for (const [lowercaseKey, group] of Object.entries(conflictGroups)) {
      // 对于每个大写名字，检查是否存在相同日期的小写记录
      for (const uppercaseName of group.uppercase) {
        // 获取所有大写记录
        const uppercaseRecords = await BdDaily.find({ salesman: uppercaseName });
        
        for (const record of uppercaseRecords) {
          const targetKey = {
            companyId: record.companyId,
            date: record.date,
            salesman: lowercaseKey
          };
          
          // 检查是否存在相同公司、日期的小写记录
          const lowercaseRecord = await BdDaily.findOne({
            companyId: record.companyId,
            date: record.date,
            salesman: { $regex: new RegExp(`^${lowercaseKey}$`, 'i') }
          });
          
          if (lowercaseRecord && lowercaseRecord.salesman !== uppercaseName) {
            conflictDetails.push({
              uppercaseName,
              lowercaseName: lowercaseRecord.salesman,
              companyId: record.companyId,
              date: record.date,
              uppercaseRecordId: record._id,
              lowercaseRecordId: lowercaseRecord._id,
              uppercaseData: {
                sampleCount: record.sampleCount,
                sampleSentCount: record.sampleSentCount,
                sampleRefusedCount: record.sampleRefusedCount,
                orderCount: record.orderCount,
                revenue: record.revenue
              },
              lowercaseData: {
                sampleCount: lowercaseRecord.sampleCount,
                sampleSentCount: lowercaseRecord.sampleSentCount,
                sampleRefusedCount: lowercaseRecord.sampleRefusedCount,
                orderCount: lowercaseRecord.orderCount,
                revenue: lowercaseRecord.revenue
              }
            });
          }
        }
      }
    }

    console.log(`📈 发现 ${conflictDetails.length} 个具体冲突记录`);

    if (conflictDetails.length === 0) {
      console.log('✅ 没有具体冲突记录，可以直接进行大小写转换');
      await mongoose.disconnect();
      return;
    }

    // 4. 显示冲突记录详情
    console.log('\n🔍 具体冲突记录：');
    for (const detail of conflictDetails) {
      const dateStr = new Date(detail.date).toISOString().split('T')[0];
      console.log(`  • ${dateStr} - ${detail.uppercaseName} vs ${detail.lowercaseName}`);
      console.log(`     大写记录: 申样${detail.uppercaseData.sampleCount}, 成功${detail.uppercaseData.sampleSentCount}, 收入${detail.uppercaseData.revenue}`);
      console.log(`     小写记录: 申样${detail.lowercaseData.sampleCount}, 成功${detail.lowercaseData.sampleSentCount}, 收入${detail.lowercaseData.revenue}`);
    }

    // 5. 执行合并策略
    console.log('\n🔄 开始执行合并策略...');
    console.log('策略：将大写记录的数据合并到小写记录，然后删除大写记录');
    
    let mergedCount = 0;
    let deletedCount = 0;
    let skippedCount = 0;

    for (const detail of conflictDetails) {
      try {
        // 检查小写记录是否仍然存在
        const lowercaseRecord = await BdDaily.findById(detail.lowercaseRecordId);
        const uppercaseRecord = await BdDaily.findById(detail.uppercaseRecordId);
        
        if (!lowercaseRecord || !uppercaseRecord) {
          console.log(`  ⚠️ 记录已不存在，跳过: ${detail.uppercaseName}`);
          skippedCount++;
          continue;
        }

        // 合并数据：将大写记录的数据累加到小写记录
        const updateData = {
          sampleCount: (lowercaseRecord.sampleCount || 0) + (uppercaseRecord.sampleCount || 0),
          sampleSentCount: (lowercaseRecord.sampleSentCount || 0) + (uppercaseRecord.sampleSentCount || 0),
          sampleRefusedCount: (lowercaseRecord.sampleRefusedCount || 0) + (uppercaseRecord.sampleRefusedCount || 0),
          orderCount: (lowercaseRecord.orderCount || 0) + (uppercaseRecord.orderCount || 0),
          revenue: (lowercaseRecord.revenue || 0) + (uppercaseRecord.revenue || 0),
          estimatedCommission: (lowercaseRecord.estimatedCommission || 0) + (uppercaseRecord.estimatedCommission || 0),
          commission: (lowercaseRecord.commission || 0) + (uppercaseRecord.commission || 0),
          orderGeneratedCount: (lowercaseRecord.orderGeneratedCount || 0) + (uppercaseRecord.orderGeneratedCount || 0)
        };

        // 合并sampleIds（逗号分隔）
        const sampleIds = [];
        if (lowercaseRecord.sampleIds) sampleIds.push(...lowercaseRecord.sampleIds.split(','));
        if (uppercaseRecord.sampleIds) sampleIds.push(...uppercaseRecord.sampleIds.split(','));
        if (sampleIds.length > 0) {
          updateData.sampleIds = [...new Set(sampleIds)].join(',');
        }

        // 合并revenueIds（逗号分隔）
        const revenueIds = [];
        if (lowercaseRecord.revenueIds) revenueIds.push(...lowercaseRecord.revenueIds.split(','));
        if (uppercaseRecord.revenueIds) revenueIds.push(...uppercaseRecord.revenueIds.split(','));
        if (revenueIds.length > 0) {
          updateData.revenueIds = [...new Set(revenueIds)].join(',');
        }

        // 更新小写记录
        await BdDaily.findByIdAndUpdate(detail.lowercaseRecordId, updateData);
        
        // 删除大写记录
        await BdDaily.findByIdAndDelete(detail.uppercaseRecordId);
        
        const dateStr = new Date(detail.date).toISOString().split('T')[0];
        console.log(`  ✅ 合并完成: ${dateStr} - ${detail.uppercaseName} → ${detail.lowercaseName}`);
        console.log(`     合并后: 申样${updateData.sampleCount}, 成功${updateData.sampleSentCount}, 收入${updateData.revenue}`);
        
        mergedCount++;
        deletedCount++;

      } catch (error) {
        console.error(`  ❌ 合并失败: ${detail.uppercaseName}`, error.message);
        skippedCount++;
      }
    }

    // 6. 现在可以安全地进行大小写转换了
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

    // 7. 验证最终结果
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
    console.log(`  • 跳过记录数: ${skippedCount} 条`);
    
    if (finalUppercaseCount === 0) {
      console.log('✅ 所有首字母大写已成功处理！');
    } else {
      const remainingUppercase = finalDistinctSalesmen.filter(name => 
        name && name[0] === name[0].toUpperCase() && name[0] !== name[0].toLowerCase()
      );
      console.log('⚠️ 仍然存在首字母大写的值：');
      console.log(remainingUppercase.join(', '));
    }

  } catch (error) {
    console.error('❌ 迁移过程中出错:', error);
    process.exit(1);
  } finally {
    // 断开数据库连接
    await mongoose.disconnect();
    console.log('✅ 数据库连接已关闭');
  }
}

// 执行迁移
mergeBdDailyCaseDuplicates().then(() => {
  console.log('🎉 合并迁移任务完成！');
  process.exit(0);
}).catch(error => {
  console.error('💥 合并迁移任务失败:', error);
  process.exit(1);
});