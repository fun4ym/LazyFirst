const router = require('express').Router();
const mongoose = require('mongoose');
const ReportOrder = require('../models/ReportOrder');
const Product = require('../models/Product');
const User = require('../models/User');
const SampleManagement = require('../models/SampleManagement');
const Influencer = require('../models/Influencer');
const { authenticate, authorize } = require('../middleware/auth');

// 获取商品统计概览
router.get('/overview', authenticate, authorize('products:read'), async (req, res) => {
  try {
    let { companyId, startDate, endDate } = req.query;
    
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ success: false, message: '缺少或无效的companyId参数' });
    }
    
    companyId = new mongoose.Types.ObjectId(companyId);
    
    // 默认查询过去30天
    const now = new Date();
    if (!endDate) endDate = now.toISOString().split('T')[0];
    if (!startDate) {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = thirtyDaysAgo.toISOString().split('T')[0];
    }
    
    console.log('商品统计概览 - 查询参数:', { companyId, startDate, endDate });
    
    // 订单统计 - 只统计已成交的订单（有支付单号的订单）
    const orderStats = await ReportOrder.aggregate([
      {
        $match: {
          companyId,
          summaryDate: { $gte: startDate, $lte: endDate },
          paymentNo: { $ne: '' },  // 有支付单号表示已成交
          creatorId: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: { $multiply: ['$productPrice', '$orderQuantity'] } },
          totalProducts: { $addToSet: '$productId' }
        }
      },
      {
        $project: {
          totalOrders: 1,
          totalAmount: 1,
          totalProducts: { $size: '$totalProducts' },
          avgOrderValue: {
            $cond: [{ $eq: ['$totalOrders', 0] }, 0, { $divide: ['$totalAmount', '$totalOrders'] }]
          }
        }
      }
    ]);
    
    // 申样统计
    const sampleQuery = {
      companyId,
      date: { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate + 'T23:59:59.999Z') 
      }
    };
    
    const samples = await SampleManagement.find(sampleQuery).select('sampleStatus productId');
    const totalApplications = samples.length;
    const totalShipped = samples.filter(s => s.sampleStatus === 'shipping' || s.sampleStatus === 'sent').length;
    // 申样商品数 = 去重后的productId数量
    const productIdSet = new Set(samples.map(s => s.productId?.toString()).filter(Boolean));
    const totalProducts = productIdSet.size;
    // 平均申样率 = 寄出数/申样数 * 100%，返回整数（如75表示75%）
    const avgSampleRate = totalApplications > 0 ? Math.round((totalShipped / totalApplications) * 100) : 0;
    
    const result = {
      orders: orderStats.length > 0 ? {
        totalOrders: orderStats[0].totalOrders,
        totalAmount: Math.round(orderStats[0].totalAmount * 100) / 100,
        totalProducts: orderStats[0].totalProducts,
        avgOrderValue: Math.round(orderStats[0].avgOrderValue * 100) / 100
      } : {
        totalOrders: 0,
        totalAmount: 0,
        totalProducts: 0,
        avgOrderValue: 0
      },
      samples: {
        totalApplications,
        totalShipped,
        avgSampleRate,
        totalProducts
      }
    };
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取商品统计概览失败:', error);
    res.status(500).json({ success: false, message: '获取商品统计概览失败' });
  }
});

// 获取商品成交排行
router.get('/product-ranking', authenticate, authorize('products:read'), async (req, res) => {
  try {
    let { companyId, startDate, endDate, sortBy = 'orderCount' } = req.query;
    
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ success: false, message: '缺少或无效的companyId参数' });
    }
    
    companyId = new mongoose.Types.ObjectId(companyId);
    
    // 默认查询过去30天
    const now = new Date();
    if (!endDate) endDate = now.toISOString().split('T')[0];
    if (!startDate) {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = thirtyDaysAgo.toISOString().split('T')[0];
    }
    
    console.log('商品成交排行 - 查询参数:', { companyId, startDate, endDate, sortBy });
    
    // 聚合查询：按productId分组统计
    const pipeline = [
      {
        $match: {
          companyId,
          summaryDate: { $gte: startDate, $lte: endDate },
          paymentNo: { $ne: '' },  // 有支付单号表示已成交
          creatorId: { $exists: true, $ne: null }  // 过滤creatorId为空的订单
        }
      },
      {
        $group: {
          _id: '$productId',
          productName: { $first: '$productName' },
          orderCount: { $sum: 1 },
          // 成交额 = 商品价格 × 下单件数
          amount: { $sum: { $multiply: ['$productPrice', '$orderQuantity'] } },
          bdSet: { $addToSet: '$creatorId' },
          influencerSet: { $addToSet: '$influencerUsername' }
        }
      },
      {
        $project: {
          productId: '$_id',
          productName: 1,
          orderCount: 1,
          amount: 1,  // 成交额
          bdCount: { $size: '$bdSet' },
          influencerCount: { $size: '$influencerSet' }
        }
      }
    ];
    
    // 排序
    if (sortBy === 'orderCount') {
      pipeline.push({ $sort: { orderCount: -1 } });
    } else if (sortBy === 'amount') {
      pipeline.push({ $sort: { amount: -1 } });
    }
    
    pipeline.push({ $limit: 50 });
    
    const ranking = await ReportOrder.aggregate(pipeline);
    
    // 获取商品详细信息（从Product集合）
    const tiktokProductIds = ranking.map(r => r.productId).filter(Boolean);
    const products = await Product.find({ tiktokProductId: { $in: tiktokProductIds } }).select('_id tiktokProductId name productImages images');
    
    // 建立映射
    const productMap = {};
    const productImageMap = {};
    products.forEach(p => {
      productMap[p.tiktokProductId] = p._id.toString();
      // 优先使用 productImages，其次 images
      const firstImage = (p.productImages && p.productImages.length > 0) 
        ? p.productImages[0] 
        : ((p.images && p.images.length > 0) ? p.images[0] : '');
      productImageMap[p.tiktokProductId] = firstImage;
    });
    
    // 添加productObjectId和productImage字段
    const result = ranking.map(r => ({
      ...r,
      productObjectId: productMap[r.productId] || null,
      productImage: r.productId ? (productImageMap[r.productId] || '') : '',
      productId: r.productId || ''
    }));
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取商品成交排行失败:', error);
    res.status(500).json({ success: false, message: '获取商品成交排行失败' });
  }
});

// 获取商品订单构成详情
router.get('/product-detail/:productId', authenticate, authorize('products:read'), async (req, res) => {
  try {
    const { productId } = req.params;
    let { companyId, startDate, endDate } = req.query;
    
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ success: false, message: '缺少或无效的companyId参数' });
    }
    
    companyId = new mongoose.Types.ObjectId(companyId);
    
    // 默认查询过去30天
    const now = new Date();
    if (!endDate) endDate = now.toISOString().split('T')[0];
    if (!startDate) {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = thirtyDaysAgo.toISOString().split('T')[0];
    }
    
    console.log('商品订单构成详情 - 查询参数:', { productId, companyId, startDate, endDate });
    
    // 查询该商品的订单
    const orders = await ReportOrder.find({
      companyId,
      productId,
      summaryDate: { $gte: startDate, $lte: endDate }
    }).select('influencerUsername bdName creatorId gmv');
    
    // 获取BD名称映射
    const creatorIds = [...new Set(orders.map(o => o.creatorId).filter(Boolean))];
    const bdMap = {};
    if (creatorIds.length > 0) {
      const bds = await User.find({ _id: { $in: creatorIds } }).select('username realName name');
      bds.forEach(bd => {
        bdMap[bd._id.toString()] = bd.realName || bd.name || bd.username || '未知';
      });
    }
    
    // 按达人和BD聚合
    const detailMap = {};
    orders.forEach(order => {
      const key = `${order.influencerUsername}_${order.creatorId}`;
      if (!detailMap[key]) {
        detailMap[key] = {
          influencerName: order.influencerUsername || '未知',
          influencerUsername: order.influencerUsername || '未知',
          bdName: order.bdName || (order.creatorId ? (bdMap[order.creatorId.toString()] || '未知') : '未知'),
          orderCount: 0,
          gmv: 0
        };
      }
      detailMap[key].orderCount++;
      detailMap[key].gmv += (order.gmv || 0);
    });
    
    const detail = Object.values(detailMap);
    
    // 计算GMV占比
    const totalGMV = detail.reduce((sum, d) => sum + d.gmv, 0);
    detail.forEach(d => {
      d.gmvPercent = totalGMV > 0 ? Math.round((d.gmv / totalGMV) * 100) : 0;
    });
    
    // 按GMV排序
    detail.sort((a, b) => b.gmv - a.gmv);
    
    res.json({ success: true, data: detail });
  } catch (error) {
    console.error('获取商品订单构成详情失败:', error);
    res.status(500).json({ success: false, message: '获取商品订单构成详情失败' });
  }
});

// 获取BD贡献排行
router.get('/bd-ranking', authenticate, authorize('products:read'), async (req, res) => {
  try {
    let { companyId, startDate, endDate } = req.query;
    
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ success: false, message: '缺少或无效的companyId参数' });
    }
    
    companyId = new mongoose.Types.ObjectId(companyId);
    
    // 默认查询过去30天
    const now = new Date();
    if (!endDate) endDate = now.toISOString().split('T')[0];
    if (!startDate) {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = thirtyDaysAgo.toISOString().split('T')[0];
    }
    
    console.log('BD贡献排行 - 查询参数:', { companyId, startDate, endDate });
    
    // 聚合查询：按creatorId分组统计
    const pipeline = [
      {
        $match: {
          companyId,
          summaryDate: { $gte: startDate, $lte: endDate },
          paymentNo: { $ne: '' },  // 有支付单号表示已成交
          creatorId: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$creatorId',
          orderCount: { $sum: 1 },
          // 成交额 = 商品价格 × 下单件数
          amount: { $sum: { $multiply: ['$productPrice', '$orderQuantity'] } },
          productSet: { $addToSet: '$productId' },
          influencerSet: { $addToSet: '$influencerUsername' }
        }
      },
      {
        $project: {
          creatorId: '$_id',
          orderCount: 1,
          amount: 1,  // 成交额
          productCount: { $size: '$productSet' },
          influencerCount: { $size: '$influencerSet' }
        }
      },
      { $sort: { amount: -1 } },
      { $limit: 50 }
    ];
    
    const ranking = await ReportOrder.aggregate(pipeline);
    
    // 获取BD名称
    const creatorIds = ranking.map(r => r.creatorId);
    const bds = await User.find({ _id: { $in: creatorIds } }).select('username realName name');
    
    const bdNameMap = {};
    bds.forEach(bd => {
      bdNameMap[bd._id.toString()] = bd.realName || bd.name || bd.username || '未知';
    });
    
    // 计算总成交额用于占比
    const totalAmount = ranking.reduce((sum, r) => sum + r.amount, 0);
    
    const result = ranking.map(r => ({
      ...r,
      bdName: bdNameMap[r.creatorId.toString()] || '未知',
      amountPercent: totalAmount > 0 ? Math.round((r.amount / totalAmount) * 100) : 0
    }));
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取BD贡献排行失败:', error);
    res.status(500).json({ success: false, message: '获取BD贡献排行失败' });
  }
});

// 获取达人销售排行
router.get('/influencer-ranking', authenticate, authorize('products:read'), async (req, res) => {
  try {
    let { companyId, startDate, endDate } = req.query;
    
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ success: false, message: '缺少或无效的companyId参数' });
    }
    
    companyId = new mongoose.Types.ObjectId(companyId);
    
    // 默认查询过去30天
    const now = new Date();
    if (!endDate) endDate = now.toISOString().split('T')[0];
    if (!startDate) {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = thirtyDaysAgo.toISOString().split('T')[0];
    }
    
    console.log('达人销售排行 - 查询参数:', { companyId, startDate, endDate });
    
    // 聚合查询：按influencerUsername分组统计
    const pipeline = [
      {
        $match: {
          companyId,
          summaryDate: { $gte: startDate, $lte: endDate },
          influencerUsername: { $exists: true, $ne: '' },
          paymentNo: { $ne: '' },  // 有支付单号表示已成交
          creatorId: { $exists: true, $ne: null }  // 过滤creatorId为空的订单
        }
      },
      {
        $group: {
          _id: '$influencerUsername',
          orderCount: { $sum: 1 },
          // 成交额 = 商品价格 × 下单件数
          amount: { $sum: { $multiply: ['$productPrice', '$orderQuantity'] } },
          productSet: { $addToSet: '$productId' },
          creatorId: { $first: '$creatorId' }
        }
      },
      {
        $project: {
          influencerUsername: '$_id',
          orderCount: 1,
          amount: 1,  // 成交额
          productCount: { $size: '$productSet' },
          creatorId: 1
        }
      },
      { $sort: { amount: -1 } },
      { $limit: 50 }
    ];
    
    const ranking = await ReportOrder.aggregate(pipeline);
    
    // 获取BD名称
    const creatorIds = [...new Set(ranking.map(r => r.creatorId).filter(Boolean))];
    const bdMap = {};
    if (creatorIds.length > 0) {
      const bds = await User.find({ _id: { $in: creatorIds } }).select('username realName name');
      bds.forEach(bd => {
        bdMap[bd._id.toString()] = bd.realName || bd.name || bd.username || '未知';
      });
    }
    
    // 获取达人详细信息
    const usernames = ranking.map(r => r.influencerUsername);
    const influencers = await Influencer.find({ tiktokId: { $in: usernames } }).select('tiktokId name');
    const influencerNameMap = {};
    influencers.forEach(inf => {
      influencerNameMap[inf.tiktokId] = inf.name || inf.tiktokId;
    });
    
    const result = ranking.map(r => ({
      ...r,
      influencerName: influencerNameMap[r.influencerUsername] || r.influencerUsername,
      bdName: r.creatorId ? (bdMap[r.creatorId.toString()] || '未知') : '未知'
    }));
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取达人销售排行失败:', error);
    res.status(500).json({ success: false, message: '获取达人销售排行失败' });
  }
});

// 获取申样统计
router.get('/sample-stats', authenticate, authorize('products:read'), async (req, res) => {
  try {
    let { companyId, startDate, endDate } = req.query;
    
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ success: false, message: '缺少或无效的companyId参数' });
    }
    
    companyId = new mongoose.Types.ObjectId(companyId);
    
    // 默认查询过去30天
    const now = new Date();
    if (!endDate) endDate = now.toISOString().split('T')[0];
    if (!startDate) {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = thirtyDaysAgo.toISOString().split('T')[0];
    }
    
    console.log('申样统计 - 查询参数:', { companyId, startDate, endDate });
    
    // 查询申样数据
    const sampleQuery = {
      companyId,
      date: { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate + 'T23:59:59.999Z') 
      }
    };
    
    const samples = await SampleManagement.find(sampleQuery).select('productId sampleStatus salesmanId');
    
    // 按商品统计
    const productStatsMap = {};
    samples.forEach(sample => {
      const productId = sample.productId ? sample.productId.toString() : 'unknown';
      if (!productStatsMap[productId]) {
        productStatsMap[productId] = {
          productId,
          applicationCount: 0,
          shippedCount: 0,
          bdSet: new Set()
        };
      }
      productStatsMap[productId].applicationCount++;
      if (sample.sampleStatus === 'shipping' || sample.sampleStatus === 'sent') {
        productStatsMap[productId].shippedCount++;
      }
      if (sample.salesmanId) {
        productStatsMap[productId].bdSet.add(sample.salesmanId.toString());
      }
    });
    
    // 获取商品名称和图片
    const productIds = Object.keys(productStatsMap).filter(id => id !== 'unknown');
    const products = await Product.find({ tiktokProductId: { $in: productIds } }).select('name tiktokProductId productImages images');
    const productNameMap = {};
    const productImageMap = {};
    products.forEach(p => {
      productNameMap[p.tiktokProductId] = p.name;
      // 优先使用 productImages，其次 images
      const firstImage = (p.productImages && p.productImages.length > 0) 
        ? p.productImages[0] 
        : ((p.images && p.images.length > 0) ? p.images[0] : '');
      productImageMap[p.tiktokProductId] = firstImage;
    });
    
    const productStats = Object.values(productStatsMap).map(stat => ({
      productId: stat.productId === 'unknown' ? '' : stat.productId,
      productName: stat.productId === 'unknown' ? '未知商品' : (productNameMap[stat.productId] || '未知商品'),
      productImage: stat.productId === 'unknown' ? '' : (productImageMap[stat.productId] || ''),
      applicationCount: stat.applicationCount,
      shippedCount: stat.shippedCount,
      sampleRate: stat.applicationCount > 0 ? Math.round((stat.shippedCount / stat.applicationCount) * 100) : 0,
      bdCount: stat.bdSet.size
    })).sort((a, b) => b.applicationCount - a.applicationCount);
    
    // 按BD统计
    const bdStatsMap = {};
    samples.forEach(sample => {
      const salesmanId = sample.salesmanId ? sample.salesmanId.toString() : 'unknown';
      if (!bdStatsMap[salesmanId]) {
        bdStatsMap[salesmanId] = {
          salesmanId,
          applicationCount: 0,
          shippedCount: 0,
          productSet: new Set()
        };
      }
      bdStatsMap[salesmanId].applicationCount++;
      if (sample.sampleStatus === 'shipping' || sample.sampleStatus === 'sent') {
        bdStatsMap[salesmanId].shippedCount++;
      }
      if (sample.productId) {
        bdStatsMap[salesmanId].productSet.add(sample.productId.toString());
      }
    });
    
    // 获取BD名称
    const salesmanIds = Object.keys(bdStatsMap).filter(id => id !== 'unknown');
    const bds = await User.find({ _id: { $in: salesmanIds } }).select('username realName name');
    const bdNameMap = {};
    bds.forEach(bd => {
      bdNameMap[bd._id.toString()] = bd.realName || bd.name || bd.username || '未知';
    });
    
    const bdStats = Object.values(bdStatsMap).map(stat => ({
      bdName: stat.salesmanId === 'unknown' ? '未知' : (bdNameMap[stat.salesmanId] || '未知'),
      applicationCount: stat.applicationCount,
      shippedCount: stat.shippedCount,
      sampleRate: stat.applicationCount > 0 ? Math.round((stat.shippedCount / stat.applicationCount) * 100) : 0,
      productCount: stat.productSet.size
    })).sort((a, b) => b.applicationCount - a.applicationCount);
    
    res.json({
      success: true,
      data: {
        productStats: productStats.slice(0, 50),
        bdStats: bdStats.slice(0, 50)
      }
    });
  } catch (error) {
    console.error('获取申样统计失败:', error);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ success: false, message: '获取申样统计失败', error: error.message, stack: error.stack });
  }
});

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
    const coopProduct = await Product.findById(productId);
    console.log('Product:', coopProduct?._id, coopProduct?.tiktokProductId);

    if (!coopProduct) {
      return res.json({ success: false, message: '产品不存在' });
    }

    const tiktokProductId = String(coopProduct.tiktokProductId);
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
router.get('/order-stats/:productId', authenticate, authorize('products:read'), async (req, res) => {
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

    // 通过 Product._id 获取 TikTok 商品ID
    const cooperationProduct = await Product.findById(productId).select('tiktokProductId');
    if (!cooperationProduct) {
      return res.status(404).json({ success: false, message: '产品不存在' });
    }

    const tiktokProductId = String(cooperationProduct.tiktokProductId);
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

    // 查询过去7天的订单 - 使用 ReportOrder 的 summaryDate 字段，productId 字符串匹配（只统计已成交的订单）
    const query7days = {
      productId: tiktokProductId,
      summaryDate: { $gte: sevenDaysAgoStr },
      paymentNo: { $ne: '' }  // 有支付单号表示已成交
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

    // 查询过去3个月的订单（只统计已成交的订单）
    const query3months = {
      productId: tiktokProductId,
      summaryDate: { $gte: threeMonthsAgoStr },
      paymentNo: { $ne: '' }  // 有支付单号表示已成交
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
        // 成交额 = 商品价格 × 下单件数
        const totalAmount = (order.productPrice || 0) * (order.orderQuantity || 0);
        
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
router.get('/sales-report/:productId', authenticate, authorize('products:read'), async (req, res) => {
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

    // 通过 Product._id 获取 TikTok 商品ID
    const cooperationProduct = await Product.findById(productId).select('tiktokProductId');
    if (!cooperationProduct) {
      return res.status(404).json({ success: false, message: '产品不存在' });
    }

    const tiktokProductId = String(cooperationProduct.tiktokProductId);
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
router.get('/influencer-order-stats', authenticate, authorize('influencers:read'), async (req, res) => {
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
