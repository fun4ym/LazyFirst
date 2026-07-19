// LINE Campaign 推送服务
// 复用 Activity 作为 Campaign 载体，ActivityHistory(action='line_push') 作为推送日志（零新表）。
// multicast 为主（早期受众 <50，≤500/次分批）；仅当人数≥50 且明确选择 narrowcast 时建受众组精准推送。
const Activity = require('../models/Activity');
const ActivityHistory = require('../models/ActivityHistory');
const Product = require('../models/Product');
const audienceService = require('./audienceService');
const quotaService = require('./quotaService');
const flex = require('./flex');
const lineClient = require('./client');
const config = require('../config/line');

const MULTICAST_BATCH = 500;      // LINE multicast 单次上限
const NARROWCAST_THRESHOLD = 50;  // narrowcast 最小受众门槛

// 取活动关联产品（用于 Flex 产品卡）；优先指定 productId，否则取参与该活动的首个产品
async function resolveProduct(companyId, activityId, productId) {
  const baseQuery = { companyId };
  if (productId) {
    const p = await Product.findOne({ ...baseQuery, _id: productId }).lean();
    if (p) return p;
  }
  return Product.findOne({ ...baseQuery, 'activityConfigs.activityId': activityId }).lean();
}

// 写推送日志（复用 ActivityHistory）
async function writeLog({ activityId, companyId, operatorId, operatorName, newData }) {
  try {
    await ActivityHistory.create({
      activityId,
      action: 'line_push',
      newData,
      changedBy: operatorId,
      changedByName: operatorName || '',
      companyId
    });
  } catch (e) {
    console.error('[LINE] 写推送日志失败:', e.message);
  }
}

// 发起 Campaign 推送
// 入参：{ activityId, companyId, operatorId, operatorName, productId?, mode? ('multicast'|'narrowcast'), criteriaOverride? }
async function sendCampaign({ activityId, companyId, operatorId, operatorName, productId, mode, criteriaOverride }) {
  if (!config.isConfigured) {
    throw new Error('LINE 未配置凭证，无法推送');
  }

  const activity = await Activity.findOne({ _id: activityId, companyId });
  if (!activity) throw new Error('活动不存在或无权限');

  // 受众条件：优先前端覆盖，否则用活动已存的 linePush.audienceCriteria
  const criteria = criteriaOverride || (activity.linePush && activity.linePush.audienceCriteria) || {};

  const { userIds, count } = await audienceService.getAudience(companyId, criteria);
  if (count === 0) {
    await writeLog({
      activityId, companyId, operatorId, operatorName,
      newData: { status: 'failed', reason: 'no_audience', recipientCount: 0, mode: mode || 'multicast' }
    });
    throw new Error('匹配受众为 0，无法推送');
  }

  const product = await resolveProduct(companyId, activityId, productId);
  if (!product) throw new Error('活动下无可推送产品，请先为活动关联产品');

  const message = flex.productFlexCard(product);

  // 决定推送模式：默认 multicast；仅当明确 narrowcast 且人数≥门槛时走 narrowcast
  const useNarrowcast = mode === 'narrowcast' && count >= NARROWCAST_THRESHOLD;

  let result = { mode: useNarrowcast ? 'narrowcast' : 'multicast', recipientCount: count };

  try {
    if (useNarrowcast) {
      const audienceGroupId = await audienceService.createAudienceGroupWithUsers(
        `campaign_${activityId}_${Date.now()}`,
        userIds
      );
      const { requestId } = await lineClient.narrowcast({ messages: message, recipient: { audienceGroupId } });
      result.requestId = requestId;
      result.audienceGroupId = audienceGroupId;
    } else {
      // multicast 分批
      const requestIds = [];
      for (let i = 0; i < userIds.length; i += MULTICAST_BATCH) {
        const batch = userIds.slice(i, i + MULTICAST_BATCH);
        await lineClient.multicast(batch, message);
        requestIds.push(`batch_${Math.floor(i / MULTICAST_BATCH) + 1}`);
      }
      result.batches = requestIds.length;
    }
    result.status = 'success';
  } catch (err) {
    result.status = 'failed';
    result.error = err.message;
    await writeLog({
      activityId, companyId, operatorId, operatorName,
      newData: { ...result, productId: product._id }
    });
    // 回写活动
    activity.linePush = activity.linePush || {};
    activity.linePush.lastPushAt = new Date();
    activity.linePush.lastPushStatus = 'failed';
    activity.linePush.lastMode = result.mode;
    await activity.save();
    throw err;
  }

  // 成功：回写活动 + 日志
  activity.linePush = activity.linePush || {};
  activity.linePush.enabled = true;
  activity.linePush.audienceCriteria = criteria;
  activity.linePush.lastPushAt = new Date();
  activity.linePush.lastPushStatus = 'success';
  activity.linePush.lastRecipientCount = count;
  activity.linePush.lastMode = result.mode;
  if (result.audienceGroupId) activity.linePush.audienceGroupId = result.audienceGroupId;
  await activity.save();

  await writeLog({
    activityId, companyId, operatorId, operatorName,
    newData: {
      status: 'success',
      recipientCount: count,
      mode: result.mode,
      requestId: result.requestId || '',
      productId: product._id,
      productName: product.name
    }
  });

  // 额度告警：本次推送后若接近/超出月度额度，记录告警日志
  try {
    const usage = await quotaService.getMonthlyUsage(companyId);
    if (usage.exceeded) {
      console.warn(`[LINE][额度告警] 公司 ${companyId} 本月推送 ${usage.messageCount} 条已达/超过额度 ${usage.quota}`);
      result.quotaWarn = 'exceeded';
    } else if (usage.warn) {
      console.warn(`[LINE][额度告警] 公司 ${companyId} 本月推送 ${usage.messageCount}/${usage.quota}，已达 ${Math.round(usage.usedRatio * 100)}%`);
      result.quotaWarn = 'warn';
    }
    result.usage = usage;
  } catch (e) {
    console.error('[LINE] 额度统计失败:', e.message);
  }

  return result;
}

// 回查 narrowcast 进度（multicast 无 progress，返回 last 日志）
async function getPushStatus({ activityId, companyId, requestId }) {
  if (requestId) {
    try {
      const progress = await lineClient.getProgress(requestId);
      return { mode: 'narrowcast', progress };
    } catch (e) {
      return { mode: 'narrowcast', error: e.message };
    }
  }
  const activity = await Activity.findOne({ _id: activityId, companyId }).select('linePush').lean();
  return { mode: (activity && activity.linePush && activity.linePush.lastMode) || '', linePush: activity ? activity.linePush : null };
}

module.exports = {
  MULTICAST_BATCH,
  NARROWCAST_THRESHOLD,
  sendCampaign,
  getPushStatus
};
