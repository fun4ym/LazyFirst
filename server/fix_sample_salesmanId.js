/**
 * 修复脚本：补全 samplemanagements 表中缺失的 salesmanId
 * 
 * 问题原因：之前BD创建样品时后端没有自动设置salesmanId
 * 
 * 修复策略：
 * 1. 有salesman字符串的 → 通过username映射到User表的ObjectId
 * 2. 无salesman但有creatorId的 → 用creatorId作为salesmanId
 */
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://tapsystem:5Qb0Q9WqztimCNuzfVoX@150.109.183.29:27017/tap_system?authSource=tap_system';

// username → ObjectId 映射表（从User表获取）
const usernameToIdMap = {};

async function fix() {
  console.log('===== 开始修复 samplemanagements.salesmanId =====\n');
  
  const conn = await mongoose.connect(MONGO_URI);
  const db = conn.connection.db;
  
  try {
    // 1. 从User表构建映射
    const users = await db.collection('users').find({}, { username: 1 }).toArray();
    users.forEach(u => {
      usernameToIdMap[u.username] = u._id;
    });
    console.log('User表映射:');
    users.forEach(u => console.log(`  ${u.username} → ${u._id}`));
    
    // 2. 查找所有无salesmanId的记录
    const noSalesmanId = await db.collection('samplemanagements').find({
      $or: [
        { salesmanId: null },
        { salesmanId: { $exists: false } }
      ]
    }).toArray();
    
    console.log(`\n无salesmanId的记录总数: ${noSalesmanId.length}`);
    
    // 3. 分组统计
    const bySalesman = {};
    const noFields = [];
    noSalesmanId.forEach(s => {
      if (s.salesman) {
        bySalesman[s.salesman] = (bySalesman[s.salesman] || 0) + 1;
      } else {
        noFields.push(s);
      }
    });
    
    console.log('\n按旧salesman字段分组:');
    Object.entries(bySalesman).sort((a, b) => b[1] - a[1]).forEach(([name, count]) => {
      const mapped = usernameToIdMap[name];
      console.log(`  ${name}: ${count}条 → ${mapped ? '可映射到 ' + mapped : '⚠️ User表中不存在'}`);
    });
    
    console.log(`\n无salesman也无salesmanId: ${noFields.length}条`);
    noFields.forEach(s => {
      console.log(`  _id=${s._id}, creatorId=${s.creatorId}`);
    });
    
    // 4. 执行修复
    let fixed = 0;
    let skipped = 0;
    
    for (const sample of noSalesmanId) {
      let targetSalesmanId = null;
      
      // 策略1: 通过salesman字符串映射
      if (sample.salesman && usernameToIdMap[sample.salesman]) {
        targetSalesmanId = usernameToIdMap[sample.salesman];
      }
      
      // 策略2: 用creatorId（创建人即BD本人）
      if (!targetSalesmanId && sample.creatorId) {
        targetSalesmanId = sample.creatorId;
      }
      
      if (targetSalesmanId) {
        await db.collection('samplemanagements').updateOne(
          { _id: sample._id },
          { $set: { salesmanId: targetSalesmanId } }
        );
        fixed++;
      } else {
        console.log(`  ⚠️ 跳过 _id=${sample._id}，无法确定salesmanId`);
        skipped++;
      }
    }
    
    console.log(`\n===== 修复完成 =====`);
    console.log(`修复: ${fixed}条`);
    console.log(`跳过: ${skipped}条`);
    
    // 5. 验证
    const remaining = await db.collection('samplemanagements').countDocuments({
      $or: [
        { salesmanId: null },
        { salesmanId: { $exists: false } }
      ]
    });
    console.log(`剩余无salesmanId: ${remaining}条`);
    
    const total = await db.collection('samplemanagements').countDocuments({});
    const withSalesmanId = await db.collection('samplemanagements').countDocuments({
      salesmanId: { $ne: null, $exists: true }
    });
    console.log(`总记录: ${total}, 有salesmanId: ${withSalesmanId}`);
    
  } finally {
    await mongoose.disconnect();
  }
}

fix().catch(err => {
  console.error('修复失败:', err);
  process.exit(1);
});
