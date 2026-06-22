#!/usr/bin/env node
/**
 * 脚本2：清理ReportOrder.bdName字段大小写问题
 * 目标：将所有bdName字段统一转为小写
 * 执行顺序：2/4
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 数据库连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tap_system';

async function cleanupReportOrderCase() {
  console.log('🚀 开始清理ReportOrder.bdName字段大小写问题...');
  
  try {
    // 连接数据库
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    // 获取ReportOrder模型
    const ReportOrder = require('../server/models/ReportOrder');
    
    // 1. 首先统计有多少记录需要清理
    const totalCount = await ReportOrder.countDocuments({ bdName: { $exists: true, $type: 'string' } });
    console.log(`📊 找到 ${totalCount} 条包含bdName字段的记录`);
    
    // 2. 查找有大写字母的记录
    const uppercaseCount = await ReportOrder.countDocuments({
      bdName: { 
        $exists: true, 
        $type: 'string',
        $regex: /[A-Z]/ 
      }
    });
    console.log(`📊 其中 ${uppercaseCount} 条记录包含大写字母`);
    
    if (uppercaseCount === 0) {
      console.log('✅ 没有发现需要清理的大写记录');
      return;
    }
    
    // 3. 查看具体的大写记录示例
    const uppercaseSamples = await ReportOrder.find({
      bdName: { 
        $exists: true, 
        $type: 'string',
        $regex: /[A-Z]/ 
      }
    }).limit(5).select('bdName summaryDate companyId orderNo');
    
    console.log('📋 大写记录示例:');
    uppercaseSamples.forEach((doc, index) => {
      console.log(`  ${index + 1}. bdName: "${doc.bdName}" (公司: ${doc.companyId}, 日期: ${doc.summaryDate}, 订单: ${doc.orderNo})`);
    });
    
    // 4. 执行清理：将所有bdName字段转为小写
    console.log('🔄 开始清理...');
    
    // 使用聚合管道更新，确保只更新字符串类型的字段
    const result = await ReportOrder.updateMany(
      { bdName: { $exists: true, $type: 'string' } },
      [
        {
          $set: {
            bdName: {
              $toLower: "$bdName"
            }
          }
        }
      ]
    );
    
    console.log(`✅ 清理完成！`);
    console.log(`📊 更新统计:`);
    console.log(`   - 匹配记录数: ${result.matchedCount}`);
    console.log(`   - 修改记录数: ${result.modifiedCount}`);
    console.log(`   - 确认更新: ${result.acknowledged ? '是' : '否'}`);
    
    // 5. 验证清理结果
    const remainingUppercase = await ReportOrder.countDocuments({
      bdName: { 
        $exists: true, 
        $type: 'string',
        $regex: /[A-Z]/ 
      }
    });
    
    if (remainingUppercase === 0) {
      console.log('🎉 验证通过：所有bdName字段已转为小写！');
    } else {
      console.log(`⚠️  警告：仍有 ${remainingUppercase} 条记录包含大写字母`);
    }
    
    // 6. 显示清理后的示例
    const cleanedSamples = await ReportOrder.find({
      _id: { $in: uppercaseSamples.map(doc => doc._id) }
    }).select('bdName summaryDate companyId orderNo');
    
    console.log('📋 清理后示例:');
    cleanedSamples.forEach((doc, index) => {
      console.log(`  ${index + 1}. bdName: "${doc.bdName}" (公司: ${doc.companyId}, 日期: ${doc.summaryDate}, 订单: ${doc.orderNo})`);
    });
    
    // 7. 统计清理后的BD名称分布
    const bdDistribution = await ReportOrder.aggregate([
      { $match: { bdName: { $exists: true, $ne: null, $ne: '' } } },
      { $group: { _id: '$bdName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    console.log('📊 清理后BD名称分布（前10）:');
    bdDistribution.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item._id}: ${item.count} 条记录`);
    });
    
  } catch (error) {
    console.error('❌ 清理过程中发生错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

// 执行清理
cleanupReportOrderCase().then(() => {
  console.log('🎯 脚本2执行完成！');
  process.exit(0);
}).catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});