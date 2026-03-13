// 调试：检查后端查询
const mongoose = require('./server/node_modules/mongoose');

const COOPERATION_PRODUCT_ID = '69b11eecfa5ffe7e60cdcf7c'; // productId = 1732288086509783871
const COMPANY_ID = '69a7aad8da66cd5145a5f06f';

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/tap_system');

  const ReportOrder = mongoose.model('ReportOrder', new mongoose.Schema({}, { strict: false }), 'reportorders');
  const CooperationProduct = mongoose.model('CooperationProduct', new mongoose.Schema({}, { strict: false }), 'cooperationproducts');

  // 1. 通过 CooperationProduct._id 获取 TikTok 商品ID
  const cooperationProduct = await CooperationProduct.findById(COOPERATION_PRODUCT_ID);
  console.log('=== CooperationProduct ===');
  console.log('_id:', cooperationProduct?._id);
  console.log('productId:', cooperationProduct?.productId);
  console.log('productId type:', typeof cooperationProduct?.productId);

  const tiktokProductId = String(cooperationProduct?.productId);
  console.log('tiktokProductId:', tiktokProductId);

  // 2. 模拟后端查询
  const companyIdObj = new mongoose.Types.ObjectId(COMPANY_ID);
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  console.log('\n=== 查询条件 ===');
  console.log('companyId (ObjectId):', companyIdObj);
  console.log('productId (string):', tiktokProductId);
  console.log('summaryDate:', { $gte: sevenDaysAgoStr });

  // 3. 查询
  const orders = await ReportOrder.find({
    companyId: companyIdObj,
    productId: tiktokProductId,
    summaryDate: { $gte: sevenDaysAgoStr }
  });

  console.log('\n=== 查询结果 ===');
  console.log('订单数:', orders.length);

  // 4. 不用 companyId 过滤试试
  console.log('\n=== 不用 companyId 过滤 ===');
  const orders2 = await ReportOrder.find({
    productId: tiktokProductId,
    summaryDate: { $gte: sevenDaysAgoStr }
  });
  console.log('订单数:', orders2.length);

  // 5. 不用日期过滤试试
  console.log('\n=== 不用日期过滤 ===');
  const orders3 = await ReportOrder.find({
    productId: tiktokProductId
  });
  console.log('订单数:', orders3.length);
  if (orders3.length > 0) {
    console.log('第一条订单:', orders3[0].summaryDate);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
