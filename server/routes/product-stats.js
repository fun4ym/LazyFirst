const router = require('express').Router();
const mongoose = require('mongoose');
const ReportOrder = require('../models/ReportOrder');
const CooperationProduct = require('../models/CooperationProduct');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

// 测试端点 - 不用认证
router.get('/test-order-stats/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    let { companyId } = req.query;

    console.log('=== TEST ENDPOINT ===');
    console.log('productId param:', productId);
    console.log('companyId param:', companyId);

    // 转换 companyId
    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      companyId = new mongoose.Types.ObjectId(companyId);
    } else {
      companyId = null;
    }

    // 获取 TikTok productId
    const coopProduct = await CooperationProduct.findById(productId);
    console.log('CooperationProduct:', coopProduct?._id, coopProduct?.productId);

    if (!coopProduct) {
      return res.json({ success: false, message: '产品不存在' });
    }

    const tiktokProductId = String(coopProduct.productId);
    const sevenDaysAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0];

    const query = { productId: tiktokProductId, summaryDate: { $gte: sevenDaysAgo } };
    if (companyId) query.companyId = companyId;

    console.log('Query:', JSON.stringify(query));

    const orders = await ReportOrder.find(query).limit(10);
    console.log('Found orders:', orders.length);

    res.json({ success: true, productId: tiktokProductId, query, count: orders.length, orders: orders.map(o => ({ summaryDate: o.summaryDate, productId: o.productId })) });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取产品的订单统计
router.get('/order-stats/:productId', authenticate, async (req, res) => {
  try {
    const { productId } = req.params;
    let { companyId } = req.query;

    console.log('=== 后端收到参数 ===');
    console.log('productId:', productId);
    console.log('companyId:', companyId);
    console.log('req.query:', req.query);

    // companyId 需要转换为 ObjectId
    let companyIdQuery = null;
    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      companyIdQuery = new mongoose.Types.ObjectId(companyId);
    }

    console.log('查询订单统计 - productId:', productId, 'companyId:', companyIdQuery);

    // 通过 CooperationProduct._id 获取 TikTok 商品ID
    const cooperationProduct = await CooperationProduct.findById(productId).select('productId');
    if (!cooperationProduct) {
      return res.status(404).json({ success: false, message: '产品不存在' });
    }

    const tiktokProductId = String(cooperationProduct.productId);
    console.log('TikTok商品ID:', tiktokProductId);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

    // 生成日期字符串格式 YYYY-MM-DD
    const formatDateStr = (date) => {
      return date.toISOString().split('T')[0];
    };

    const sevenDaysAgoStr = formatDateStr(sevenDaysAgo);
    const threeMonthsAgoStr = formatDateStr(threeMonthsAgo);

    console.log('日期范围 - 7天:', sevenDaysAgoStr, '3个月:', threeMonthsAgoStr);

    // 查询过去7天的订单 - 使用 ReportOrder 的 summaryDate 字段，productId 字符串匹配
    const query7days = {
      productId: tiktokProductId,
      summaryDate: { $gte: sevenDaysAgoStr }
    };
    if (companyIdQuery) query7days.companyId = companyIdQuery;

    console.log('查询7天订单条件:', JSON.stringify(query7days));

    console.log('=== 准备查询 ReportOrder ===');
    console.log('实际数据库:', mongoose.connection.name);
    console.log('query7days:', JSON.stringify(query7days));
    
    const sevenDaysOrders = await ReportOrder.find(query7days)
    .select('orderNo influencerUsername productId productName gmv bdName summaryDate creatorId productPrice orderQuantity')
    .sort({ summaryDate: -1 })
    .limit(100);

    // 查询过去3个月的订单
    const query3months = {
      productId: tiktokProductId,
      summaryDate: { $gte: threeMonthsAgoStr }
    };
    if (companyIdQuery) query3months.companyId = companyIdQuery;

    const threeMonthsOrders = await ReportOrder.find(query3months)
    .select('orderNo influencerUsername productId productName gmv bdName summaryDate creatorId productPrice orderQuantity')
    .sort({ summaryDate: -1 })
    .limit(500);

    console.log('=== DEBUG: 查询结果 - 7天订单数:', sevenDaysOrders.length, '3个月订单数:', threeMonthsOrders.length);

    // 获取 BD 名称
    const allCreatorIds = [
      ...new Set([
        ...sevenDaysOrders.filter(o => o.creatorId).map(o => o.creatorId.toString()),
        ...threeMonthsOrders.filter(o => o.creatorId).map(o => o.creatorId.toString())
      ])
    ];
    
    const bdMap = {};
    if (allCreatorIds.length > 0) {
      const bds = await User.find({ _id: { $in: allCreatorIds } }).select('username realName name');
      bds.forEach(bd => {
        bdMap[bd._id.toString()] = bd.realName || bd.name || bd.username || '未知';
      });
    }

    // 转换数据格式以适配前端
    const transformOrders = (orders) => {
      return orders.map(order => {
        // 计算交易金额：优先使用 gmv，如果没有则用 productPrice * orderQuantity
        const totalAmount = order.gmv || (order.productPrice || 0) * (order.orderQuantity || 0);
        
        // 获取 BD 名称：优先使用 bdName，否则从 creatorId 查表
        let creatorName = order.bdName;
        if (!creatorName && order.creatorId) {
          creatorName = bdMap[order.creatorId.toString()] || '未知';
        }
        if (!creatorName) {
          creatorName = '-';
        }
        
        return {
          orderNo: order.orderNo || '-',
          influencerUsername: order.influencerUsername || '-',
          productId: order.productId,
          productName: order.productName || '-',
          totalAmount,
          createTime: order.summaryDate,
          creatorName
        };
      });
    };

    res.json({
      success: true,
      data: {
        sevenDaysCount: sevenDaysOrders.length,
        sevenDaysOrders: transformOrders(sevenDaysOrders),
        threeMonthsCount: threeMonthsOrders.length,
        threeMonthsOrders: transformOrders(threeMonthsOrders)
      }
    });
  } catch (error) {
    console.error('获取订单统计失败:', error);
    res.status(500).json({ success: false, message: '获取订单统计失败' });
  }
});

// 获取产品销售报表数据
router.get('/sales-report/:productId', authenticate, async (req, res) => {
  try {
    const { productId } = req.params;
    let { companyId, period = '7days' } = req.query;

    // 转换 companyId 为 ObjectId
    if (companyId && !mongoose.Types.ObjectId.isValid(companyId)) {
      companyId = null;
    } else if (companyId) {
      companyId = new mongoose.Types.ObjectId(companyId);
    }

    console.log('查询销售报表 - productId:', productId, 'period:', period);

    // 通过 CooperationProduct._id 获取 TikTok 商品ID
    const cooperationProduct = await CooperationProduct.findById(productId).select('productId');
    if (!cooperationProduct) {
      return res.status(404).json({ success: false, message: '产品不存在' });
    }

    const tiktokProductId = String(cooperationProduct.productId);
    console.log('TikTok商品ID:', tiktokProductId);

    const now = new Date();
    let startDateStr, endDateStr;

    // 根据期间确定日期范围
    switch (period) {
      case '7days':
        startDateStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        endDateStr = now.toISOString().split('T')[0];
        break;
      case '14days':
        startDateStr = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        endDateStr = now.toISOString().split('T')[0];
        break;
      case 'month':
        startDateStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDateStr = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      default:
        startDateStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        endDateStr = now.toISOString().split('T')[0];
    }

    // 查询 ReportOrder - 使用 summaryDate 字段，productId 字符串匹配
    const orderQuery = {
      productId: tiktokProductId,
      summaryDate: { $gte: startDateStr, $lte: endDateStr }
    };
    if (companyId) orderQuery.companyId = companyId;

    const orders = await ReportOrder.find(orderQuery)
    .select('orderNo influencerUsername productId productName gmv bdName summaryDate creatorId productPrice orderQuantity')
    .sort({ summaryDate: 1 });

    console.log('查询结果 - 总订单数:', orders.length);

    // 获取 BD 名称
    const creatorIds = [...new Set(orders.filter(o => o.creatorId).map(o => o.creatorId.toString()))];
    const bdMap = {};
    if (creatorIds.length > 0) {
      const bds = await User.find({ _id: { $in: creatorIds } }).select('username realName name');
      bds.forEach(bd => {
        bdMap[bd._id.toString()] = bd.realName || bd.name || bd.username || '未知';
      });
    }

    // 计算每笔订单的实际金额
    const ordersWithAmount = orders.map(order => ({
      ...order.toObject(),
      actualAmount: order.gmv || (order.productPrice || 0) * (order.orderQuantity || 0)
    }));

    // 统计按天的销售量（使用订单数）和销售额
    const dailySales = {};
    ordersWithAmount.forEach(order => {
      const dateKey = order.summaryDate;
      if (!dailySales[dateKey]) {
        dailySales[dateKey] = { count: 0, amount: 0 };
      }
      dailySales[dateKey].count++;
      dailySales[dateKey].amount += order.actualAmount;
    });

    // 生成日期序列
    const dateArray = [];
    const salesArray = [];
    const amountArray = [];
    let currentDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dateArray.push(dateKey);
      salesArray.push(dailySales[dateKey]?.count || 0);
      amountArray.push(dailySales[dateKey]?.amount || 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 统计BD销售量（根据 creatorId 关联查询）
    const bdSales = {};
    ordersWithAmount.forEach(order => {
      // 获取 BD 名称：优先使用 bdName，否则从 creatorId 查表
      let bdName = order.bdName;
      if (!bdName && order.creatorId) {
        bdName = bdMap[order.creatorId.toString()] || '未知';
      }
      if (!bdName) {
        bdName = '-';
      }
      
      if (!bdSales[bdName]) {
        bdSales[bdName] = {
          bdName,
          count: 0,
          amount: 0,
          orders: []
        };
      }
      bdSales[bdName].count++;
      bdSales[bdName].amount += order.actualAmount;
      bdSales[bdName].orders.push({
        orderNo: order.orderNo || '-',
        createTime: order.summaryDate,
        totalAmount: order.actualAmount
      });
    });

    // 排序并取前5
    const bdStats = Object.values(bdSales)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // 统计达人销售量（根据 influencerUsername）
    const influencerSales = {};
    ordersWithAmount.forEach(order => {
      const influencerName = order.influencerUsername || '未知';
      if (!influencerSales[influencerName]) {
        influencerSales[influencerName] = {
          influencerName,
          count: 0,
          amount: 0,
          orders: []
        };
      }
      influencerSales[influencerName].count++;
      influencerSales[influencerName].amount += order.actualAmount;
      influencerSales[influencerName].orders.push({
        orderNo: order.orderNo || '-',
        createTime: order.summaryDate,
        totalAmount: order.actualAmount
      });
    });

    // 排序并取前10
    const influencerStats = Object.values(influencerSales)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // 计算总销售额
    const totalAmount = ordersWithAmount.reduce((sum, o) => sum + o.actualAmount, 0);

    res.json({
      success: true,
      data: {
        period,
        startDate: startDateStr,
        endDate: endDateStr,
        totalOrders: orders.length,
        totalAmount,
        dailySales: {
          dates: dateArray,
          sales: salesArray,
          amounts: amountArray
        },
        bdStats,
        influencerStats
      }
    });
  } catch (error) {
    console.error('获取销售报表失败:', error);
    res.status(500).json({ success: false, message: '获取销售报表失败' });
  }
});

// 获取达人的订单统计
router.get('/influencer-order-stats', authenticate, async (req, res) => {
  try {
    let { influencerIds, companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ success: false, message: '缺少companyId参数' });
    }

    if (!influencerIds) {
      return res.status(400).json({ success: false, message: '缺少influencerIds参数' });
    }

    const influencerIdList = influencerIds.split(',');
    const companyIdObj = new mongoose.Types.ObjectId(companyId);

    // 先获取这些达人的 tiktokId 列表
    const Influencer = require('../models/Influencer');
    const influencers = await Influencer.find({
      _id: { $in: influencerIdList.map(id => new mongoose.Types.ObjectId(id)) }
    }).lean();

    // 建立 _id -> tiktokId 的映射
    const idToTiktokId = {};
    const tiktokIds = [];
    influencers.forEach(inf => {
      idToTiktokId[inf._id.toString()] = inf.tiktokId;
      tiktokIds.push(inf.tiktokId);
    });

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 使用 influencerUsername (tiktokId) 来匹配订单
    const stats = await ReportOrder.aggregate([
      {
        $match: {
          companyId: companyIdObj,
          influencerUsername: { $in: tiktokIds }
        }
      },
      {
        $group: {
          _id: '$influencerUsername',
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          lastWeekCount: {
            $sum: { $cond: [{ $gte: ['$createTime', oneWeekAgo] }, 1, 0] }
          },
          lastMonthCount: {
            $sum: { $cond: [{ $gte: ['$createTime', oneMonthAgo] }, 1, 0] }
          }
        }
      }
    ]);

    // 转换为 map 方便查找 (用 tiktokId 作为 key)
    const statsMap = {};
    stats.forEach(s => {
      statsMap[s._id] = {
        totalOrders: s.totalOrders || 0,
        totalAmount: s.totalAmount || 0,
        lastWeekCount: s.lastWeekCount || 0,
        lastMonthCount: s.lastMonthCount || 0
      };
    });

    // 为每个 influencer 返回统计结果 (通过 tiktokId 匹配)
    const result = influencerIdList.map(id => {
      const idStr = id.toString();
      const tiktokId = idToTiktokId[idStr];
      const stat = tiktokId ? (statsMap[tiktokId] || { totalOrders: 0, totalAmount: 0, lastWeekCount: 0, lastMonthCount: 0 }) : { totalOrders: 0, totalAmount: 0, lastWeekCount: 0, lastMonthCount: 0 };
      return {
        influencerId: idStr,
        stats: stat
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取达人订单统计失败:', error);
    res.status(500).json({ success: false, message: '获取达人订单统计失败' });
  }
});

module.exports = router;
