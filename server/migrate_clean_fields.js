/**
 * 阶段三：清理无业务消费方的冗余字段
 *
 * 经 code-explorer 核实（无消费方）：
 *   - Shop.products（[String]，仅 init-import 局部同名数组，无真实读写）
 *   - ReportOrder.merchandiser / groupInfo / country（server/frontend 均无读写）
 *   - ReportOrder.storeId / activityId / products / currency（Order 合并带入，经核实无消费方）
 *
 * 安全策略（同前）：默认 DRY RUN，--apply 才写入；--mode test|local|prod；--seed 仅 test。
 */
const mongoose = require('mongoose');

const MODES = {
  test: 'mongodb://127.0.0.1:27017/tap_system_merge_test',
  local: 'mongodb://127.0.0.1:27017/tap_system',
  prod: 'mongodb://tapsystem:5Qb0Q9WqztimCNuzfVoX@150.109.183.29:27017/tap_system?authSource=tap_system'
};

const SHOP_UNSET = ['products'];
const REPORT_UNSET = ['merchandiser', 'groupInfo', 'country', 'storeId', 'activityId', 'products', 'currency'];

async function main() {
  const args = process.argv.slice(2);
  const mode = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'test';
  const apply = args.includes('--apply');
  const seed = args.includes('--seed');

  if (!MODES[mode]) { console.error('[migrate-clean-fields] 未知 mode'); process.exit(1); }
  if (mode === 'prod') console.error('[migrate-clean-fields] ⚠️ 正在操作【线上生产库】！请确认已备份且已获主人二次授权。');

  const uriArg = args.find(a => a.startsWith('--uri='));
  const uri = uriArg ? uriArg.slice('--uri='.length) : MODES[mode];
  console.log(`[migrate-clean-fields] mode=${mode} apply=${apply} seed=${seed} uri=${uri.replace(/\/\/[^@]+@/, '//***@')}`);

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const shopCol = db.collection('shops');
  const reportCol = db.collection('reportorders');

  if (seed) {
    if (mode !== 'test') { console.error('[seed] 仅允许 --mode test'); process.exit(1); }
    await shopCol.deleteMany({});
    await reportCol.deleteMany({});
    await shopCol.insertOne({ companyId: new mongoose.Types.ObjectId(), shopName: 'S1', shopNumber: 'N1', products: ['p1', 'p2'] });
    await reportCol.insertOne({
      companyId: new mongoose.Types.ObjectId(), orderNo: 'O1', summaryDate: '2026-01-01',
      merchandiser: 'M', groupInfo: 'G', country: 'CN',
      storeId: new mongoose.Types.ObjectId(), activityId: new mongoose.Types.ObjectId(),
      products: [{ productId: new mongoose.Types.ObjectId() }], currency: 'USD'
    });
    console.log('[seed] 插入带冗余字段的 shop + reportorder 各 1 条');
  }

  let shopN, reportN;
  if (apply) {
    const r1 = await shopCol.updateMany({ products: { $exists: true, $ne: [] } }, { $unset: { products: '' } });
    shopN = r1.modifiedCount;
    const r2 = await reportCol.updateMany(
      { $or: REPORT_UNSET.map(f => ({ [f]: { $exists: true } })) },
      { $unset: Object.fromEntries(REPORT_UNSET.map(f => [f, ''])) }
    );
    reportN = r2.modifiedCount;
  } else {
    shopN = await shopCol.countDocuments({ products: { $exists: true, $ne: [] } });
    reportN = await reportCol.countDocuments({ $or: REPORT_UNSET.map(f => ({ [f]: { $exists: true } })) });
  }

  console.log(`[result] shops 含 products 待清理=${shopN}`);
  console.log(`[result] reportorders 含冗余字段 待清理=${reportN}`);
  if (!apply) console.log('[DRYRUN] 未写入。加 --apply 才执行。');

  await mongoose.disconnect();
}

main().catch(e => { console.error('[migrate-clean-fields] 失败:', e); process.exit(1); });
