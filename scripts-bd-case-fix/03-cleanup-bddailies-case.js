#!/usr/bin/env node
/**
 * 脚本3：清理bddailies.salesman字段大小写问题
 * 目标：将所有现有统计记录中的salesman字段统一转为小写
 * 执行顺序：3/4
 * 注意：此脚本只清理现有记录，合并重复记录由脚本4处理
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 数据库连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tap_system';

async function cleanupBdDailiesCase() {
  console.log('🚀 开始清理bddailies.salesman字段大小写问题...');
  
  try {
    // 连接数据库
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    // 获取BdDaily模型
    const BdDaily = require('../server/models/BdDaily');
    
    // 1. 首先统计有多少记录需要清理
    const totalCount = await BdDaily.countDocuments({ salesman: { $exists: true, $type: 'string' } });
    console.log(`📊 找到 ${totalCount} 条bddailies记录`);
    
    // 2. 查找有大写字母的记录
    const uppercaseCount = await BdDaily.countDocuments({
      salesman: { 
        $exists: true, 
        $type: 'string',
        $regex: /[A-Z]/ 
      }
    });
    console.log(`📊 其中 ${uppercaseCount} 条记录包含大写字母`);
    
    // 3. 查看大小写重复记录情况（关键问题）
    const duplicateCaseRecords = await BdDaily.aggregate([
      {
        $group: {
          _id: {
            companyId: "$companyId",
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            salesmanLower: { $toLower: "$salesman" }
          },
          records: { $push: "$$ROOT" },
          count: { $sum: 1 },
          hasUpperCase: {
            $max: {
              $cond: [{ $regexMatch: { input: "$salesman", regex: /[A-Z]/ } }, true, false]
            }
          }
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log(`📊 发现 ${duplicateCaseRecords.length} 组大小写重复记录`);
    
    if (duplicateCaseRecords.length > 0) {
      console.log('📋 重复记录组示例（前5组）:');
      duplicateCaseRecords.slice(0, 5).forEach((group, groupIndex) => {
        console.log(`  组 ${groupIndex + 1}: 公司 ${group._id.companyId}, 日期 ${group._id.date}, BD ${group._id.salesmanLower}`);
        console.log(`     包含 ${group.count} 条重复记录（${group.hasUpperCase ? '有大写' : '全小写'}）`);
        group.records.slice(0, 3).forEach((record, recordIndex) => {
          console.log(`     - 记录 ${recordIndex + 1}: salesman="${record.salesman}", sampleCount=${record.sampleCount}, revenue=${record.revenue}`);
        });
      });
    }
    
    if (uppercaseCount === 0 && duplicateCaseRecords.length === 0) {
      console.log('✅ 没有发现需要清理的大小写问题记录');
      return;
    }
    
    // 4. 执行清理：将所有salesman字段转为小写
    console.log('🔄 开始清理现有记录...');
    
    const result = await BdDaily.updateMany(
      { salesman: { $exists: true, $type: 'string' } },
      [
        {
          $set: {
            salesman: {
              $toLower: "$salesman"
            }
          }
        }
      ]
    );
    
    console.log(`✅ 现有记录清理完成！`);
    console.log(`📊 更新统计:`);
    console.log(`   - 匹配记录数: ${result.matchedCount}`);
    console.log(`   - 修改记录数: ${result.modifiedCount}`);
    console.log(`   - 确认更新: ${result.acknowledged ? '是' : '否'}`);
    
    // 5. 验证清理结果
    const remainingUppercase = await BdDaily.countDocuments({
      salesman: { 
        $exists: true, 
        $type: 'string',
        $regex: /[A-Z]/ 
      }
    });
    
    if (remainingUppercase === 0) {
      console.log('🎉 验证通过：所有现有记录的salesman字段已转为小写！');
    } else {
      console.log(`⚠️  警告：仍有 ${remainingUppercase} 条记录包含大写字母`);
    }
    
    // 6. 清理后检查重复记录情况
    const remainingDuplicates = await BdDaily.aggregate([
      {
        $group: {
          _id: {
            companyId: "$companyId",
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            salesman: "$salesman"  // 现在应该都是小写了
          },
          records: { $push: "$$ROOT" },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log(`📊 清理后仍有 ${remainingDuplicates.length} 组完全重复记录（将由脚本4处理）`);
    
    if (remainingDuplicates.length > 0) {
      console.log('📋 完全重复记录组示例（前3组）:');
      remainingDuplicates.slice(0, 3).forEach((group, groupIndex) => {
        console.log(`  组 ${groupIndex + 1}: 公司 ${group._id.companyId}, 日期 ${group._id.date}, BD ${group._id.salesman}`);
        console.log(`     包含 ${group.count} 条完全重复记录`);
        const totalSampleCount = group.records.reduce((sum, record) => sum + (record.sampleCount || 0), 0);
        const totalRevenue = group.records.reduce((sum, record) => sum + (record.revenue || 0), 0);
        console.log(`     统计汇总: sampleCount=${totalSampleCount}, revenue=${totalRevenue}`);
      });
    }
    
    // 7. 显示清理效果统计
    const caseDistribution = await BdDaily.aggregate([
      { $match: { salesman: { $exists: true, $ne: null, $ne: '' } } },
      { $group: { _id: '$salesman', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    console.log('📊 清理后BD名称分布（前10）:');
    caseDistribution.forEach((item, index) => {
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
cleanupBdDailiesCase().then(() => {
  console.log('🎯 脚本3执行完成！');
  process.exit(0);
}).catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});