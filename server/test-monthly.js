const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lazyfirst').then(async () => {
  const BdDaily = require('./models/BdDaily');
  
  const records = await BdDaily.find({ salesman: 'sa' }).sort({ date: -1 }).limit(5);
  console.log('Sa BdDaily records:');
  records.forEach(r => {
    console.log({ date: r.date.toISOString(), sampleCount: r.sampleCount, orderCount: r.orderCount, commission: r.commission });
  });
  
  // 获取当前月份的所有记录
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  console.log('\nStart of month:', startOfMonth.toISOString());
  
  const monthlyRecords = await BdDaily.find({
    salesman: 'sa',
    date: { $gte: startOfMonth }
  });
  
  console.log('Monthly records count:', monthlyRecords.length);
  console.log('Total commission:', monthlyRecords.reduce((sum, r) => sum + (r.commission || 0), 0));
  
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
