const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const BdDaily = require('../models/BdDaily');

const router = express.Router();

/**
 * @route   GET /api/bd-daily
 * @desc    获取BD每日统计列表
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 1000, startDate, endDate, salesman, date } = req.query;

    console.log('=== BD Daily查询开始 ===');
    console.log('companyId:', req.companyId);
    console.log('查询参数:', { page, limit, startDate, endDate, salesman, date });

    const query = { companyId: req.companyId };

    // 日期范围筛选 - 使用UTC时间
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        // 将字符串日期转为UTC的00:00:00
        const start = new Date(startDate + 'T00:00:00.000Z');
        query.date.$gte = start;
      }
      if (endDate) {
        // 将字符串日期转为UTC的23:59:59.999
        const end = new Date(endDate + 'T23:59:59.999Z');
        query.date.$lte = end;
      }
    }

    // 单日期筛选
    if (date && !startDate && !endDate) {
      const queryDate = new Date(date);
      queryDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(queryDate);
      nextDate.setDate(nextDate.getDate() + 1);
      query.date = { $gte: queryDate, $lt: nextDate };
    }

    // BD筛选
    if (salesman) {
      query.salesman = { $regex: salesman, $options: 'i' };
    }

    console.log('最终查询条件:', JSON.stringify(query, null, 2));

    const bdDailies = await BdDaily.find(query)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ date: -1, salesman: 1 });

    console.log('查询结果数量:', bdDailies.length);
    if (bdDailies.length > 0) {
      console.log('第一条:', bdDailies[0].date, '最后一条:', bdDailies[bdDailies.length - 1].date);
    }

    const total = await BdDaily.countDocuments(query);

    res.json({
      success: true,
      data: {
        bdDailies,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get bd-daily error:', error);
    res.status(500).json({
      success: false,
      message: '获取BD每日统计失败'
    });
  }
});

/**
 * @route   GET /api/bd-daily/:id
 * @desc    获取BD每日统计详情
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const bdDaily = await BdDaily.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!bdDaily) {
      return res.status(404).json({
        success: false,
        message: '统计数据不存在'
      });
    }

    res.json({
      success: true,
      data: { bdDaily }
    });

  } catch (error) {
    console.error('Get bd-daily detail error:', error);
    res.status(500).json({
      success: false,
      message: '获取BD每日统计详情失败'
    });
  }
});

/**
 * @route   POST /api/bd-daily
 * @desc    创建BD每日统计
 * @access  Private
 */
router.post('/', authenticate, [
  body('date').notEmpty().withMessage('日期不能为空'),
  body('salesman').notEmpty().withMessage('BD不能为空'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: errors.array()
      });
    }

    const {
      date,
      salesman,
      sampleCount,
      sampleIds,
      revenue,
      revenueIds,
      orderCount,
      commission,
      orderGeneratedCount,
      sampleSentCount,
      remark
    } = req.body;

    // 检查是否已存在同日期同BD的记录
    const existing = await BdDaily.findOne({
      companyId: req.companyId,
      date: new Date(date),
      salesman
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: '该日期该BD的统计数据已存在'
      });
    }

    const bdDaily = await BdDaily.create({
      companyId: req.companyId,
      date: new Date(date),
      salesman,
      sampleCount: sampleCount || 0,
      sampleIds: sampleIds || '',
      revenue: revenue || 0,
      revenueIds: revenueIds || '',
      orderCount: orderCount || 0,
      commission: commission || 0,
      orderGeneratedCount: orderGeneratedCount || 0,
      sampleSentCount: sampleSentCount || 0,
      remark: remark || '',
      creatorId: req.userId
    });

    res.status(201).json({
      success: true,
      message: '创建成功',
      data: { bdDaily }
    });

  } catch (error) {
    console.error('Create bd-daily error:', error);
    res.status(500).json({
      success: false,
      message: '创建BD每日统计失败'
    });
  }
});

/**
 * @route   PUT /api/bd-daily/:id
 * @desc    更新BD每日统计
 * @access  Private
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      sampleCount,
      sampleIds,
      revenue,
      revenueIds,
      orderCount,
      commission,
      orderGeneratedCount,
      sampleSentCount,
      remark
    } = req.body;

    const updateData = {
      sampleCount,
      sampleIds,
      revenue,
      revenueIds,
      orderCount,
      commission,
      orderGeneratedCount,
      sampleSentCount,
      remark,
      updaterId: req.userId
    };

    const bdDaily = await BdDaily.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      updateData,
      { new: true }
    );

    if (!bdDaily) {
      return res.status(404).json({
        success: false,
        message: '统计数据不存在'
      });
    }

    res.json({
      success: true,
      message: '更新成功',
      data: { bdDaily }
    });

  } catch (error) {
    console.error('Update bd-daily error:', error);
    res.status(500).json({
      success: false,
      message: '更新BD每日统计失败'
    });
  }
});

/**
 * @route   DELETE /api/bd-daily/:id
 * @desc    删除BD每日统计
 * @access  Private
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const bdDaily = await BdDaily.findOneAndDelete({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!bdDaily) {
      return res.status(404).json({
        success: false,
        message: '统计数据不存在'
      });
    }

    res.json({
      success: true,
      message: '删除成功'
    });

  } catch (error) {
    console.error('Delete bd-daily error:', error);
    res.status(500).json({
      success: false,
      message: '删除BD每日统计失败'
    });
  }
});

/**
 * @route   POST /api/bd-daily/generate
 * @desc    生成BD每日统计数据（自动统计）
 * @access  Private
 */
router.post('/generate', authenticate, [], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: errors.array()
      });
    }

    const { date, startDate, endDate } = req.body;

    // 支持单日或日期范围
    let datesToProcess = [];
    if (startDate && endDate) {
      // 日期范围
      const start = new Date(startDate);
      const end = new Date(endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        datesToProcess.push(new Date(d));
      }
    } else {
      // 单日
      datesToProcess.push(new Date(date));
    }

    let allResults = [];
    let totalCreated = 0;
    let totalUpdated = 0;

    for (const targetDate of datesToProcess) {
      const singleDateResults = await generateSingleDate(
        targetDate,
        req.companyId,
        req.userId
      );
      allResults.push(...singleDateResults);
      totalCreated += singleDateResults.filter(r => r.action === 'created').length;
      totalUpdated += singleDateResults.filter(r => r.action === 'updated').length;
    }

    res.json({
      success: true,
      message: `成功生成 ${allResults.length} 条BD统计数据`,
      data: {
        results: allResults,
        summary: {
          totalDays: datesToProcess.length,
          createdCount: totalCreated,
          updatedCount: totalUpdated
        }
      }
    });

  } catch (error) {
    console.error('Generate bd-daily error:', error);
    res.status(500).json({
      success: false,
      message: '生成BD每日统计失败'
    });
  }
});

/**
 * 生成单日统计数据
 */
async function generateSingleDate(targetDate, companyId, userId) {
  try {
    // 标准化日期：设置为当天的 00:00:00.000，确保唯一索引正确工作
    const normalizedDate = new Date(targetDate);
    normalizedDate.setHours(0, 0, 0, 0);

    // 设置日期范围为当天
    const startDate = new Date(normalizedDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(normalizedDate);
    endDate.setHours(23, 59, 59, 999);

    // 查找样品管理中的所有BD
    const SampleManagement = require('../models/SampleManagement');
    const ReportOrder = require('../models/ReportOrder');

    // 获取所有样品记录
    const samples = await SampleManagement.find({
      companyId: companyId,
      date: { $gte: startDate, $lte: endDate }
    });

    // 按BD分组统计样品
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

    // 4. 本日订单：r.createTime等于该日期，统计r.estimatedCommissionAmount总和
    // 同时记录满足条件的recordId到orderGeneratedCount字段（逗号分隔），记录数到orderCount字段
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

    // 5. 佣金：r.commissionSettlementTime等于该日期，且在s中找到有打款单号的记录
    // 统计满足条件的r.actualAffiliatePartnerCommission总和，recordId写到revenueIds，记录数到orderCount
    const commissionStats = {};
    // 先获取该日期有打款的sample记录
    const sampleWithPayment = await SampleManagement.find({
      companyId: companyId,
      date: { $gte: startDate, $lte: endDate },
      paymentNo: { $exists: true, $ne: '', $ne: null }
    });
    // 收集这些sample的productId和influencerAccount
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

    const results = [];
    for (const salesman of allSalesmen) {
      const sampleData = bdStats[salesman] || { sampleCount: 0, sampleIds: [] };
      const orderData = orderStats[salesman] || { estimatedCommissionTotal: 0, orderGeneratedCount: 0, orderCount: 0, orderIds: [] };
      const commissionData = commissionStats[salesman] || { commissionTotal: 0, revenueIds: [], orderCount: 0 };

      // 检查是否已存在
      const existing = await BdDaily.findOne({
        companyId: companyId,
        date: normalizedDate,
        salesman
      });

      const bdDailyData = {
        companyId: companyId,
        date: normalizedDate,
        salesman,
        sampleCount: sampleData.sampleCount,
        sampleIds: sampleData.sampleIds.join(','),
        revenue: orderData.estimatedCommissionTotal,  // 本日收入改为本日订单（estimatedCommissionAmount总和）
        revenueIds: orderData.orderIds.join(','),
        orderCount: orderData.orderCount,  // 订单数
        commission: commissionData.commissionTotal,  // 佣金（actualAffiliatePartnerCommission总和）
        orderGeneratedCount: orderData.orderIds.length,  // 满足条件的记录ID数量
        creatorId: userId
      };

      if (existing) {
        // 更新
        const updated = await BdDaily.findByIdAndUpdate(
          existing._id,
          bdDailyData,
          { new: true }
        );
        results.push({ action: 'updated', data: updated });
      } else {
        // 创建
        const created = await BdDaily.create(bdDailyData);
        results.push({ action: 'created', data: created });
      }
    }

    return results;
  } catch (error) {
    console.error('Generate single date error:', error);
    throw error;
  }
}

/**
 * @route   GET /api/bd-daily/summary
 * @desc    获取BD统计汇总
 * @access  Private
 */
router.get('/summary/range', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, salesman } = req.query;

    const query = { companyId: req.companyId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (salesman) {
      query.salesman = { $regex: salesman, $options: 'i' };
    }

    const bdDailies = await BdDaily.find(query).sort({ date: -1, salesman: 1 });

    // 按BD汇总
    const summary = {};
    bdDailies.forEach(item => {
      if (!summary[item.salesman]) {
        summary[item.salesman] = {
          salesman: item.salesman,
          totalDays: 0,
          totalSamples: 0,
          totalRevenue: 0,
          totalOrders: 0,
          totalCommission: 0,
          totalOrderGenerated: 0,
          totalSampleSent: 0
        };
      }
      summary[item.salesman].totalDays++;
      summary[item.salesman].totalSamples += item.sampleCount;
      summary[item.salesman].totalRevenue += item.revenue;
      summary[item.salesman].totalOrders += item.orderCount;
      summary[item.salesman].totalCommission += item.commission;
      summary[item.salesman].totalOrderGenerated += item.orderGeneratedCount;
      summary[item.salesman].totalSampleSent += item.sampleSentCount;
    });

    res.json({
      success: true,
      data: {
        summary: Object.values(summary),
        totalCount: bdDailies.length
      }
    });

  } catch (error) {
    console.error('Get bd-daily summary error:', error);
    res.status(500).json({
      success: false,
      message: '获取BD统计汇总失败'
    });
  }
});

module.exports = router;
