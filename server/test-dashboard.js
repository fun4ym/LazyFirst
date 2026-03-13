const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lazyfirst').then(async () => {
  const BdDaily = require('./models/BdDaily');
  const ReportOrder = require('./models/ReportOrder');

  // 测试查询逻辑
  const username = 'sa';
  const realName = 'Sa';
  const companyId = '69a7aad8da66cd5145a5f06f';

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log('Query date range:', { yesterday: yesterday.toISOString(), today: today.toISOString() });

  // 查询
  const bdDaily = await BdDaily.findOne({
    companyId: companyId,
    $or: [
      { salesman: username.toLowerCase() },
      { salesman: realName }
    ],
    date: {
      $gte: yesterday,
      $lt: today
    }
  });

  console.log('Yesterday query result:', bdDaily ? 'Found' : 'Not found');

  // 查询最新记录
  const latest = await BdDaily.findOne({
    companyId: companyId,
    $or: [
      { salesman: username.toLowerCase() },
      { salesman: realName }
    ]
  }).sort({ date: -1 });

  console.log('Latest record:', latest ? JSON.stringify({ salesman: latest.salesman, date: latest.date, sampleCount: latest.sampleCount, orderCount: latest.orderCount }, null, 2) : 'Not found');

  // 查询本周订单
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  console.log('WeekAgo:', weekAgo.toISOString());
  
  const recentOrders = await ReportOrder.find({
    companyId: companyId,
    $or: [
      { bdName: username.toLowerCase() },
      { bdName: realName }
    ],
    createTime: { $gte: weekAgo }
  });
  console.log('Recent orders count:', recentOrders.length);
  if (recentOrders.length > 0) {
    console.log('First order:', JSON.stringify({ bdName: recentOrders[0].bdName, orderNo: recentOrders[0].orderNo, createTime: recentOrders[0].createTime }));
  }

  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
