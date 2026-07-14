/**
 * 阶段三：Order → ReportOrder 完整合并迁移脚本
 *
 * 安全策略（最高优先级：绝不误伤真实库）：
 *   - 默认 DRY RUN：只扫描并打印计划，不写库、不删任何东西。
 *   - 仅当显式传入 --apply 才真正写入目标库。
 *   - --mode test ：连隔离测试库 mongodb://127.0.0.1:27017/tap_system_merge_test（默认）
 *   - --mode local：连本地开发库 tap_system（破坏性，需 --apply）
 *   - --mode prod ：连线上生产库（禁止，除非显式 --mode prod --apply 且已二次确认）
 *   - --seed      ：仅在 test 模式下生效，清空并填充合成数据用于验证脚本逻辑
 *
 * 迁移逻辑：
 *   1. 读取 orders 全量，逐条映射为 reportorders 文档；
 *      复制所有重叠佣金字段 + Order 独有字段(totalAmount/commissionRate/currency/status/storeId/activityId/products)。
 *   2. summaryDate 由 createTime/orderDate/createdAt 推导 YYYY-MM-DD（兜底 1970-01-01）。
 *   3. 按 orderNo+subOrderNo+companyId upsert 写入 reportorders（天然去重，重复则覆盖）。
 *   4. Commission.orderId 由 Order._id 重映射为对应 ReportOrder._id（按 orderNo+companyId 匹配，取最新）。
 *   5. 注意：orders 集合【不会】被本脚本删除，需人工确认迁移无误后再单独删除。
 */
const mongoose = require('mongoose');

const MODES = {
  test: 'mongodb://127.0.0.1:27017/tap_system_merge_test',
  local: 'mongodb://127.0.0.1:27017/tap_system',
  prod: 'mongodb://tapsystem:5Qb0Q9WqztimCNuzfVoX@150.109.183.29:27017/tap_system?authSource=tap_system'
};

function maskUri(uri) {
  return uri.replace(/\/\/([^@]+)@/, '//***@');
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'test';
  const apply = args.includes('--apply');
  const seed = args.includes('--seed');

  if (!MODES[mode]) {
    console.error('[migrate] 未知 mode，可选: test | local | prod');
    process.exit(1);
  }
  // 线上库强制需要显式 --mode prod --apply，且打印醒目警告
  if (mode === 'prod') {
    console.error('[migrate] ⚠️ 你正在操作【线上生产库】！请确认已备份且已获主人二次授权。');
  }

  const uriArg = args.find(a => a.startsWith('--uri='));
  const uri = uriArg ? uriArg.slice('--uri='.length) : MODES[mode];
  console.log(`[migrate] mode=${mode} apply=${apply} seed=${seed} uri=${maskUri(uri)}`);

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const ordersCol = db.collection('orders');
  const reportCol = db.collection('reportorders');
  const commissionsCol = db.collection('commissions');

  if (seed) {
    if (mode !== 'test') {
      console.error('[migrate] --seed 仅允许在 --mode test 下使用，已中止以免污染真实库');
      process.exit(1);
    }
    await ordersCol.deleteMany({});
    await reportCol.deleteMany({});
    await commissionsCol.deleteMany({});
    const companyId = new mongoose.Types.ObjectId();
    const influencerId = new mongoose.Types.ObjectId();
    const creatorId = new mongoose.Types.ObjectId();
    const base = { companyId, influencerId, creatorId, platform: 'tiktok' };
    const orders = [
      { ...base, orderNo: 'O1', subOrderNo: 'S1', totalAmount: 100, commissionRate: 0.1, currency: 'USD', status: 'completed', createTime: new Date('2026-01-15T10:00:00Z'), shopName: 'ShopA' },
      { ...base, orderNo: 'O1', subOrderNo: 'S2', totalAmount: 200, commissionRate: 0.2, currency: 'USD', status: 'pending', createTime: new Date('2026-01-16T10:00:00Z') },
      { ...base, orderNo: 'O2', subOrderNo: '', totalAmount: 300, commissionRate: 0.15, currency: 'EUR', status: 'completed' }, // 无边createTime → summaryDate 兜底
      { ...base, orderNo: 'O3', subOrderNo: 'S1', totalAmount: 400, commissionRate: 0.3, currency: 'USD', status: 'cancelled', createTime: new Date('2026-02-01T10:00:00Z'), storeId: new mongoose.Types.ObjectId(), activityId: new mongoose.Types.ObjectId(), products: [{ productId: new mongoose.Types.ObjectId(), productName: 'P', quantity: 2, unitPrice: 50, totalAmount: 100 }] }
    ];
    const ins = await ordersCol.insertMany(orders);
    const linkedOrderId = ins.insertedIds[0];
    await commissionsCol.insertOne({
      companyId, influencerId, bdId: new mongoose.Types.ObjectId(),
      orderId: linkedOrderId, orderAmount: 100, commissionAmount: 10, commissionRate: 0.1, status: 'pending'
    });
    console.log(`[seed] 插入 ${orders.length} 条 orders + 1 条 commission（companyId=${companyId}）`);
  }

  // 1. 扫描 orders
  const orders = await ordersCol.find({}).toArray();
  console.log(`[scan] orders 总数 = ${orders.length}`);

  let migrated = 0, conflicts = 0;
  const orderIdToReportId = {};

  for (const o of orders) {
    const companyId = o.companyId;
    const orderNo = o.orderNo;
    const subOrderNo = o.subOrderNo || '';
    const dt = o.createTime || o.orderDate || o.createdAt;
    const summaryDate = dt ? new Date(dt).toISOString().slice(0, 10) : '1970-01-01';

    const doc = {
      companyId,
      orderNo, subOrderNo,
      influencerUsername: o.influencerUsername,
      productId: o.productId, productName: o.productName, sku: o.sku,
      productPrice: o.productPrice, orderQuantity: o.orderQuantity,
      shopName: o.shopName, shopCode: o.shopCode,
      orderStatus: o.orderStatus, contentType: o.contentType, contentId: o.contentId,
      affiliatePartnerCommissionRate: o.affiliatePartnerCommissionRate,
      creatorCommissionRate: o.creatorCommissionRate,
      serviceProviderRewardCommissionRate: o.serviceProviderRewardCommissionRate,
      influencerRewardCommissionRate: o.influencerRewardCommissionRate,
      affiliateServiceProviderShopAdCommissionRate: o.affiliateServiceProviderShopAdCommissionRate,
      influencerShopAdCommissionRate: o.influencerShopAdCommissionRate,
      estimatedCommissionAmount: o.estimatedCommissionAmount,
      estimatedAffiliatePartnerCommission: o.estimatedAffiliatePartnerCommission,
      estimatedServiceProviderRewardCommission: o.estimatedServiceProviderRewardCommission,
      estimatedInfluencerRewardCommission: o.estimatedInfluencerRewardCommission,
      estimatedCreatorCommission: o.estimatedCreatorCommission,
      estimatedInfluencerShopAdPayment: o.estimatedInfluencerShopAdPayment,
      estimatedAffiliateServiceProviderShopAdPayment: o.estimatedAffiliateServiceProviderShopAdPayment,
      actualCommissionAmount: o.actualCommissionAmount,
      actualAffiliatePartnerCommission: o.actualAffiliatePartnerCommission,
      actualCreatorCommission: o.actualCreatorCommission,
      actualServiceProviderRewardCommission: o.actualServiceProviderRewardCommission,
      actualInfluencerRewardCommission: o.actualInfluencerRewardCommission,
      actualAffiliateServiceProviderShopAdPayment: o.actualAffiliateServiceProviderShopAdPayment,
      actualInfluencerShopAdPayment: o.actualInfluencerShopAdPayment,
      returnedProductCount: o.returnedProductCount,
      refundedProductCount: o.refundedProductCount,
      summaryDate,
      createTime: o.createTime,
      orderDeliveryTime: o.orderDeliveryTime,
      commissionSettlementTime: o.commissionSettlementTime,
      paymentNo: o.paymentNo, paymentMethod: o.paymentMethod, paymentAccount: o.paymentAccount,
      iva: o.iva, isr: o.isr, platform: o.platform || 'tiktok', attributionType: o.attributionType,
      influencerId: o.influencerId, creatorId: o.creatorId,
      // —— Order 独有字段（合并后保留）——
      totalAmount: o.totalAmount,
      commissionRate: o.commissionRate,
      currency: o.currency,
      status: o.status,
      storeId: o.storeId,
      activityId: o.activityId,
      products: o.products
    };
    Object.keys(doc).forEach(k => doc[k] === undefined && delete doc[k]);

    if (!apply) {
      migrated++;
      orderIdToReportId[o._id.toString()] = 'DRYRUN';
      continue;
    }

    try {
      const res = await reportCol.findOneAndUpdate(
        { orderNo, subOrderNo, companyId },
        { $set: doc },
        { upsert: true, returnDocument: 'after' }
      );
      orderIdToReportId[o._id.toString()] = res.value?._id?.toString();
      migrated++;
    } catch (e) {
      if (e.code === 11000) {
        conflicts++;
        console.warn(`[conflict] orderNo=${orderNo} subOrderNo=${subOrderNo} company=${companyId} — 唯一索引冲突，已跳过该条`);
      } else {
        throw e;
      }
    }
  }

  // 2. Commission.orderId 重映射
  let commTotal = 0, commRemapped = 0, commUnmatched = 0;
  const commissions = await commissionsCol.find({}).toArray();
  commTotal = commissions.length;
  for (const c of commissions) {
    const oldOrderId = c.orderId;
    if (!oldOrderId) { commUnmatched++; continue; }
    const o = await ordersCol.findOne({ _id: oldOrderId });
    if (!o) { commUnmatched++; continue; }
    const rep = await reportCol.findOne(
      { orderNo: o.orderNo, subOrderNo: o.subOrderNo || '', companyId: o.companyId },
      { sort: { createdAt: -1 } }
    );
    if (!rep) { commUnmatched++; continue; }
    if (apply) {
      await commissionsCol.updateOne({ _id: c._id }, { $set: { orderId: rep._id } });
    }
    commRemapped++;
  }

  console.log(`[result] migrated(orders→reportorders)=${migrated} conflicts=${conflicts}`);
  console.log(`[result] commissions total=${commTotal} remapped=${commRemapped} unmatched=${commUnmatched}`);

  if (apply && mode !== 'test') {
    console.log(`[WARN] 真实库(${mode}) 已写入迁移数据。orders 集合未删除，请人工核对 reportorders/commissions 无误后再单独清理 orders 集合。`);
  }
  if (!apply) {
    console.log('[DRYRUN] 未写入任何数据。加 --apply 才真正执行（test 模式建议先 --seed）。');
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error('[migrate] 失败:', e); process.exit(1); });
