/**
 * 修复样品重复计数脚本
 * 问题：旧的重复检测逻辑只检查了同一达人，没有检查同一商品，导致 duplicateCount 和 previousSubmissions 错误
 * 修复方法：重新计算每个样本记录的 duplicateCount 和 previousSubmissions，基于同一达人+同一商品（productId）且日期更早的记录
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 连接数据库
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tap_system';

async function fixDuplicateCounts() {
  console.log('=== 开始修复样品重复计数 ===');
  console.log('连接数据库:', MONGODB_URI);
  
  await mongoose.connect(MONGODB_URI);
  console.log('数据库连接成功');
  
  const db = mongoose.connection.db;
  const SampleManagement = mongoose.model('SampleManagement', require('./models/SampleManagement').schema);
  
  // 获取所有样品记录
  console.log('\n[阶段1] 获取所有样品记录...');
  const allSamples = await db.collection('samplemanagements').find({}).toArray();
  console.log(`总记录数: ${allSamples.length}`);
  
  // 按 companyId 分组处理
  const samplesByCompany = {};
  allSamples.forEach(sample => {
    const companyId = sample.companyId?.toString() || 'unknown';
    if (!samplesByCompany[companyId]) {
      samplesByCompany[companyId] = [];
    }
    samplesByCompany[companyId].push(sample);
  });
  
  console.log(`公司数量: ${Object.keys(samplesByCompany).length}`);
  
  let totalUpdated = 0;
  let totalErrors = 0;
  
  // 处理每个公司
  for (const [companyId, companySamples] of Object.entries(samplesByCompany)) {
    console.log(`\n处理公司 ${companyId}, 样本数: ${companySamples.length}`);
    
    // 按 influencerId 和 productId 分组，并按日期排序
    const samplesByInfluencerProduct = {};
    companySamples.forEach(sample => {
      const influencerId = sample.influencerId?.toString() || 'unknown';
      const productId = sample.productId?.toString() || 'unknown';
      const key = `${influencerId}_${productId}`;
      
      if (!samplesByInfluencerProduct[key]) {
        samplesByInfluencerProduct[key] = [];
      }
      samplesByInfluencerProduct[key].push({
        _id: sample._id,
        date: sample.date ? new Date(sample.date) : new Date(),
        createdAt: sample.createdAt ? new Date(sample.createdAt) : new Date(),
        sample
      });
    });
    
    // 对每个分组按日期排序
    Object.keys(samplesByInfluencerProduct).forEach(key => {
      samplesByInfluencerProduct[key].sort((a, b) => {
        // 先按日期，再按创建时间
        if (a.date.getTime() !== b.date.getTime()) {
          return a.date.getTime() - b.date.getTime();
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
    });
    
    // 为每个样本计算正确的 duplicateCount 和 previousSubmissions
    const updates = [];
    
    Object.entries(samplesByInfluencerProduct).forEach(([key, samples]) => {
      // 对于每个样本，查找同一分组中日期更早的记录
      samples.forEach((current, index) => {
        const previous = samples.slice(0, index); // 日期更早的记录
        const duplicateCount = previous.length;
        const previousSubmissions = previous.map(prev => ({
          sampleId: prev._id,
          date: prev.date,
          createdAt: prev.createdAt
        }));
        
        // 只有当 duplicateCount 或 previousSubmissions 与当前值不同时才更新
        const currentDuplicateCount = current.sample.duplicateCount || 0;
        const currentPreviousSubmissions = current.sample.previousSubmissions || [];
        
        // 简单比较：如果 duplicateCount 不同，或者 previousSubmissions 长度不同，则更新
        if (duplicateCount !== currentDuplicateCount || 
            previousSubmissions.length !== currentPreviousSubmissions.length) {
          updates.push({
            filter: { _id: current._id },
            update: {
              $set: {
                duplicateCount: duplicateCount,
                previousSubmissions: previousSubmissions
              }
            }
          });
        }
      });
    });
    
    console.log(`需要更新记录数: ${updates.length}`);
    
    // 批量更新
    if (updates.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        const bulkOps = batch.map(update => ({
          updateOne: {
            filter: update.filter,
            update: update.update,
            upsert: false
          }
        }));
        
        try {
          const result = await db.collection('samplemanagements').bulkWrite(bulkOps);
          console.log(`批次 ${i/batchSize + 1}: 成功更新 ${result.modifiedCount} 条记录`);
          totalUpdated += result.modifiedCount;
        } catch (err) {
          console.error(`批次 ${i/batchSize + 1} 更新失败:`, err.message);
          totalErrors += batch.length;
        }
      }
    }
  }
  
  console.log('\n=== 修复完成 ===');
  console.log(`总更新记录数: ${totalUpdated}`);
  console.log(`总错误数: ${totalErrors}`);
  
  // 验证修复结果
  console.log('\n[验证] 统计修复后 duplicateCount > 0 的记录数...');
  const afterCount = await db.collection('samplemanagements').countDocuments({ duplicateCount: { $gt: 0 } });
  console.log(`duplicateCount > 0 的记录数: ${afterCount}`);
  
  await mongoose.disconnect();
  console.log('\n数据库连接已关闭');
}

fixDuplicateCounts().catch(err => {
  console.error('修复失败:', err);
  process.exit(1);
});