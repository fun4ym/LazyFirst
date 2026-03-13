// 调试脚本：检查新产品的订单
const mongoose = require('./server/node_modules/mongoose');

const NEW_PRODUCT_IDS = ['1732208868781426170', '1732288086509783871'];

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/tap_system');

  const ReportOrder = mongoose.model('ReportOrder', new mongoose.Schema({}, { strict: false }), 'reportorders');
  const CooperationProduct = mongoose.model('CooperationProduct', new mongoose.Schema({}, { strict: false }), 'cooperationproducts');

  // 1. 查找这两个产品
  console.log('=== 查找 CooperationProduct ===');
  for (const pid of NEW_PRODUCT_IDS) {
    const product = await CooperationProduct.findOne({ productId: pid });
    if (product) {
      console.log(`productId: ${pid}`);
      console.log(`  _id: ${product._id}`);
      console.log(`  companyId: ${product.companyId}`);
    } else {
      console.log(`productId: ${pid} - 未找到 CooperationProduct`);
    }
  }

  // 2. 查找这两个产品的 ReportOrder
  console.log('\n=== 查找 ReportOrder ===');
  for (const pid of NEW_PRODUCT_IDS) {
    const orders = await ReportOrder.find({ productId: pid });
    console.log(`productId: ${pid} - 订单数: ${orders.length}`);
    if (orders.length > 0) {
      console.log(`  第一条订单 summaryDate: ${orders[0].summaryDate}`);
      console.log(`  第一条订单 companyId: ${orders[0].companyId}`);
    }
  }

  await mongoose.disconnect();
}

main().catch(console.error);
