/**
 * 阶段三：sampleMethod 枚举统一为 online/offline
 *
 * 背景：Activity.sampleMethod 与 Product.activityConfigs[].sampleMethod 语义相同，原都用中文
 *       枚举 ['线上','线下','']。统一为 online/offline，消除跨表联动不一致（activities.js 会把
 *       Activity 的中文值直接写入 Product.activityConfigs[].sampleMethod）。
 *
 * 覆盖：activities.sampleMethod + products.activityConfigs[].sampleMethod。
 *
 * 安全策略（同 migrate_order_to_reportorder.js）：
 *   - 默认 DRY RUN，仅 --apply 才写入。
 *   - --mode test | local | prod；--seed 仅 test 模式填充合成数据验证。
 *   - 未知值（如非 线上/线下/空）保留不丢。
 */
const mongoose = require('mongoose');

const MODES = {
  test: 'mongodb://127.0.0.1:27017/tap_system_merge_test',
  local: 'mongodb://127.0.0.1:27017/tap_system',
  prod: 'mongodb://tapsystem:5Qb0Q9WqztimCNuzfVoX@150.109.183.29:27017/tap_system?authSource=tap_system'
};

const MAP = { '线上': 'online', '线下': 'offline', '': '' };

function mapVal(v) {
  return Object.prototype.hasOwnProperty.call(MAP, v) ? MAP[v] : v;
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'test';
  const apply = args.includes('--apply');
  const seed = args.includes('--seed');

  if (!MODES[mode]) { console.error('[migrate-sampleMethod] 未知 mode'); process.exit(1); }
  if (mode === 'prod') console.error('[migrate-sampleMethod] ⚠️ 正在操作【线上生产库】！请确认已备份且已获主人二次授权。');

  const uriArg = args.find(a => a.startsWith('--uri='));
  const uri = uriArg ? uriArg.slice('--uri='.length) : MODES[mode];
  console.log(`[migrate-sampleMethod] mode=${mode} apply=${apply} seed=${seed} uri=${uri.replace(/\/\/[^@]+@/, '//***@')}`);

  await mongoose.connect(uri);
  const activitiesCol = mongoose.connection.db.collection('activities');
  const productsCol = mongoose.connection.db.collection('products');

  if (seed) {
    if (mode !== 'test') { console.error('[seed] 仅允许 --mode test'); process.exit(1); }
    await activitiesCol.deleteMany({});
    await productsCol.deleteMany({});
    const base = { startDate: new Date(), endDate: new Date() };
    await activitiesCol.insertMany([
      { companyId: new mongoose.Types.ObjectId(), name: 'A1', sampleMethod: '线上', ...base },
      { companyId: new mongoose.Types.ObjectId(), name: 'A2', sampleMethod: '线下', ...base },
      { companyId: new mongoose.Types.ObjectId(), name: 'A3', sampleMethod: '', ...base },
      { companyId: new mongoose.Types.ObjectId(), name: 'A4', sampleMethod: '其他未知值', ...base }
    ]);
    await productsCol.insertOne({
      companyId: new mongoose.Types.ObjectId(),
      name: 'P1',
      activityConfigs: [
        { sampleMethod: '线上', activityId: new mongoose.Types.ObjectId() },
        { sampleMethod: '线下', activityId: new mongoose.Types.ObjectId() },
        { sampleMethod: '其他', activityId: new mongoose.Types.ObjectId() }
      ]
    });
    console.log('[seed] 插入 4 条 activities + 1 条 product(含3个activityConfigs)');
  }

  // 1. activities.sampleMethod
  const acts = await activitiesCol.find({}).toArray();
  let aChanged = 0, aSkip = 0;
  for (const d of acts) {
    const newV = mapVal(d.sampleMethod);
    if (newV !== d.sampleMethod) {
      if (apply) await activitiesCol.updateOne({ _id: d._id }, { $set: { sampleMethod: newV } });
      aChanged++;
    } else aSkip++;
  }

  // 2. products.activityConfigs[].sampleMethod
  const prods = await productsCol.find({ 'activityConfigs.0': { $exists: true } }).toArray();
  let pChanged = 0;
  for (const p of prods) {
    let need = false;
    const newCfgs = (p.activityConfigs || []).map(ac => {
      const newV = mapVal(ac.sampleMethod);
      if (newV !== ac.sampleMethod) { need = true; return { ...ac, sampleMethod: newV }; }
      return ac;
    });
    if (need) {
      if (apply) await productsCol.updateOne({ _id: p._id }, { $set: { activityConfigs: newCfgs } });
      pChanged++;
    }
  }

  console.log(`[result] activities total=${acts.length} changed=${aChanged} skipped=${aSkip}`);
  console.log(`[result] products(含activityConfigs) total=${prods.length} changed=${pChanged}`);
  if (!apply) console.log('[DRYRUN] 未写入。加 --apply 才执行。');

  await mongoose.disconnect();
}

main().catch(e => { console.error('[migrate-sampleMethod] 失败:', e); process.exit(1); });
