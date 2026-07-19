// LINE 官方账号配置（@380xfno，泰国，未验证账号）
// 所有密钥来自 .env，绝不入库/进 git
require('dotenv').config();

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const channelSecret = process.env.LINE_CHANNEL_SECRET || '';
const channelId = process.env.LINE_CHANNEL_ID || '';
const liffId = process.env.LINE_LIFF_ID || '';
const webhookBaseUrl = process.env.LINE_WEBHOOK_BASE_URL || '';
// 单一 LINE OA 归属公司：Webhook 无 JWT 上下文，用此定位公司（缺省时回退首个公司）
const defaultCompanyId = process.env.LINE_DEFAULT_COMPANY_ID || '';

// 是否已配置完整凭证（未配置时仅加载，不抛错，便于本地启动）
const isConfigured = Boolean(channelAccessToken && channelSecret);

module.exports = {
  channelAccessToken,
  channelSecret,
  channelId,
  liffId,
  webhookBaseUrl,
  defaultCompanyId,
  isConfigured
};
