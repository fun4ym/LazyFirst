/**
 * 清洗脚本：用真实订单(createTime)反算 samplemanagements.isOrderGenerated
 *
 * 业务规则（唯一标准）：
 *   1. 真实订单存在(influencerId + productId + createTime) => 已出单 = true
 *   2. 其余无真实订单 => 已出单 = false
 *   注：sampleStatus='refused'(不合作) 是卖家操作，与"是否出单"无关，绝不因此改变本字段。
 *
 * 用法：
 *   node server/clean_isOrderGenerated.js                              # 干跑，只输出报告
 *   node server/clean_isOrderGenerated.js --apply                      # 真正写入
 *   node server/clean_isOrderGenerated.js --db tap_system --apply      # 指定库名
 *   node server/clean_isOrderGenerated.js --uri "mongodb://user:pwd@host:27017/db?authSource=db" --db tap_system --apply
 */
const { MongoClient } = require('mongodb');

const LOCAL_URI = 'mongodb://localhost:27017';
const URI = process.argv.includes('--uri')
  ? process.argv[process.argv.indexOf('--uri') + 1]
  : LOCAL_URI;
const DB_NAME = process.argv.includes('--db')
  ? process.argv[process.argv.indexOf('--db') + 1]
  : 'tap_system_online';
const APPLY = process.argv.includes('--apply');

const ORDER_KEY_FILTER = { createTime: { $exists: true, $ne: null }, influencerId: { $exists: true, $ne: null }, productId: { $exists: true, $ne: null } };

async function main() {
  const client = await MongoClient.connect(URI, { serverSelectionTimeoutMS: 5000 });
  const db = client.db(DB_NAME);
  const samples = db.collection('samplemanagements');
  const orders = db.collection('reportorders');

  console.log(`\n=== 清洗目标库: ${DB_NAME} (apply=${APPLY}) ===`);

  // 1) 构建真实订单关联键集合
  const orderKeys = new Set();
  let orderScanned = 0;
  const cursor = orders.find(ORDER_KEY_FILTER, { influencerId: 1, productId: 1 });
  while (await cursor.hasNext()) {
    const o = await cursor.next();
    orderKeys.add(String(o.influencerId) + '_' + o.productId);
    orderScanned++;
  }
  console.log(`真实订单(含createTime)扫描: ${orderScanned} 条, 去重关联键: ${orderKeys.size}`);

  // 2) 逐条比对样品（只由真实订单决定，与是否驳回完全无关）
  const changes = [];
  const stats = {
    total: 0, noKey: 0,
    setTrue: 0,            // 漏标：有单 => true
    setFalseNoOrder: 0,    // 多标：无单 => false
    alreadyCorrect: 0,
  };

  const sc = samples.find({});
  while (await sc.hasNext()) {
    const s = await sc.next();
    stats.total++;
    if (!s.influencerId || !s.productId) { stats.noKey++; continue; }
    const key = String(s.influencerId) + '_' + s.productId;
    const hasOrder = orderKeys.has(key);
    const current = !!s.isOrderGenerated;
    const target = hasOrder;  // 唯一标准：只由真实订单决定

    if (current === target) { stats.alreadyCorrect++; continue; }

    let reason;
    if (target === true) { stats.setTrue++; reason = '漏标: 有真实订单'; }
    else { stats.setFalseNoOrder++; reason = '多标: 无真实订单'; }

    changes.push({
      _id: s._id, influencerAccount: s.influencerAccount, productId: s.productId,
      sampleStatus: s.sampleStatus, before: current, after: target, reason,
    });
  }

  // 3) 输出报告
  console.log('\n--- 统计 ---');
  console.log(JSON.stringify(stats, null, 2));
  console.log(`\n待变更记录总数: ${changes.length}`);

  const byReason = {};
  changes.forEach(c => { byReason[c.reason] = (byReason[c.reason] || 0) + 1; });
  console.log('按原因分组:', JSON.stringify(byReason));

  const fs = require('fs');
  const outFile = `/tmp/clean_isOrderGenerated_changes_${DB_NAME}.json`;
  fs.writeFileSync(outFile, JSON.stringify(changes, null, 2));
  console.log(`\n完整变更清单已写入: ${outFile}`);

  // 4) 应用
  if (APPLY) {
    let done = 0;
    for (const c of changes) {
      await samples.updateOne(
        { _id: c._id },
        { $set: { isOrderGenerated: c.after, isOrderGeneratedCleanedAt: new Date() } }
      );
      done++;
    }
    const afterTrue = await samples.countDocuments({ isOrderGenerated: true });
    console.log(`\n✅ 已应用: 更新 ${done} 条。清洗后 isOrderGenerated=true 总数: ${afterTrue}`);
  } else {
    console.log('\n(干跑模式，未写入。加 --apply 执行)');
  }

  await client.close();
}

main().catch(e => { console.error('ERROR', e); process.exit(1); });
