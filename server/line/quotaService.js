// LINE 额度监控服务
// 基于 ActivityHistory(action='line_push') 当月计数估算推送额度消耗（Free 计划约 300 条群发/月）。
// 同时提供绑定数概览，供 Dashboard 展示。零新表。
const ActivityHistory = require('../models/ActivityHistory');
const Influencer = require('../models/Influencer');
const ShopContact = require('../models/ShopContact');

// Free 计划月度群发额度（消息条数，估算值），可用 env 覆盖
const MONTHLY_FREE_QUOTA = Number(process.env.LINE_MONTHLY_QUOTA || 300);
// 额度告警阈值（占比）
const WARN_RATIO = 0.8;

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

// 统计当月推送消耗（成功推送的 recipientCount 总和 ≈ 消息条数）
async function getMonthlyUsage(companyId) {
  const { start, end } = monthRange();
  const logs = await ActivityHistory.find({
    companyId,
    action: 'line_push',
    createdAt: { $gte: start, $lt: end }
  }).select('newData createdAt').lean();

  let messageCount = 0;
  let pushCount = 0;
  let failedCount = 0;
  logs.forEach(l => {
    const d = l.newData || {};
    if (d.status === 'success') {
      pushCount += 1;
      messageCount += Number(d.recipientCount || 0);
    } else if (d.status === 'failed') {
      failedCount += 1;
    }
  });

  const usedRatio = MONTHLY_FREE_QUOTA > 0 ? messageCount / MONTHLY_FREE_QUOTA : 0;
  return {
    messageCount,
    pushCount,
    failedCount,
    quota: MONTHLY_FREE_QUOTA,
    remaining: Math.max(0, MONTHLY_FREE_QUOTA - messageCount),
    usedRatio: Number(usedRatio.toFixed(3)),
    warn: usedRatio >= WARN_RATIO,
    exceeded: messageCount >= MONTHLY_FREE_QUOTA
  };
}

// 绑定数概览（达人 + 卖家）
async function getBindingOverview(companyId) {
  const boundQuery = { companyId, lineUserId: { $exists: true, $nin: ['', null] } };
  const [influencerBound, shopContactBound] = await Promise.all([
    Influencer.countDocuments(boundQuery),
    ShopContact.countDocuments(boundQuery)
  ]);
  return {
    influencerBound,
    shopContactBound,
    totalBound: influencerBound + shopContactBound
  };
}

// Dashboard 概览：绑定数 + 本月推送 + 额度
async function getOverview(companyId) {
  const [usage, binding] = await Promise.all([
    getMonthlyUsage(companyId),
    getBindingOverview(companyId)
  ]);
  return { usage, binding };
}

module.exports = {
  MONTHLY_FREE_QUOTA,
  WARN_RATIO,
  getMonthlyUsage,
  getBindingOverview,
  getOverview
};
