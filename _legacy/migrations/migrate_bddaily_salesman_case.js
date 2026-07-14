/**
 * 迁移脚本：将BdDaily集合中salesman字段首字母大写改为小写字母
 * 执行命令：node migrate_bddaily_salesman_case.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// 连接数据库
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tap_system';

async function migrateBdDailySalesmanCase() {
  console.log('=== 开始迁移：BdDaily salesman字段大小写规范化 ===');
  
  try {
    // 连接数据库
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ 数据库连接成功');

    // 获取BdDaily模型
    const BdDaily = require('./models/BdDaily');

    // 1. 首先查看当前的大小写分布情况
    console.log('\n📊 当前大小写分布情况：');
    const distinctSalesmen = await BdDaily.distinct('salesman').sort();
    console.log('不同的salesman值（按字母顺序）：');
    
    const uppercaseCount = {};
    const lowercaseCount = {};
    const mixedCount = {};
    
    for (const salesman of distinctSalesmen) {
      if (!salesman) continue;
      
      // 判断大小写类型
      const isUppercase = salesman[0] === salesman[0].toUpperCase() && salesman[0] !== salesman[0].toLowerCase();
      const isLowercase = salesman[0] === salesman[0].toLowerCase() && salesman[0] !== salesman[0].toUpperCase();
      
      if (isUppercase) {
        uppercaseCount[salesman] = true;
      } else if (isLowercase) {
        lowercaseCount[salesman] = true;
      } else {
        mixedCount[salesman] = true;
      }
    }
    
    console.log(`📈 统计结果：`);
    console.log(`  • 首字母大写: ${Object.keys(uppercaseCount).length} 个`);
    console.log(`  • 首字母小写: ${Object.keys(lowercaseCount).length} 个`);
    console.log(`  • 其他（数字、特殊字符等）: ${Object.keys(mixedCount).length} 个`);
    
    if (Object.keys(uppercaseCount).length > 0) {
      console.log('\n🔍 首字母大写的salesman值：');
      console.log(Object.keys(uppercaseCount).sort().join(', '));
    }

    // 2. 统计总记录数
    const totalCount = await BdDaily.countDocuments({});
    console.log(`\n📈 总记录数: ${totalCount} 条`);

    // 3. 执行迁移：将首字母大写的改为小写
    console.log('\n🔄 开始执行大小写规范化...');
    
    // 获取所有需要修改的记录
    const recordsToUpdate = [];
    const uppercaseSalesmen = Object.keys(uppercaseCount);
    
    for (const uppercaseName of uppercaseSalesmen) {
      const lowercaseName = uppercaseName.toLowerCase();
      
      // 查找所有该大写名字的记录
      const records = await BdDaily.find({ salesman: uppercaseName });
      
      if (records.length > 0) {
        recordsToUpdate.push({
          oldName: uppercaseName,
          newName: lowercaseName,
          count: records.length,
          records: records.map(r => r._id)
        });
      }
    }

    // 显示迁移计划
    console.log('\n📋 迁移计划：');
    let totalRecordsToUpdate = 0;
    for (const plan of recordsToUpdate) {
      console.log(`  • ${plan.oldName} → ${plan.newName}: ${plan.count} 条记录`);
      totalRecordsToUpdate += plan.count;
    }
    console.log(`📈 总共需要修改: ${totalRecordsToUpdate} 条记录`);

    if (totalRecordsToUpdate === 0) {
      console.log('✅ 没有需要修改的记录，任务完成！');
      await mongoose.disconnect();
      return;
    }

    // 4. 确认执行
    console.log('\n⚠️ 确认执行迁移吗？(输入 yes 继续)');
    // 对于脚本运行，我们直接执行
    console.log('自动确认执行...');

    // 5. 执行批量更新
    let updatedCount = 0;
    for (const plan of recordsToUpdate) {
      try {
        const result = await BdDaily.updateMany(
          { salesman: plan.oldName },
          { $set: { salesman: plan.newName } }
        );
        
        console.log(`  ✅ ${plan.oldName} → ${plan.newName}: 更新了 ${result.modifiedCount} 条记录`);
        updatedCount += result.modifiedCount;
      } catch (error) {
        console.error(`  ❌ 更新 ${plan.oldName} 时出错:`, error.message);
      }
    }

    // 6. 验证迁移结果
    console.log('\n🔍 验证迁移结果：');
    
    // 重新查询大小写分布
    const newDistinctSalesmen = await BdDaily.distinct('salesman').sort();
    const newUppercaseCount = {};
    
    for (const salesman of newDistinctSalesmen) {
      if (!salesman) continue;
      if (salesman[0] === salesman[0].toUpperCase() && salesman[0] !== salesman[0].toLowerCase()) {
        newUppercaseCount[salesman] = true;
      }
    }
    
    console.log(`📊 迁移后首字母大写数量: ${Object.keys(newUppercaseCount).length} 个`);
    
    if (Object.keys(newUppercaseCount).length > 0) {
      console.log('⚠️ 仍然存在首字母大写的值：');
      console.log(Object.keys(newUppercaseCount).sort().join(', '));
    } else {
      console.log('✅ 所有首字母大写已成功转换为小写！');
    }

    // 7. 总结
    console.log('\n📋 迁移总结：');
    console.log(`  • 总记录数: ${totalCount} 条`);
    console.log(`  • 需要修改的记录: ${totalRecordsToUpdate} 条`);
    console.log(`  • 实际更新的记录: ${updatedCount} 条`);
    console.log(`  • 迁移成功率: ${totalRecordsToUpdate > 0 ? ((updatedCount / totalRecordsToUpdate) * 100).toFixed(2) : 100}%`);

    if (updatedCount > 0) {
      console.log('\n💡 建议：');
      console.log('  1. 验证前端 /bd-daily 页面是否显示正常');
      console.log('  2. 检查按月统计分组是否正确合并');
      console.log('  3. 如有需要，可以运行此脚本再次验证');
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
migrateBdDailySalesmanCase().then(() => {
  console.log('🎉 迁移任务完成！');
  process.exit(0);
}).catch(error => {
  console.error('💥 迁移任务失败:', error);
  process.exit(1);
});