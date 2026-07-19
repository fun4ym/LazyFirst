// LINE Messaging API 客户端封装（基于官方 @line/bot-sdk v11）
// 统一封装签名校验、reply/push/multicast/narrowcast、受众组、进度、Rich Menu。
// 仅在对 LINE 实际发请求时才实例化 Client，未配置凭证时不抛错（便于本地启动）。
// SDK v11 变更：
//   - Client → messagingApi.MessagingApiClient
//   - setRichMenuImage → messagingApi.MessagingApiBlobClient
//   - 受众组 → manageAudience.ManageAudienceClient
//   - getProgress → getNarrowcastProgress
const line = require('@line/bot-sdk');
const config = require('../config/line');

let client = null;
let blobClient = null;
let audienceClient = null;

const clientConfig = { channelAccessToken: config.channelAccessToken };

function getClient() {
  if (!client) {
    if (!config.channelAccessToken || !config.channelSecret) {
      throw new Error('LINE 未配置：请在 .env 设置 LINE_CHANNEL_ACCESS_TOKEN 与 LINE_CHANNEL_SECRET');
    }
    client = new line.messagingApi.MessagingApiClient(clientConfig);
  }
  return client;
}

function getBlobClient() {
  if (!blobClient) {
    if (!config.channelAccessToken) {
      throw new Error('LINE 未配置：请在 .env 设置 LINE_CHANNEL_ACCESS_TOKEN');
    }
    blobClient = new line.messagingApi.MessagingApiBlobClient(clientConfig);
  }
  return blobClient;
}

function getAudienceClient() {
  if (!audienceClient) {
    if (!config.channelAccessToken) {
      throw new Error('LINE 未配置：请在 .env 设置 LINE_CHANNEL_ACCESS_TOKEN');
    }
    audienceClient = new line.manageAudience.ManageAudienceClient(clientConfig);
  }
  return audienceClient;
}

// 仅做签名校验，可在未配置 Client 时调用（需要 channelSecret）
function validateSignature(rawBody, signature) {
  if (!config.channelSecret) return false;
  try {
    return line.validateSignature(rawBody, signature, config.channelSecret);
  } catch (e) {
    console.error('[LINE] 签名校验异常:', e.message);
    return false;
  }
}

// 回复（follow/message 事件携带 replyToken，1 秒内有效）
async function replyMessage(replyToken, messages) {
  return getClient().replyMessage({ replyToken, messages });
}

// 主动推送（指定 userId / 数组）
async function pushMessage(to, messages) {
  return getClient().pushMessage({ to, messages });
}

// 多人推送（userId 数组，单次上限 500，调用方负责分批）
async function multicast(to, messages) {
  return getClient().multicast({ to, messages });
}

// 精准推送（narrowcast）：先建受众组再发送，返回 requestId 供进度回查
// recipient 接受 { audienceGroupId } 或完整 recipient 对象
async function narrowcast({ messages, recipient, demographic }) {
  let finalRecipient = recipient;
  if (recipient && recipient.audienceGroupId && !recipient.group && !recipient.type) {
    finalRecipient = { group: { audienceGroupId: recipient.audienceGroupId } };
  }
  const body = { messages, recipient: finalRecipient };
  if (demographic) body.demographic = demographic;
  const res = await getClient().narrowcast(body);
  return res; // { requestId }
}

// 查询 narrowcast 进度
async function getProgress(requestId) {
  return getClient().getNarrowcastProgress({ requestId });
}

// 创建受众组（upload 类型，v11：manageAudience 模块）
async function createAudienceGroup({ description }) {
  const res = await getAudienceClient().createAudienceGroup({
    createAudienceGroupRequest: { description, isIfaAudience: false }
  });
  return res; // { audienceGroupId }
}

// 向受众组追加 userId 列表（v11：addAudienceToAudienceGroup）
async function addAudiences({ audienceGroupId, userIds }) {
  const audiences = (userIds || []).map(id => ({ id }));
  if (!audiences.length) return;
  await getAudienceClient().addAudienceToAudienceGroup({
    audienceGroupId,
    addAudienceToAudienceGroupRequest: { audienceGroupId, audiences }
  });
}

// Rich Menu：创建并返回 richMenuId（SDK v11：直接传对象，不包装）
async function createRichMenu(richMenuObject) {
  return getClient().createRichMenu(richMenuObject);
}

async function setRichMenuImage(richMenuId, buffer, contentType) {
  return getBlobClient().setRichMenuImage(richMenuId, buffer, contentType);
}

async function setDefaultRichMenu(richMenuId) {
  return getClient().setDefaultRichMenu({ richMenuId });
}

async function getRichMenuList() {
  return getClient().getRichMenuList();
}

async function deleteRichMenu(richMenuId) {
  return getClient().deleteRichMenu({ richMenuId });
}

module.exports = {
  getClient,
  validateSignature,
  replyMessage,
  pushMessage,
  multicast,
  narrowcast,
  getProgress,
  createAudienceGroup,
  addAudiences,
  createRichMenu,
  setRichMenuImage,
  setDefaultRichMenu,
  getRichMenuList,
  deleteRichMenu
};
