/**
 * 迁移修复脚本 — 处理迁移后的剩余问题
 * 
 * 用法: node server/migrate_fix_remaining.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tap_system';

async function fix() {
  console.log('========================================');
  console.log('SampleManagement 迁移后修复');
  console.log('========================================\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const db = mongoose.connection.db;
    const sampleCollection = db.collection('samplemanagements');

    // =============================================
    // Fix 1: 处理剩余的字符串类型productId（设为null）
    // =============================================
    console.log('--- Fix 1: 清理无效的字符串productId ---');
    const strPidResult = await sampleCollection.updateMany(
      {
        productId: { $type: 'string' }
      },
      { $set: { productId: null } }
    );
    console.log(`  将 ${strPidResult.modifiedCount} 条记录的字符串productId设为null`);

    // =============================================
    // Fix 2: 确保influencerId字段存在且为有效格式
    // =============================================
    console.log('\n--- Fix 2: 清理无效的influencerId ---');
    // 找出influencerAccount还存在但influencerId没设置好的记录
    const badInfResult = await sampleCollection.updateMany(
      {
        $or: [
          { influencerAccount: { $type: 'string', $ne: '' }, influencerId: { $exists: false } },
          { influencerAccount: { $type: 'string', $ne: '' }, influencerId: null },
          { influencerId: { $type: 'string' } }  // 还是字符串格式的
        ]
      },
      [
        {
          $set: {
            influencerId: {
              $cond: {
                if: { $and: [
                  { $regexMatch: { input: { $toString: '$influencerId' }, regex: '^[0-9a-fA-F]{24}$' } },
                  { $ne: ['$influencerId', null] },
                  { $ne: ['$influencerId', ''] }
                ]},
                then: { $toObjectId: '$influencerId' },
                else: null
              }
            }
          }
        }
      ]
    );
    console.log(`  清理 ${badInfResult.modifiedCount} 条influencerId`);

    // =============================================
    // Fix 3: 确保salesmanId字段正确
    // =============================================
    console.log('\n--- Fix 3: 清理无效的salesmanId ---');
    const badSmResult = await sampleCollection.updateMany(
      {
        salesman: { $exists: true, $ne: null, $ne: '' },
        salesmanId: { $exists: false }
      },
      { $set: { salesmanId: null } }
    );
    
    // 也处理字符串类型的salesmanId
    const strSmResult = await sampleCollection.updateMany(
      {
        salesmanId: { $type: 'string' }
      },
      [
        {
          $set: {
            salesmanId: {
              $cond: {
                if: { $regexMatch: { input: '$salesmanId', regex: '^[0-9a-fA-F]{24}$' } },
                then: { $toObjectId: '$salesmanId' },
                else: null
              }
            }
          }
        }
      ]
    );
    console.log(`  清理 ${badSmResult.modifiedCount + strSmResult.modifiedCount} 条salesmanId`);

    // =============================================
    // Fix 4: 重建唯一索引（使用partialFilterExpression排除null）
    // =============================================
    console.log('\n--- Fix 4: 重建唯一索引 ---');

    // 先删除可能存在的旧索引/新索引
    try {
      await sampleCollection.dropIndex('companyId_1_date_1_influencerId_1_productId_1');
      console.log('  🗑️ 删除已存在的索引');
    } catch (e) {
      console.log(`  ℹ️ 无需删除索引: ${e.message.split('\n')[0]}`);
    }

    // 创建部分唯一索引（只对有值的记录去重）
    try {
      await sampleCollection.createIndex(
        { companyId: 1, date: 1, influencerId: 1, productId: 1 },
        {
          unique: true,
          partialFilterExpression: {
            influencerId: { $type: 'objectId' },
            productId: { $type: 'objectId' }
          }
        }
      );
      console.log('  ✅ 创建部分唯一索引成功 (仅约束非null记录)');
    } catch (e) {
      console.error(`  ❌ 创建索引失败: ${e.message}`);
      
      // 如果还是因为重复，找出重复项
      if (e.message.includes('duplicate key')) {
        console.log('  🔍 查找重复记录...');
        const dupes = await sampleCollection.aggregate([
          { $match: { influencerId: { $type: 'objectId' }, productId: { $type: 'objectId' } } },
          { $group: { _id: { c: '$companyId', d: '$date', i: '$influencerId', p: '$productId' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
          { $match: { count: { $gt: 1 } } },
          { $limit: 10 }
        ]).toArray();
        
        if (dupes.length > 0) {
          console.log('  发现以下重复组合:');
          dupes.forEach(d => console.log(`    count=${d.count}, ids=${d.ids.slice(0,3).join(',')}...`));
        } else {
          console.log('  未发现重复（可能是其他原因）');
        }
      }
    }

    // =============================================
    // 最终统计
    // =============================================
    console.log('\n========================================');
    console.log('✅ 修复完成！');
    console.log('========================================');
    
    const finalStats = await sampleCollection.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          hasProductIdObj: { $sum: { $cond: [{ $eq: [{ $type: '$productId' }, 'objectId'] }, 1, 0] } },
          hasProductIdNull: { $sum: { $cond: [{ $eq: ['$$CURRENT.productId', null] }, 1, 0] } },
          hasInfluencerIdObj: { $sum: { $cond: [{ $eq: [{ $type: '$influencerId' }, 'objectId'] }, 1, 0] } },
          hasSalesmanIdObj: { $sum: { $cond: [{ $eq: [{ $type: '$salesmanId' }, 'objectId'] }, 1, 0] } },
          stillHasOldFields: { $sum: { $cond: [{ $or: [
            { $gt: [{ $size: { $ifNull: ['$productName', []] } }, 0] },
            { $gt: [{ $size: { $ifNull: ['$influencerAccount', []] } }, 0] }
          ]}, 1, 0] } }
        }
      }
    ]).toArray();

    if (finalStats.length > 0) {
      const s = finalStats[0];
      console.log('最终数据统计:');
      console.log(`  总记录数: ${s.total}`);
      console.log(`  有效productId(ObjectId): ${s.hasProductIdObj}`);
      console.log(`  空productId(null): ${s.hasProductIdNull}`);
      console.log(`  有效influencerId(ObjectId): ${s.hasInfluencerIdObj}`);
      console.log(`  有效salesmanId(ObjectId): ${s.hasSalesmanIdObj}`);
    }

  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

fix();
