// LINE 受众分群服务：按活动 linePush.audienceCriteria 在本系统侧查匹配达人
// 只把结果（userId 列表）同步给 LINE，不依赖 LINE demographic（未认证账号不支持）。
const Influencer = require('../models/Influencer');
const lineClient = require('./client');

// 构造受众查询条件（强制多租户 companyId + 已绑定 LINE + 启用 + 非黑名单）
function buildQuery(companyId, criteria = {}) {
  const query = {
    companyId,
    status: 'enabled',
    isBlacklisted: { $ne: true },
    lineUserId: { $exists: true, $nin: ['', null] }
  };

  const cats = (criteria.categoryTags || []).filter(Boolean);
  if (cats.length) query.categoryTags = { $in: cats };

  const suits = (criteria.suitableCategories || []).filter(Boolean);
  if (suits.length) query.suitableCategories = { $in: suits };

  const min = Number(criteria.followerMin || 0);
  const max = Number(criteria.followerMax || 0);
  if (min > 0 || max > 0) {
    query.latestFollowers = {};
    if (min > 0) query.latestFollowers.$gte = min;
    if (max > 0) query.latestFollowers.$lte = max;
  }

  return query;
}

// 按条件取 userId 列表 + 人数
async function getAudience(companyId, criteria = {}) {
  const query = buildQuery(companyId, criteria);
  const docs = await Influencer.find(query).select('lineUserId').lean();
  const userIds = docs.map(d => d.lineUserId).filter(Boolean);
  // 去重
  const unique = [...new Set(userIds)];
  return { userIds: unique, count: unique.length };
}

// 仅预估人数（不返回 userId，供前端预览）
async function previewCount(companyId, criteria = {}) {
  const query = buildQuery(companyId, criteria);
  const count = await Influencer.countDocuments(query);
  return count;
}

// 为 ≥50 人的 narrowcast 创建受众组并上传 userId（分批 ≤1000/次）
async function createAudienceGroupWithUsers(description, userIds) {
  const { audienceGroupId } = await lineClient.createAudienceGroup({ description });
  const BATCH = 1000;
  for (let i = 0; i < userIds.length; i += BATCH) {
    await lineClient.addAudiences({ audienceGroupId, userIds: userIds.slice(i, i + BATCH) });
  }
  return audienceGroupId;
}

module.exports = {
  buildQuery,
  getAudience,
  previewCount,
  createAudienceGroupWithUsers
};
