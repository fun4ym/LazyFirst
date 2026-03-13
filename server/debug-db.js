const BdDaily = require('./models/BdDaily');
const ReportOrder = require('./models/ReportOrder');

async function debug() {
  console.log('=== BdDaily 最新5条记录 ===');
  const bdDailies = await BdDaily.find().sort({ date: -1 }).limit(5);
  console.log(JSON.stringify(bdDailies.map(d => ({
    date: d.date,
    salesman: d.salesman,
    sampleCount: d.sampleCount,
    orderCount: d.orderCount,
    commission: d.commission
  })), null, 2));

  console.log('\n=== 03/05 BdDaily 数据 ===');
  const day05 = await BdDaily.find({
    date: { $gte: new Date('2026-03-05'), $lt: new Date('2026-03-06') }
  });
  console.log(JSON.stringify(day05.map(d => ({
    date: d.date,
    salesman: d.salesman,
    sampleCount: d.sampleCount,
    orderCount: d.orderCount
  })), null, 2));

  console.log('\n=== 03/05 ReportOrder 数量 ===');
  const count05 = await ReportOrder.countDocuments({
    createTime: { $gte: new Date('2026-03-05'), $lt: new Date('2026-03-06') }
  });
  console.log('Total:', count05);

  console.log('\n=== 03/05 ReportOrder (sa) ===');
  const count05_sa = await ReportOrder.countDocuments({
    $or: [
      { bdName: 'sa' },
      { bdName: 'Sa' }
    ],
    createTime: { $gte: new Date('2026-03-05'), $lt: new Date('2026-03-06') }
  });
  console.log('sa count:', count05_sa);

  console.log('\n=== 03/06 ReportOrder 数量 ===');
  const count06 = await ReportOrder.countDocuments({
    createTime: { $gte: new Date('2026-03-06'), $lt: new Date('2026-03-07') }
  });
  console.log('Total:', count06);

  console.log('\n=== 03/06 ReportOrder (sa) ===');
  const count06_sa = await ReportOrder.countDocuments({
    $or: [
      { bdName: 'sa' },
      { bdName: 'Sa' }
    ],
    createTime: { $gte: new Date('2026-03-06'), $lt: new Date('2026-03-07') }
  });
  console.log('sa count:', count06_sa);

  await mongoose.connection.close();
}

debug().catch(console.error);
