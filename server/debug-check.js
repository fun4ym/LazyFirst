const mongoose = require('mongoose');
require('./db');
const CooperationProduct = require('./server/models/CooperationProduct');
const ReportOrder = require('./server/models/ReportOrder');

async function test() {
  // 查看 CooperationProduct 的 productId 示例
  const products = await CooperationProduct.find({productId: {$exists: true}}).limit(3).select('productId productName _id');
  console.log('=== CooperationProduct ===');
  products.forEach(p => {
    console.log('_id:', p._id.toString());
    console.log('productId:', p.productId);
    console.log('typeof productId:', typeof p.productId);
    console.log('---');
  });
  
  // 查看 ReportOrder 的 productId 示例
  const orders = await ReportOrder.find({productId: {$exists: true}}).limit(3).select('productId productName orderNo');
  console.log('=== ReportOrder ===');
  orders.forEach(o => {
    console.log('productId:', o.productId);
    console.log('typeof productId:', typeof o.productId);
    console.log('orderNo:', o.orderNo);
    console.log('---');
  });
  
  process.exit(0);
}
test();
