/**
 * 迁移脚本：回填 ReportOrder.influencerId
 *
 * 线上 ReportOrder 仅有 influencerUsername（即达人的 tiktokId），
 * 没有 influencerId 字段，导致 influencer-stats / order-monthly-stats / 前端订单列 全部空转。
 *
 * 本脚本用 influencerUsername 匹配 Influencer.tiktokId，回填 influencerId。
 *
 * 用法：
 *   node migrate_reportorder_influencerId.js                 # dry-run
 *   node migrate_reportorder_influencerId.js --apply        # 真正写入
 *   node migrate_reportorder_influencerId.js --uri <mongo>  # 指定连接串
 */

const mongoose = require('mongoose');

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const uriIndex = args.indexOf('--uri');
const uri = uriIndex >= 0
  ? args[uriIndex + 1]
  : 'mongodb://tapsystem:5Qb0Q9WqztimCNuzfVoX@mongodb:27017/tap_system?authSource=tap_system';

const COMPANY_ID = process.env.COMPANY_ID || null;

async function main() {
  console.log(`连接: ${uri.replace(/\/\/[^@]+@/, '//***@')}`);
  await mongoose.connect(uri);

  const ReportOrder = mongoose.model('ReportOrder', new mongoose.Schema({}, { strict: false }), 'reportorders');
  const Influencer = mongoose.model('Influencer', new mongoose.Schema({}, { strict: false }), 'influencers');

  // 构建 tiktokId -> _id 映射
  const infFilter = COMPANY_ID ? { companyId: COMPANY_ID } : {};
  const infs = await Influencer.find({ ...infFilter, tiktokId: { $exists: true, $ne: '' } }).lean();
  const tiktokMap = {};
  infs.forEach(i => { tiktokMap[i.tiktokId] = i._id; });
  console.log(`加载 Influencer ${infs.length} 条，其中 tiktokId 有效 ${Object.keys(tiktokMap).length} 条`);

  // 待处理订单：有 influencerUsername，但无 influencerId
  const orderFilter = COMPANY_ID ? { companyId: COMPANY_ID } : {};
  const orders = await ReportOrder.find({
    ...orderFilter,
    influencerUsername: { $exists: true, $ne: '' },
    $or: [{ influencerId: null }, { influencerId: { $exists: false } }]
  }).lean();
  console.log(`待处理订单 ${orders.length} 条`);

  let matched = 0, skipped = 0, updated = 0, errors = 0;
  for (const o of orders) {
    const infId = tiktokMap[o.influencerUsername];
    if (!infId) { skipped++; continue; }
    matched++;
    if (apply) {
      try {
        await ReportOrder.updateOne({ _id: o._id }, { $set: { influencerId: infId } });
        updated++;
      } catch (e) {
        errors++;
        console.error(`更新失败 ${o._id}: ${e.message}`);
      }
    }
  }

  console.log(`匹配: ${matched} | 跳过(无匹配): ${skipped} | 更新: ${updated} | 错误: ${errors}`);
  console.log(apply ? '✅ 已写入' : '⚠️ DRY-RUN 模式，加 --apply 真正写入');
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
