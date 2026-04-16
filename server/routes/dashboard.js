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
 * @query   userId - 可选，指定用户的ID；special - 可选，special=unassigned表示查询未分配
 */
router.get('/bd-stats', authenticate, async (req, res) => {
  try {
    const { userId, special } = req.query;
    const companyId = req.companyId;
    
    let targetUser = null;
    let username = '';
    let realName = '';
    let isUnassigned = false;

    // 如果是查询未分配
    if (special === 'unassigned') {
      isUnassigned = true;
      console.log('[Dashboard] Querying unassigned data for companyId:', companyId);
    } else if (special === 'all') {
      // 查询全部（团队）数据 - 使用当前登录用户的角色来过滤
      targetUser = await User.findById(req.userId).populate('roleId', 'name permissions');
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      username = targetUser.username || '';
      realName = targetUser.realName || '';
      console.log('[Dashboard] Querying all (team) data for companyId:', companyId);
    } else if (userId) {
      // 查询指定用户
      targetUser = await User.findById(userId).populate('roleId', 'name permissions');
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      username = targetUser.username || '';
      realName = targetUser.realName || '';
      console.log('[Dashboard] Getting BD stats for user:', { username, realName, userId });
    } else {
      // 默认获取当前登录用户
      targetUser = await User.findById(req.userId).populate('roleId', 'name permissions');
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      username = targetUser.username || '';
      realName = targetUser.realName || '';
      
      // 检查角色权限
      const userRole = targetUser.role || '';
      const userRoleId = targetUser.roleId || null;
      
      let isBD = false;
      let isAdmin = false;
      if (typeof userRole === 'string') {
        isBD = userRole === 'bd' || userRole === 'BD';
        isAdmin = userRole === 'admin' || userRole === '超级管理员' || userRole === '管理员';
      } else if (userRoleId && typeof userRoleId === 'object') {
        isBD = userRoleId.name === 'BD' || userRoleId.name === 'bd';
        isAdmin = userRoleId.name === 'admin' || userRoleId.name === '超级管理员' || userRoleId.name === '管理员' || userRoleId.permissions?.includes('*');
      }

      // 允许BD角色或管理员角色访问
      if (!isBD && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: '仅BD或管理员可查看此数据'
        });
      }
      console.log('[Dashboard] Getting BD stats for current user:', { username, realName, isBD, isAdmin });
    }

    // 1. 支持前端传入日期，否则默认前一天
    let targetDate;
    if (req.query.date) {
      // 使用前端传入的日期
      targetDate = new Date(req.query.date);
      targetDate.setHours(0, 0, 0, 0);
    } else {
      // 默认使用系统时间当天的前一天
      const today = new Date();
      targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() - 1);
      targetDate.setHours(0, 0, 0, 0);
    }

    // 计算一天的起始和结束
    const dayStart = new Date(targetDate);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // 构建查询条件
    const isAll = special === 'all';
    
    const getUserQuery = () => {
      if (isUnassigned) {
        // 未分配：bdName为空或不存在
        return { $or: [{ bdName: '' }, { bdName: null }, { bdName: { $exists: false } }] };
      }
      if (isAll) {
        // 全部数据：不限制，返回空对象
        return {};
      }
      return {
        $or: [
          { bdName: username.toLowerCase() },
          { bdName: realName }
        ]
      };
    };

    const getUserBdDailyQuery = () => {
      if (isUnassigned) {
        return { $or: [{ salesman: '' }, { salesman: null }, { salesman: { $exists: false } }] };
      }
      if (isAll) {
        return {};
      }
      // salesman字段存的是username，统一用小写匹配
      return { salesman: username.toLowerCase() };
    };

    // 查询用户/未分配的昨日数据
    const userBdDaily = await BdDaily.findOne({
      companyId,
      ...getUserBdDailyQuery(),
      date: { $gte: dayStart, $lt: dayEnd }
    });

    const userOrderCount = await ReportOrder.countDocuments({
      companyId,
      ...getUserQuery(),
      createTime: { $gte: dayStart, $lt: dayEnd }
    });

    const teamOrderCount = await ReportOrder.countDocuments({
      companyId,
      createTime: { $gte: dayStart, $lt: dayEnd }
    });

    const userSampleCount = userBdDaily?.sampleCount || 0;

    // 2. 获取团队数据
    const allBdDailies = await BdDaily.find({
      companyId,
      date: { $gte: dayStart, $lt: dayEnd }
    });

    const teamSampleCount = allBdDailies.reduce((sum, item) => sum + (item.sampleCount || 0), 0);

    // 计算占比
    const samplePercentage = teamSampleCount > 0
      ? ((userSampleCount / teamSampleCount) * 100).toFixed(1)
      : 0;
    const orderPercentage = teamOrderCount > 0
      ? ((userOrderCount / teamOrderCount) * 100).toFixed(1)
      : 0;

    // 3. 计算昨天（targetDate）的预估佣金
    const dayOrders = await ReportOrder.find({
      companyId,
      ...getUserQuery(),
      createTime: { $gte: dayStart, $lt: dayEnd }
    });

    const estimatedCommission = dayOrders.reduce((sum, order) => {
      const partnerCommission = order.estimatedAffiliatePartnerCommission || 0;
      const shopAdPayment = order.estimatedAffiliateServiceProviderShopAdPayment || 0;
      return sum + (partnerCommission + shopAdPayment);
    }, 0) * 0.2;

    // 4. 计算本月的预估佣金
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const monthlyOrders = await ReportOrder.find({
      companyId,
      ...getUserQuery(),
      createTime: { $gte: currentMonth }
    });

    const monthlyEstimatedCommission = monthlyOrders.reduce((sum, order) => {
      const partnerCommission = order.estimatedAffiliatePartnerCommission || 0;
      const shopAdPayment = order.estimatedAffiliateServiceProviderShopAdPayment || 0;
      return sum + (partnerCommission + shopAdPayment);
    }, 0) * 0.2;

    // 5. 获取过去一周的成单记录
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const recentOrders = await ReportOrder.find({
      companyId,
      ...getUserQuery(),
      createTime: { $gte: weekAgo }
    }).sort({ createTime: -1 });

    const orderList = recentOrders.map(order => ({
      orderId: order.orderNo,
      influencer: order.influencerUsername,
      product: order.productName,
      createTime: order.createTime
    }));

    // 初始化趋势数据
    const trendStats = {
      samples7Days: { user: [], team: [], dates: [] },
      samples14Days: { user: [], team: [], dates: [] },
      samples30Days: { user: [], team: [], dates: [] },
      samplesMonthly: { user: [], team: [], dates: [] },
      orders7Days: { user: [], team: [], dates: [] },
      orders14Days: { user: [], team: [], dates: [] },
      orders30Days: { user: [], team: [], dates: [] },
      ordersMonthly: { user: [], team: [], dates: [] }
    };

    const now = new Date();

    // 过去7天
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      const dateStr = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });

      const userStats = await BdDaily.findOne({
        companyId,
        ...getUserBdDailyQuery(),
        date: { $gte: date, $lt: nextDate }
      });

      const teamStats = await BdDaily.find({
        companyId,
        date: { $gte: date, $lt: nextDate }
      });

      const userOrderCountDay = await ReportOrder.countDocuments({
        companyId,
        ...getUserQuery(),
        createTime: { $gte: date, $lt: nextDate }
      });

      const teamOrderCountDay = await ReportOrder.countDocuments({
        companyId,
        createTime: { $gte: date, $lt: nextDate }
      });

      trendStats.samples7Days.user.push(userStats?.sampleCount || 0);
      trendStats.samples7Days.team.push(teamStats.reduce((sum, item) => sum + (item.sampleCount || 0), 0));
      trendStats.samples7Days.dates.push(dateStr);

      trendStats.orders7Days.user.push(userOrderCountDay);
      trendStats.orders7Days.team.push(teamOrderCountDay);
      trendStats.orders7Days.dates.push(dateStr);
    }

    // 过去14天
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      const dateStr = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });

      const userStats = await BdDaily.findOne({
        companyId,
        ...getUserBdDailyQuery(),
        date: { $gte: date, $lt: nextDate }
      });

      const teamStats = await BdDaily.find({
        companyId,
        date: { $gte: date, $lt: nextDate }
      });

      const userOrderCountDay = await ReportOrder.countDocuments({
        companyId,
        ...getUserQuery(),
        createTime: { $gte: date, $lt: nextDate }
      });

      const teamOrderCountDay = await ReportOrder.countDocuments({
        companyId,
        createTime: { $gte: date, $lt: nextDate }
      });

      trendStats.samples14Days.user.push(userStats?.sampleCount || 0);
      trendStats.samples14Days.team.push(teamStats.reduce((sum, item) => sum + (item.sampleCount || 0), 0));
      trendStats.samples14Days.dates.push(dateStr);

      trendStats.orders14Days.user.push(userOrderCountDay);
      trendStats.orders14Days.team.push(teamOrderCountDay);
      trendStats.orders14Days.dates.push(dateStr);
    }

    // 过去30天
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      const dateStr = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });

      const userStats = await BdDaily.findOne({
        companyId,
        ...getUserBdDailyQuery(),
        date: { $gte: date, $lt: nextDate }
      });

      const teamStats = await BdDaily.find({
        companyId,
        date: { $gte: date, $lt: nextDate }
      });

      const userOrderCountDay = await ReportOrder.countDocuments({
        companyId,
        ...getUserQuery(),
        createTime: { $gte: date, $lt: nextDate }
      });

      const teamOrderCountDay = await ReportOrder.countDocuments({
        companyId,
        createTime: { $gte: date, $lt: nextDate }
      });

      trendStats.samples30Days.user.push(userStats?.sampleCount || 0);
      trendStats.samples30Days.team.push(teamStats.reduce((sum, item) => sum + (item.sampleCount || 0), 0));
      trendStats.samples30Days.dates.push(dateStr);

      trendStats.orders30Days.user.push(userOrderCountDay);
      trendStats.orders30Days.team.push(teamOrderCountDay);
      trendStats.orders30Days.dates.push(dateStr);
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

      const userStats = await BdDaily.findOne({
        companyId,
        ...getUserBdDailyQuery(),
        date: { $gte: date, $lt: nextDate }
      });

      const teamStats = await BdDaily.find({
        companyId,
        date: { $gte: date, $lt: nextDate }
      });

      const userOrderCountDay = await ReportOrder.countDocuments({
        companyId,
        ...getUserQuery(),
        createTime: { $gte: date, $lt: nextDate }
      });

      const teamOrderCountDay = await ReportOrder.countDocuments({
        companyId,
        createTime: { $gte: date, $lt: nextDate }
      });

      trendStats.samplesMonthly.user.push(userStats?.sampleCount || 0);
      trendStats.samplesMonthly.team.push(teamStats.reduce((sum, item) => sum + (item.sampleCount || 0), 0));
      trendStats.samplesMonthly.dates.push(dateStr);

      trendStats.ordersMonthly.user.push(userOrderCountDay);
      trendStats.ordersMonthly.team.push(teamOrderCountDay);
      trendStats.ordersMonthly.dates.push(dateStr);
    }

    const displayName = isUnassigned ? '未分配' : (realName || username);

    const responseData = {
      success: true,
      data: {
        user: {
          name: displayName,
          role: isUnassigned ? '未分配' : (targetUser?.roleId?.name || targetUser?.role || 'BD')
        },
        statsDate: targetDate.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'),
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
        trendStats
      }
    };

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
