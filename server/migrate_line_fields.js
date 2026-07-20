// 迁移脚本：为现有 Influencer / ShopContact / Activity / Product 补全 LINE 新增字段默认值
// 并创建相关复合索引（遵循 m-project.md：脚本改库、不写兼容旧数据逻辑）。
// 用法：node migrate_line_fields.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/database');

async function main() {
  await connectDB();

  const Influencer = require('./models/Influencer');
  const ShopContact = require('./models/ShopContact');
  const Activity = require('./models/Activity');
  const Product = require('./models/Product');

  // 1) 补全缺失字段（schema 已有 default，这里显式物化到库，便于索引与查询）
  const infR = await Influencer.updateMany(
    { lineUserId: { $in: [null, undefined] } },
    { $set: { lineUserId: '', lineBindingToken: '', linkToken: '', lineBoundAt: null } }
  );
  const scR = await ShopContact.updateMany(
    { lineUserId: { $in: [null, undefined] } },
    { $set: { lineUserId: '', lineBindingToken: '', linkToken: '', lineBoundAt: null } }
  );
  const actR = await Activity.updateMany(
    { linePush: { $in: [null, undefined] } },
    {
      $set: {
        linePush: {
          enabled: false,
          audienceCriteria: { categoryTags: [], suitableCategories: [], followerMin: 0, followerMax: 0 },
          lastPushAt: null, lastPushStatus: '', lastRecipientCount: 0, lastMode: '', audienceGroupId: ''
        }
      }
    }
  );
  const prodR = await Product.updateMany(
    { tiktokProductUrl: { $in: [null, undefined] } },
    { $set: { tiktokProductUrl: '' } }
  );

  console.log('[migrate] Influencer:', infR.modifiedCount, 'ShopContact:', scR.modifiedCount,
    'Activity:', actR.modifiedCount, 'Product:', prodR.modifiedCount);

  // 2) 同步索引（创建新增的复合索引）
  await Influencer.syncIndexes();
  await ShopContact.syncIndexes();
  console.log('[migrate] indexes synced');

  await mongoose.disconnect();
  console.log('[migrate] done');
}

main().catch(err => {
  console.error('[migrate] 失败:', err);
  process.exit(1);
});
