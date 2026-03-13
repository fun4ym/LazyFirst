const mongoose = require('./server/node_modules/mongoose');
const BdDaily = require('./server/models/BdDaily');
const SampleManagement = require('./server/models/SampleManagement');
const ReportOrder = require('./server/models/ReportOrder');

// MongoDB连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tap_system';

async function generateLastThreeMonthsData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('已连接到数据库');

    // 生成最近90天的日期列表
    const today = new Date();
    const days = [];
    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(new Date(date));
    }

    console.log(`准备统计最近90天的数据（${days[0].toLocaleDateString()} 至 ${days[days.length-1].toLocaleDateString()}）`);

    let totalCreated = 0;
    let totalUpdated = 0;

    for (const targetDate of days) {
      console.log(`正在处理日期: ${targetDate.toLocaleDateString()}`);

      // 设置日期范围为当天
      const startDate = new Date(targetDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(targetDate);
      endDate.setHours(23, 59, 59, 999);

      // 获取所有公司
      const companies = await mongoose.connection.db.listCollections().toArray();
      const companyIds = await BdDaily.distinct('companyId');

      // 如果没有公司数据，使用默认公司
      const companyId = companyIds.length > 0 ? companyIds[0] : null;

      if (!companyId) {
        console.log('未找到公司，跳过');
        continue;
      }

      // 1. 按BD分组统计样品
      const samples = await SampleManagement.find({
        companyId: companyId,
        date: { $gte: startDate, $lte: endDate }
      });

      const bdStats = {};
      samples.forEach(sample => {
        const salesman = sample.salesman || '未分配';
        if (!bdStats[salesman]) {
          bdStats[salesman] = {
            sampleCount: 0,
            sampleIds: []
          };
        }
        bdStats[salesman].sampleCount++;
        bdStats[salesman].sampleIds.push(sample._id.toString());
      });

      // 2. 本日订单：r.createTime等于该日期
      const orderStats = {};
      const orderRecords = await ReportOrder.find({
        companyId: companyId,
        createTime: { $gte: startDate, $lte: endDate }
      });
      orderRecords.forEach(order => {
        const salesman = order.bdName || '未分配';
        if (!orderStats[salesman]) {
          orderStats[salesman] = {
            estimatedCommissionTotal: 0,
            orderGeneratedCount: 0,
            orderCount: 0,
            orderIds: []
          };
        }
        orderStats[salesman].estimatedCommissionTotal += (order.estimatedCommissionAmount || 0);
        orderStats[salesman].orderIds.push(order._id.toString());
        orderStats[salesman].orderCount++;
      });

      // 3. 佣金：r.commissionSettlementTime等于该日期，且在s中找到有打款单号的记录
      const commissionStats = {};
      // 先获取该日期有打款的sample记录
      const sampleWithPayment = await SampleManagement.find({
        companyId: companyId,
        date: { $gte: startDate, $lte: endDate },
        paymentNo: { $exists: true, $ne: '', $ne: null }
      });

      const samplePaymentMap = new Map();
      sampleWithPayment.forEach(sample => {
        const key = `${sample.productId}_${sample.influencerAccount}`;
        samplePaymentMap.set(key, {
          productId: sample.productId,
          influencerAccount: sample.influencerAccount,
          salesman: sample.salesman || '未分配'
        });
      });

      // 获取该日期commissionSettlementTime的订单
      const settlementOrders = await ReportOrder.find({
        companyId: companyId,
        commissionSettlementTime: { $gte: startDate, $lte: endDate }
      });

      settlementOrders.forEach(order => {
        const key = `${order.productId}_${order.influencerUsername}`;
        const paymentInfo = samplePaymentMap.get(key);
        if (paymentInfo) {
          const salesman = paymentInfo.salesman;
          if (!commissionStats[salesman]) {
            commissionStats[salesman] = {
              commissionTotal: 0,
              revenueIds: [],
              orderCount: 0
            };
          }
          commissionStats[salesman].commissionTotal += (order.actualAffiliatePartnerCommission || 0);
          commissionStats[salesman].revenueIds.push(order._id.toString());
          commissionStats[salesman].orderCount++;
        }
      });

      // 合并统计结果
      const allSalesmen = new Set([
        ...Object.keys(bdStats),
        ...Object.keys(orderStats),
        ...Object.keys(commissionStats)
      ]);

      for (const salesman of allSalesmen) {
        const sampleData = bdStats[salesman] || { sampleCount: 0, sampleIds: [] };
        const orderData = orderStats[salesman] || { estimatedCommissionTotal: 0, orderGeneratedCount: 0, orderCount: 0, orderIds: [] };
        const commissionData = commissionStats[salesman] || { commissionTotal: 0, revenueIds: [], orderCount: 0 };

        // 检查是否已存在
        const existing = await BdDaily.findOne({
          companyId: companyId,
          date: targetDate,
          salesman
        });

        const bdDailyData = {
          companyId: companyId,
          date: targetDate,
          salesman,
          sampleCount: sampleData.sampleCount,
          sampleIds: sampleData.sampleIds.join(','),
          revenue: orderData.estimatedCommissionTotal,
          revenueIds: orderData.orderIds.join(','),
          orderCount: orderData.orderCount,
          commission: commissionData.commissionTotal,
          orderGeneratedCount: orderData.orderIds.length,
          creatorId: null
        };

        if (existing) {
          await BdDaily.findByIdAndUpdate(existing._id, bdDailyData);
          totalUpdated++;
        } else {
          await BdDaily.create(bdDailyData);
          totalCreated++;
        }
      }
    }

    console.log('========================================');
    console.log(`统计完成！`);
    console.log(`总共处理: ${days.length} 天`);
    console.log(`新建记录: ${totalCreated} 条`);
    console.log(`更新记录: ${totalUpdated} 条`);
    console.log('========================================');

  } catch (error) {
    console.error('统计失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

generateLastThreeMonthsData();
