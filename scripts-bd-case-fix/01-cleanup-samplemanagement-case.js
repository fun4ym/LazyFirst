#!/usr/bin/env node
/**
 * 脚本1：清理SampleManagement.salesman字段大小写问题
 * 目标：将所有salesman字段统一转为小写
 * 执行顺序：1/4
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 数据库连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tap_system';

async function cleanupSampleManagementCase() {
  console.log('🚀 开始清理SampleManagement.salesman字段大小写问题...');
  
  try {
    // 连接数据库
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    // 获取SampleManagement模型
    const SampleManagement = require('../server/models/SampleManagement');
    
    // 1. 首先统计有多少记录需要清理
    const totalCount = await SampleManagement.countDocuments({ salesman: { $exists: true, $type: 'string' } });
    console.log(`📊 找到 ${totalCount} 条包含salesman字段的记录`);
    
    // 2. 查找有大写字母的记录
    const uppercaseCount = await SampleManagement.countDocuments({
      salesman: { 
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
    const uppercaseSamples = await SampleManagement.find({
      salesman: { 
        $exists: true, 
        $type: 'string',
        $regex: /[A-Z]/ 
      }
    }).limit(5).select('salesman date companyId');
    
    console.log('📋 大写记录示例:');
    uppercaseSamples.forEach((doc, index) => {
      console.log(`  ${index + 1}. salesman: "${doc.salesman}" (公司: ${doc.companyId}, 日期: ${doc.date})`);
    });
    
    // 4. 执行清理：将所有salesman字段转为小写
    console.log('🔄 开始清理...');
    
    // 使用聚合管道更新，确保只更新字符串类型的字段
    const result = await SampleManagement.updateMany(
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
    
    console.log(`✅ 清理完成！`);
    console.log(`📊 更新统计:`);
    console.log(`   - 匹配记录数: ${result.matchedCount}`);
    console.log(`   - 修改记录数: ${result.modifiedCount}`);
    console.log(`   - 确认更新: ${result.acknowledged ? '是' : '否'}`);
    
    // 5. 验证清理结果
    const remainingUppercase = await SampleManagement.countDocuments({
      salesman: { 
        $exists: true, 
        $type: 'string',
        $regex: /[A-Z]/ 
      }
    });
    
    if (remainingUppercase === 0) {
      console.log('🎉 验证通过：所有salesman字段已转为小写！');
    } else {
      console.log(`⚠️  警告：仍有 ${remainingUppercase} 条记录包含大写字母`);
    }
    
    // 6. 显示清理后的示例
    const cleanedSamples = await SampleManagement.find({
      _id: { $in: uppercaseSamples.map(doc => doc._id) }
    }).select('salesman date companyId');
    
    console.log('📋 清理后示例:');
    cleanedSamples.forEach((doc, index) => {
      console.log(`  ${index + 1}. salesman: "${doc.salesman}" (公司: ${doc.companyId}, 日期: ${doc.date})`);
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
cleanupSampleManagementCase().then(() => {
  console.log('🎯 脚本1执行完成！');
  process.exit(0);
}).catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});