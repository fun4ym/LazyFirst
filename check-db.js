const mongoose = require('./server/node_modules/mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/tap_system').then(async () => {
  const ReportOrder = mongoose.model('ReportOrder', new mongoose.Schema({}, {strict:false}), 'reportorders');
  const CoopProduct = mongoose.model('CooperationProduct', new mongoose.Schema({}, {strict:false}), 'cooperationproducts');

  // 获取产品信息
  const p = await CoopProduct.findById('69b11eecfa5ffe7e60cdcf7c');
  console.log('产品 productId:', p?.productId);
  
  // 查询订单
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0];
  
  const orders = await ReportOrder.find({
    productId: String(p?.productId),
    summaryDate: { $gte: sevenDaysAgo }
  });
  
  console.log('日期范围:', sevenDaysAgo, 'to', today);
  console.log('查询到订单数:', orders.length);
  orders.forEach(o => console.log('  -', o.productId, o.summaryDate));
  
  await mongoose.disconnect();
});
