const express = require('express');
const { authenticate } = require('../middleware/auth');
const BdDaily = require('../models/BdDaily');
const ReportOrder = require('../models/ReportOrder');
const User = require('../models/User');

const router = express.Router();

/**
 * @route   GET /api/dashboard/bd-stats
 * @desc    获取BD用户的数据概览
 * @access  Private
 */
router.get('/bd-stats', authenticate, async (req, res) => {
  try {
    console.log('[Dashboard] Getting BD stats for userId:', req.userId, 'companyId:', req.companyId);
    
    // 获取当前用户信息
    const user = await User.findById(req.userId).populate('roleId', 'name permissions');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const userRole = user.role || '';
    const userRoleId = user.roleId || null;
    const username = user.username || '';
    const realName = user.realName || '';

    console.log('[Dashboard] User info:', { username, realName, role: userRole, roleId: userRoleId });

    // 检查是否为BD角色（兼容两种格式：字符串role 或 对象roleId）
    let isBD = false;
    if (typeof userRole === 'string') {
      isBD = userRole === 'bd' || userRole === 'BD';
    } else if (userRoleId && typeof userRoleId === 'object') {
      isBD = userRoleId.name === 'BD' || userRoleId.name === 'bd';
    }

    if (!isBD) {
      console.log('[Dashboard] User is not BD, returning 403');
      return res.status(403).json({
        success: false,
        message: '仅BD用户可查看此数据'
      });
    }

    // 1. 使用系统时间当天的前一天作为目标日期
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() - 1);
    // 设置为当天 00:00:00（UTC+8，即 UTC 16:00）
    targetDate.setHours(0, 0, 0, 0);

    console.log('[Dashboard] Today:', today.toISOString());
    console.log('[Dashboard] Target date (yesterday):', targetDate.toISOString());

    // 计算一天的起始和结束
    // targetDate 是 BdDaily 存储的日期（UTC），例如 2026-03-04T16:00:00.000Z 对应 UTC+8 的 2026-03-05 00:00
    const dayStart = new Date(targetDate);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    console.log('[Dashboard] Query date range (UTC):', {
      dayStart: dayStart.toISOString(),
      dayEnd: dayEnd.toISOString()
    });

    // 转换为 UTC+8 显示
    const formatDateUTC8 = (d) => {
      const offset = 8;
      const local = new Date(d.getTime() + offset * 3600000);
      return local.toISOString().replace('T', ' ').substring(0, 19);
    };
    console.log('[Dashboard] Query date range (UTC+8):', {
      dayStart: formatDateUTC8(dayStart),
      dayEnd: formatDateUTC8(dayEnd)
    });

    // 直接从 ReportOrder 统计目标日期的数据
    const userBdDaily = await BdDaily.findOne({
      companyId: req.companyId,
      $or: [
        { salesman: username.toLowerCase() },
        { salesman: realName }
      ],
      date: { $gte: dayStart, $lt: dayEnd }
    });

    const userOrderCount = await ReportOrder.countDocuments({
      companyId: req.companyId,
      $or: [
        { bdName: username.toLowerCase() },
        { bdName: realName }
      ],
      createTime: { $gte: dayStart, $lt: dayEnd }
    });

    const teamOrderCount = await ReportOrder.countDocuments({
      companyId: req.companyId,
      createTime: { $gte: dayStart, $lt: dayEnd }
    });

    const userSampleCount = userBdDaily?.sampleCount || 0;

    console.log('[Dashboard] User stats:', { userSampleCount, userOrderCount, targetDate });

    // 2. 获取团队数据（从 BdDaily 获取申样数，从 ReportOrder 获取订单数）
    const allBdDailies = await BdDaily.find({
      companyId: req.companyId,
      date: { $gte: dayStart, $lt: dayEnd }
    });

    console.log('[Dashboard] Team BD daily count:', allBdDailies.length);

    // 计算团队总数
    const teamSampleCount = allBdDailies.reduce((sum, item) => sum + (item.sampleCount || 0), 0);

    console.log('[Dashboard] Team stats:', { teamSampleCount, teamOrderCount });

    // 计算占比
    const samplePercentage = teamSampleCount > 0
      ? ((userSampleCount / teamSampleCount) * 100).toFixed(1)
      : 0;
    const orderPercentage = teamOrderCount > 0
      ? ((userOrderCount / teamOrderCount) * 100).toFixed(1)
      : 0;

    console.log('[Dashboard] Percentages:', { samplePercentage, orderPercentage });

    // 3. 计算昨天（targetDate）的预估佣金
    const dayOrders = await ReportOrder.find({
      companyId: req.companyId,
      $or: [
        { bdName: username.toLowerCase() },
        { bdName: realName }
      ],
      createTime: { $gte: dayStart, $lt: dayEnd }
    });

    const estimatedCommission = dayOrders.reduce((sum, order) => {
      const partnerCommission = order.estimatedAffiliatePartnerCommission || 0;
      const shopAdPayment = order.estimatedAffiliateServiceProviderShopAdPayment || 0;
      return sum + (partnerCommission + shopAdPayment);
    }, 0) * 0.2;

    console.log('[Dashboard] Day estimated commission:', estimatedCommission);

    // 4. 计算本月（自然月）的预估佣金总和
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    console.log('[Dashboard] Current month start:', currentMonth.toISOString());

    const monthlyOrders = await ReportOrder.find({
      companyId: req.companyId,
      $or: [
        { bdName: username.toLowerCase() },
        { bdName: realName }
      ],
      createTime: { $gte: currentMonth }
    });

    console.log('[Dashboard] Monthly orders count:', monthlyOrders.length);

    const monthlyEstimatedCommission = monthlyOrders.reduce((sum, order) => {
      const partnerCommission = order.estimatedAffiliatePartnerCommission || 0;
      const shopAdPayment = order.estimatedAffiliateServiceProviderShopAdPayment || 0;
      return sum + (partnerCommission + shopAdPayment);
    }, 0) * 0.2;

    console.log('[Dashboard] Monthly estimated commission:', monthlyEstimatedCommission);

    console.log('[Dashboard] Estimated commission:', estimatedCommission);

    // 4. 获取过去一周的成单记录
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const recentOrders = await ReportOrder.find({
      companyId: req.companyId,
      $or: [
        { bdName: username.toLowerCase() },
        { bdName: realName }
      ],
      createTime: { $gte: weekAgo }
    }).sort({ createTime: -1 });

    console.log('[Dashboard] Recent orders count:', recentOrders.length);

    // 整理订单列表
    const orderList = recentOrders.map(order => ({
      orderId: order.orderNo,
      influencer: order.influencerUsername,
      product: order.productName,
      createTime: order.createTime
    }));

    const responseData = {
      success: true,
      data: {
        user: {
          name: realName || username,
          role: userRoleId?.name || userRole
        },
        statsDate: targetDate.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'), // 统计日期（本地时间）
        yesterdayStats: {
          sampleCount: userSampleCount,
          orderCount: userOrderCount
        },
        teamStats: {
          sampleCount: teamSampleCount,
          orderCount: teamOrderCount
        },
        percentage: {
          sample: parseFloat(samplePercentage),
          order: parseFloat(orderPercentage)
        },
        monthlyCommission: {
          estimated: monthlyEstimatedCommission
        },
        yesterdayCommission: {
          estimated: estimatedCommission
        },
        recentOrders: {
          total: recentOrders.length,
          list: orderList
        },
        trendStats: {
          samples7Days: {
            user: [],
            team: [],
            dates: []
          },
          samples14Days: {
            user: [],
            team: [],
            dates: []
          },
          samplesMonthly: {
            user: [],
            team: [],
            dates: []
          },
          orders7Days: {
            user: [],
            team: [],
            dates: []
          },
          orders14Days: {
            user: [],
            team: [],
            dates: []
          },
          ordersMonthly: {
            user: [],
            team: [],
            dates: []
          }
        }
      }
    };

    // 计算趋势数据（从 ReportOrder 直接统计）
    const now = new Date();

    // 过去7天
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dateStr = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });

      // 从 BdDaily 获取申样数
      const userStats = await BdDaily.findOne({
        companyId: req.companyId,
        $or: [
          { salesman: username.toLowerCase() },
          { salesman: realName }
        ],
        date: { $gte: date, $lt: nextDate }
      });

      const teamStats = await BdDaily.find({
        companyId: req.companyId,
        date: { $gte: date, $lt: nextDate }
      });

      // 从 ReportOrder 获取订单数
      const userOrderCount = await ReportOrder.countDocuments({
        companyId: req.companyId,
        $or: [
          { bdName: username.toLowerCase() },
          { bdName: realName }
        ],
        createTime: { $gte: date, $lt: nextDate }
      });

      const teamOrderCount = await ReportOrder.countDocuments({
        companyId: req.companyId,
        createTime: { $gte: date, $lt: nextDate }
      });

      responseData.data.trendStats.samples7Days.user.push(userStats?.sampleCount || 0);
      responseData.data.trendStats.samples7Days.team.push(
        teamStats.reduce((sum, item) => sum + (item.sampleCount || 0), 0)
      );
      responseData.data.trendStats.samples7Days.dates.push(dateStr);

      responseData.data.trendStats.orders7Days.user.push(userOrderCount);
      responseData.data.trendStats.orders7Days.team.push(teamOrderCount);
      responseData.data.trendStats.orders7Days.dates.push(dateStr);
    }
    
    // 过去14天
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dateStr = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });

      // 从 BdDaily 获取申样数
      const userStats = await BdDaily.findOne({
        companyId: req.companyId,
        $or: [
          { salesman: username.toLowerCase() },
          { salesman: realName }
        ],
        date: { $gte: date, $lt: nextDate }
      });

      const teamStats = await BdDaily.find({
        companyId: req.companyId,
        date: { $gte: date, $lt: nextDate }
      });

      // 从 ReportOrder 获取订单数
      const userOrderCount = await ReportOrder.countDocuments({
        companyId: req.companyId,
        $or: [
          { bdName: username.toLowerCase() },
          { bdName: realName }
        ],
        createTime: { $gte: date, $lt: nextDate }
      });

      const teamOrderCount = await ReportOrder.countDocuments({
        companyId: req.companyId,
        createTime: { $gte: date, $lt: nextDate }
      });

      responseData.data.trendStats.samples14Days.user.push(userStats?.sampleCount || 0);
      responseData.data.trendStats.samples14Days.team.push(
        teamStats.reduce((sum, item) => sum + (item.sampleCount || 0), 0)
      );
      responseData.data.trendStats.samples14Days.dates.push(dateStr);

      responseData.data.trendStats.orders14Days.user.push(userOrderCount);
      responseData.data.trendStats.orders14Days.team.push(teamOrderCount);
      responseData.data.trendStats.orders14Days.dates.push(dateStr);
    }
    
    // 本月数据
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    for (let i = 0; i < now.getDate(); i++) {
      const date = new Date(monthStart);
      date.setDate(date.getDate() + i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dateStr = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });

      // 从 BdDaily 获取申样数
      const userStats = await BdDaily.findOne({
        companyId: req.companyId,
        $or: [
          { salesman: username.toLowerCase() },
          { salesman: realName }
        ],
        date: { $gte: date, $lt: nextDate }
      });

      const teamStats = await BdDaily.find({
        companyId: req.companyId,
        date: { $gte: date, $lt: nextDate }
      });

      // 从 ReportOrder 获取订单数
      const userOrderCount = await ReportOrder.countDocuments({
        companyId: req.companyId,
        $or: [
          { bdName: username.toLowerCase() },
          { bdName: realName }
        ],
        createTime: { $gte: date, $lt: nextDate }
      });

      const teamOrderCount = await ReportOrder.countDocuments({
        companyId: req.companyId,
        createTime: { $gte: date, $lt: nextDate }
      });

      responseData.data.trendStats.samplesMonthly.user.push(userStats?.sampleCount || 0);
      responseData.data.trendStats.samplesMonthly.team.push(
        teamStats.reduce((sum, item) => sum + (item.sampleCount || 0), 0)
      );
      responseData.data.trendStats.samplesMonthly.dates.push(dateStr);

      responseData.data.trendStats.ordersMonthly.user.push(userOrderCount);
      responseData.data.trendStats.ordersMonthly.team.push(teamOrderCount);
      responseData.data.trendStats.ordersMonthly.dates.push(dateStr);
    }

    // 5. 更新 BdDaily 表（新增或更新最新日期的记录）
    // 使用前面计算好的佣金
    const dayCommission = estimatedCommission / 0.2; // 反推未乘0.2之前的值

    // 查找该日期是否有记录
    const existingBdDaily = await BdDaily.findOne({
      companyId: req.companyId,
      $or: [
        { salesman: username.toLowerCase() },
        { salesman: realName }
      ],
      date: { $gte: dayStart, $lt: dayEnd }
    });

    // 新增或更新 BdDaily 记录
    if (existingBdDaily) {
      // 更新现有记录
      await BdDaily.updateOne(
        { _id: existingBdDaily._id },
        {
          $set: {
            orderCount: userOrderCount,
            commission: dayCommission,
            updatedAt: new Date()
          }
        }
      );
      console.log('[Dashboard] Updated BdDaily for existing record:', existingBdDaily._id);
    } else {
      // 新增记录（只有当 BdDaily 中已经有申样数据时才创建）
      if (userSampleCount > 0 || userOrderCount > 0) {
        const newBdDaily = new BdDaily({
          companyId: req.companyId,
          date: dayStart,
          salesman: username.toLowerCase(),
          sampleCount: userSampleCount,
          sampleIds: '',
          orderCount: userOrderCount,
          commission: dayCommission,
          creatorId: req.userId,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        await newBdDaily.save();
        console.log('[Dashboard] Created new BdDaily record:', newBdDaily._id);
      }
    }

    console.log('[Dashboard] Response data:', JSON.stringify(responseData, null, 2));

    res.json(responseData);

  } catch (error) {
    console.error('Get BD stats error:', error);
    res.status(500).json({
      success: false,
      message: '获取数据概览失败'
    });
  }
});

module.exports = router;
