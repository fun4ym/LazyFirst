// LINE Campaign 推送服务
// 复用 Activity 作为 Campaign 载体，ActivityHistory(action='line_push') 作为推送日志（零新表）。
// multicast 为主（早期受众 <50，≤500/次分批）；仅当人数≥50 且明确选择 narrowcast 时建受众组精准推送。
const Activity = require('../models/Activity');
const ActivityHistory = require('../models/ActivityHistory');
const Product = require('../models/Product');
const Recruitment = require('../models/Recruitment');
const LinePushRecord = require('../models/LinePushRecord');
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
    await writeRecord({
      companyId, type: 'campaign', refId: activity._id, refName: activity.name,
      operatorId, operatorName, mode: result.mode, audienceCriteria: criteria,
      recipientCount: 0, status: 'failed', error: result.error
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

  // 写入发送记录（用于「发送记录」弹层）
  await writeRecord({
    companyId, type: 'campaign', refId: activity._id, refName: activity.name,
    operatorId, operatorName, mode: result.mode, audienceCriteria: criteria,
    recipientCount: count, status: 'success'
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

// 统一写入「发送记录」
async function writeRecord({ companyId, type, refId, refName, operatorId, operatorName, mode, audienceCriteria, recipientCount, status, error }) {
  try {
    await LinePushRecord.create({
      companyId,
      type,
      refId,
      refName: refName || '',
      operatorId,
      operatorName: operatorName || '',
      mode: mode || 'multicast',
      audienceCriteria: audienceCriteria || {},
      recipientCount: recipientCount || 0,
      status: status || 'success',
      error: error || ''
    });
  } catch (e) {
    console.error('[LINE] 写入发送记录失败:', e.message);
  }
}

// 构建新品卡片所需参数
function buildProductCardArgs(product) {
  const img = (product.images && product.images[0]) ||
    (product.productImages && product.productImages[0]) || '';
  const price = product.price || product.priceRangeMin || 0;
  const commissionRate = product.commissionRate ||
    (product.activityConfigs && product.activityConfigs[0] && product.activityConfigs[0].promotionInfluencerRate) || null;
  const baseUrl = process.env.FRONTEND_URL || 'https://tap.lazyfirst.com';
  const productUrl = product.tiktokProductUrl || `${baseUrl}/products/public?productId=${product._id}`;
  return {
    name: product.name,
    price,
    currency: product.currency || 'THB',
    commissionRate,
    imageUrl: img,
    productUrl
  };
}

// 主动发起「新品推送」给指定受众（按标签筛选）
async function sendProduct({ productId, companyId, operatorId, operatorName, mode, criteriaOverride }) {
  if (!config.isConfigured) throw new Error('LINE 未配置凭证，无法推送');

  const product = await Product.findOne({ _id: productId, companyId }).lean();
  if (!product) throw new Error('商品不存在或无权限');

  const criteria = criteriaOverride || {};
  const { userIds, count } = await audienceService.getAudience(companyId, criteria);
  if (count === 0) {
    await writeRecord({
      companyId, type: 'product', refId: product._id, refName: product.name,
      operatorId, operatorName, mode: mode || 'multicast', audienceCriteria: criteria,
      recipientCount: 0, status: 'failed', error: 'no_audience'
    });
    throw new Error('没有匹配的已绑定 LINE 达人');
  }

  const message = flex.newProductCard(buildProductCardArgs(product));
  const useNarrowcast = mode === 'narrowcast' && count >= NARROWCAST_THRESHOLD;
  const resultMode = useNarrowcast ? 'narrowcast' : 'multicast';

  try {
    if (useNarrowcast) {
      const audienceGroupId = await audienceService.createAudienceGroupWithUsers(`product_${productId}_${Date.now()}`, userIds);
      const { requestId } = await lineClient.narrowcast({ messages: message, recipient: { audienceGroupId } });
      console.log(`[LINE] 新品推送(narrowcast) requestId=${requestId}, 人数=${count}`);
    } else {
      let batches = 0;
      for (let i = 0; i < userIds.length; i += MULTICAST_BATCH) {
        const batch = userIds.slice(i, i + MULTICAST_BATCH);
        await lineClient.multicast(batch, message);
        batches += 1;
      }
      console.log(`[LINE] 新品推送(multicast) 批数=${batches}, 人数=${count}`);
    }
    await writeRecord({
      companyId, type: 'product', refId: product._id, refName: product.name,
      operatorId, operatorName, mode: resultMode, audienceCriteria: criteria,
      recipientCount: count, status: 'success'
    });
    return { recipientCount: count, mode: resultMode };
  } catch (err) {
    await writeRecord({
      companyId, type: 'product', refId: product._id, refName: product.name,
      operatorId, operatorName, mode: resultMode, audienceCriteria: criteria,
      recipientCount: 0, status: 'failed', error: err.message
    });
    throw err;
  }
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

// 发起「招募推送」给指定受众（按标签筛选）
async function sendRecruitment({ recruitmentId, companyId, operatorId, operatorName, mode, criteriaOverride }) {
  if (!config.isConfigured) throw new Error('LINE 未配置凭证，无法推送');

  const recruitment = await Recruitment.findOne({ _id: recruitmentId, companyId }).lean();
  if (!recruitment) throw new Error('招募不存在或无权限');

  const criteria = criteriaOverride || {};
  const { userIds, count } = await audienceService.getAudience(companyId, criteria);
  if (count === 0) {
    await writeRecord({
      companyId, type: 'recruitment', refId: recruitment._id, refName: recruitment.name,
      operatorId, operatorName, mode: mode || 'multicast', audienceCriteria: criteria,
      recipientCount: 0, status: 'failed', error: 'no_audience'
    });
    throw new Error('没有匹配的已绑定 LINE 达人');
  }

  // 关联商品名
  let productsText = '';
  // 综合费率：取该招募下各商品的「推广佣金率」均值；高于广场 = 推广佣金率 - 广场佣金率（百分点）
  let rateInfo = null;
  if (recruitment.products && recruitment.products.length) {
    const prods = await Product.find({ _id: { $in: recruitment.products }, companyId }).lean();
    productsText = prods.map(p => p.name).join('、');
    const rates = prods.map(p => {
      const cfg = (p.activityConfigs && p.activityConfigs.length)
        ? (p.activityConfigs.find(a => a.isDefault) || p.activityConfigs[0])
        : null;
      const promo = (cfg && cfg.promotionInfluencerRate != null) ? Number(cfg.promotionInfluencerRate) : (p.promotionInfluencerRate != null ? Number(p.promotionInfluencerRate) : 0);
      const square = (cfg && cfg.squareCommissionRate != null) ? Number(cfg.squareCommissionRate) : (p.squareCommissionRate != null ? Number(p.squareCommissionRate) : 0);
      return { promo, square };
    }).filter(r => r.promo > 0 || r.square > 0);
    if (rates.length) {
      const avgPromo = rates.reduce((s, r) => s + r.promo, 0) / rates.length;
      const avgSquare = rates.reduce((s, r) => s + r.square, 0) / rates.length;
      const round1 = v => Math.round(v * 10) / 10;
      rateInfo = { rate: round1(avgPromo * 100), diff: round1((avgPromo - avgSquare) * 100) };
    }
  }
  // 要求文案
  const reqs = [];
  if (recruitment.requirementGmv) reqs.push(`GMV≥${recruitment.requirementGmv}`);
  if (recruitment.requirementFollowers) reqs.push(`FV≥${recruitment.requirementFollowers}K`);
  if (recruitment.requirementMonthlySales) reqs.push(`MSS≥${recruitment.requirementMonthlySales}`);
  if (recruitment.requirementAvgViews) reqs.push(`APV≥${recruitment.requirementAvgViews}`);
  const requirementText = reqs.join(' | ');

  const message = flex.campaignCard({
    name: recruitment.name,
    description: recruitment.description,
    requirementText,
    productsText,
    recruitmentId: recruitment.identificationCode || recruitment._id,
    rateInfo
  });

  const useNarrowcast = mode === 'narrowcast' && count >= NARROWCAST_THRESHOLD;
  const resultMode = useNarrowcast ? 'narrowcast' : 'multicast';

  try {
    if (useNarrowcast) {
      const audienceGroupId = await audienceService.createAudienceGroupWithUsers(`recruitment_${recruitmentId}_${Date.now()}`, userIds);
      const { requestId } = await lineClient.narrowcast({ messages: message, recipient: { audienceGroupId } });
      console.log(`[LINE] 招募推送(narrowcast) requestId=${requestId}, 人数=${count}`);
    } else {
      let batches = 0;
      for (let i = 0; i < userIds.length; i += MULTICAST_BATCH) {
        const batch = userIds.slice(i, i + MULTICAST_BATCH);
        await lineClient.multicast(batch, message);
        batches += 1;
      }
      console.log(`[LINE] 招募推送(multicast) 批数=${batches}, 人数=${count}`);
    }
    await writeRecord({
      companyId, type: 'recruitment', refId: recruitment._id, refName: recruitment.name,
      operatorId, operatorName, mode: resultMode, audienceCriteria: criteria,
      recipientCount: count, status: 'success'
    });
    return { recipientCount: count, mode: resultMode };
  } catch (err) {
    await writeRecord({
      companyId, type: 'recruitment', refId: recruitment._id, refName: recruitment.name,
      operatorId, operatorName, mode: resultMode, audienceCriteria: criteria,
      recipientCount: 0, status: 'failed', error: err.message
    });
    throw err;
  }
}

module.exports = {
  MULTICAST_BATCH,
  NARROWCAST_THRESHOLD,
  sendCampaign,
  sendProduct,
  sendRecruitment,
  getPushStatus
};
