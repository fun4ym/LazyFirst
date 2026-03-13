const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/tap_system');

mongoose.connection.on('open', async () => {
  console.log('数据库:', mongoose.connection.name);
  
  const coopProduct = await mongoose.connection.db.collection('cooperationproducts').findOne({ _id: new mongoose.Types.ObjectId('69b11eecfa5ffe7e60cdcf7c') });
  console.log('产品:', coopProduct?._id, 'productId:', coopProduct?.productId);
  
  if (coopProduct) {
    const tiktokProductId = String(coopProduct.productId);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    
    console.log('查询条件 - productId:', tiktokProductId, 'date >=:', sevenDaysAgoStr);
    
    const orders = await mongoose.connection.db.collection('reportorders').find({
      productId: tiktokProductId,
      summaryDate: { $gte: sevenDaysAgoStr }
    }).limit(5).toArray();
    
    console.log('订单数:', orders.length);
  }
  
  mongoose.connection.close();
});
