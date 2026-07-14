/**
 * 阶段三：SampleManagement 兼容字段回填
 *
 * 背景：SampleManagement 有三个兼容字段，应迁移废弃：
 *   - influencerAccount(String, 达人TikTok ID) → 回填到 influencerId(Influencer._id)
 *   - salesman(String, 业务员姓名/用户名/ID)   → 回填到 salesmanId(User._id)
 *   - isSampleSent(Boolean)                    → 已由 sampleStatus 主字段取代，废弃（模型层删除）
 *
 * 本脚本只做「回填」：把 influencerAccount/salesman 的关联解析进 influencerId/salesmanId。
 * 回填后删除兼容字段才不会再丢失关联（influencerId/salesmanId 是权威字段）。
 *
 * 安全策略（同前）：默认 DRY RUN，--apply 才写入；--mode test|local|prod；--seed 仅 test。
 */
const mongoose = require('mongoose');

const MODES = {
  test: 'mongodb://127.0.0.1:27017/tap_system_merge_test',
  local: 'mongodb://127.0.0.1:27017/tap_system',
  prod: 'mongodb://tapsystem:5Qb0Q9WqztimCNuzfVoX@150.109.183.29:27017/tap_system?authSource=tap_system'
};

const HEX24 = /^[0-9a-fA-F]{24}$/;

async function main() {
  const args = process.argv.slice(2);
  const mode = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'test';
  const apply = args.includes('--apply');
  const seed = args.includes('--seed');

  if (!MODES[mode]) { console.error('[migrate-sample-compat] 未知 mode'); process.exit(1); }
  if (mode === 'prod') console.error('[migrate-sample-compat] ⚠️ 正在操作【线上生产库】！请确认已备份且已获主人二次授权。');

  const uriArg = args.find(a => a.startsWith('--uri='));
  const uri = uriArg ? uriArg.slice('--uri='.length) : MODES[mode];
  console.log(`[migrate-sample-compat] mode=${mode} apply=${apply} seed=${seed} uri=${uri.replace(/\/\/[^@]+@/, '//***@')}`);

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const sampleCol = db.collection('samplemanagements');
  const influencerCol = db.collection('influencers');
  const userCol = db.collection('users');

  if (seed) {
    if (mode !== 'test') { console.error('[seed] 仅允许 --mode test'); process.exit(1); }
    await sampleCol.deleteMany({});
    await influencerCol.deleteMany({});
    await userCol.deleteMany({});
    const companyId = new mongoose.Types.ObjectId();
    const inf = await influencerCol.insertOne({ companyId, tiktokId: 'TT_SEED_1', tiktokName: 'seed_inf' });
    const u = await userCol.insertOne({ companyId, realName: 'BD王', username: 'bdwang' });
    // 一条仅含兼容字段（influencerId/salesmanId 为空），用于验证回填
    await sampleCol.insertOne({
      companyId, productId: 'P_SEED', date: new Date(), sampleStatus: 'sent',
      influencerAccount: 'TT_SEED_1', salesman: 'BD王'
    });
    console.log(`[seed] companyId=${companyId} influencer=${inf.insertedId} user=${u.insertedId}`);
  }

  const samples = await sampleCol.find({}).toArray();
  let infFilled = 0, infSkip = 0, smFilled = 0, smSkip = 0;

  for (const s of samples) {
    // 回填 influencerId（从 influencerAccount 匹配 Influencer.tiktokId）
    if (!s.influencerId && s.influencerAccount) {
      const inf = await influencerCol.findOne({ tiktokId: s.influencerAccount, companyId: s.companyId });
      if (inf) {
        if (apply) {
          try { await sampleCol.updateOne({ _id: s._id }, { $set: { influencerId: inf._id } }); infFilled++; }
          catch (e) { if (e.code === 11000) infSkip++; else throw e; } // 唯一索引冲突则跳过该条
        } else infFilled++;
      } else infSkip++;
    }
    // 回填 salesmanId（从 salesman 匹配 User：_id / realName / username）
    if (!s.salesmanId && s.salesman) {
      let u = null;
      if (typeof s.salesman === 'string' && HEX24.test(s.salesman)) {
        u = await userCol.findOne({ _id: s.salesman, companyId: s.companyId });
      }
      if (!u) u = await userCol.findOne({ realName: s.salesman, companyId: s.companyId });
      if (!u) u = await userCol.findOne({ username: s.salesman, companyId: s.companyId });
      if (u) {
        if (apply) {
          try { await sampleCol.updateOne({ _id: s._id }, { $set: { salesmanId: u._id } }); smFilled++; }
          catch (e) { if (e.code === 11000) smSkip++; else throw e; } // 唯一索引冲突则跳过该条
        } else smFilled++;
      } else smSkip++;
    }
  }

  console.log(`[result] samples total=${samples.length}`);
  console.log(`[result] influencerId 回填=${infFilled} 无法匹配(跳过)=${infSkip}`);
  console.log(`[result] salesmanId 回填=${smFilled} 无法匹配(跳过)=${smSkip}`);
  if (!apply) console.log('[DRYRUN] 未写入。加 --apply 才执行。');

  await mongoose.disconnect();
}

main().catch(e => { console.error('[migrate-sample-compat] 失败:', e); process.exit(1); });
