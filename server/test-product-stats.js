const mongoose = require('mongoose');
const Order = require('./models/Order');
const CooperationProduct = require('./models/CooperationProduct');

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lazyfirst')
  .then(async () => {
    console.log('数据库连接成功');

    // 查询合作产品
    const products = await CooperationProduct.find({});
    console.log('\n=== 合作产品列表 ===');
    products.forEach((p, index) => {
      console.log(`${index + 1}. productId: ${p.productId}, productName: ${p.productName || '-'}`);
    });

    // 查询特定产品的订单
    const testProductId = '1732233191748699642';
    console.log(`\n=== 查询商品ID ${testProductId} 的订单 ===`);

    const orders = await Order.find({ productId: testProductId });
    console.log(`找到 ${orders.length} 条订单`);

    if (orders.length > 0) {
      orders.slice(0, 5).forEach((order, index) => {
        console.log(`\n订单 ${index + 1}:`);
        console.log(`  订单号: ${order.orderNo}`);
        console.log(`  商品ID: ${order.productId}`);
        console.log(`  商品名称: ${order.productName}`);
        console.log(`  达人: ${order.influencerUsername}`);
        console.log(`  createTime: ${order.createTime}`);
        console.log(`  createdAt: ${order.createdAt}`);
        console.log(`  总金额: ${order.totalAmount}`);
      });
    }

    // 统计所有订单的商品ID分布
    console.log('\n=== 所有订单的商品ID统计 ===');
    const productStats = await Order.aggregate([
      { $group: { _id: '$productId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    productStats.forEach((stat, index) => {
      console.log(`${index + 1}. 商品ID: ${stat._id}, 订单数: ${stat.count}`);
    });

    process.exit(0);
  })
  .catch(error => {
    console.error('错误:', error);
    process.exit(1);
  });
