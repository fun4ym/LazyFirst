// LINE 相关路由
// /webhook 免 JWT 鉴权，仅用 LINE 签名校验（由平台 POST 调用）
// 其余业务路由复用现有 authenticate 鉴权，在对应里程碑（M3/M4/M5）补充
const express = require('express');
const router = express.Router();
const config = require('../config/line');
const lineClient = require('../line/client');
const webhookHandler = require('../line/webhookHandler');
const templateService = require('../line/templateService');
const bindingService = require('../line/bindingService');
const audienceService = require('../line/audienceService');
const pushService = require('../line/pushService');
const quotaService = require('../line/quotaService');
const flex = require('../line/flex');
const { authenticate } = require('../middleware/auth');

// 允许的绑定角色
const VALID_ROLES = ['influencer', 'shopContact'];

// 拼接「带参加好友链接」：加好友后引导用户发送绑定码
function buildAddFriendLink(token) {
  const oaId = config.channelId ? `@${config.channelId}` : '';
  // 官方加好友链接（basic id 需为 @xxx 形式，若未配置则返回空）
  return {
    token,
    // 前端展示：让用户复制绑定码，加好友后在聊天内发送
    addFriendUrl: process.env.LINE_ADD_FRIEND_URL || 'https://line.me/R/ti/p/%40380xfno',
    oaId
  };
}

// 诊断：是否已配置 LINE 凭证
router.get('/status', (req, res) => {
  res.json({ success: true, configured: config.isConfigured, channelId: config.channelId });
});

// Webhook：签名校验 + 事件分发
router.post('/webhook', async (req, res) => {
  const signature = req.headers['x-line-signature'];
  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
  if (!signature || !lineClient.validateSignature(rawBody, signature)) {
    console.warn('[LINE] Webhook 签名校验失败，已拒绝');
    return res.status(401).json({ success: false, message: 'Invalid signature' });
  }
  const events = (req.body && req.body.events) || [];
  try {
    await Promise.all(events.map(e => webhookHandler.handle(e)));
  } catch (err) {
    console.error('[LINE] Webhook 处理异常:', err.message);
  }
  // LINE 要求即便处理失败也返回 200，避免平台重试风暴
  res.status(200).json({ success: true });
});

// ===== 以下业务路由复用现有 JWT 鉴权 =====

// 获取当前公司 LINE 模板（欢迎语 / 政策 / 客服自动回复，含默认值）
router.get('/templates', authenticate, async (req, res) => {
  try {
    const templates = await templateService.getTemplates(req.companyId);
    res.json({ success: true, templates });
  } catch (error) {
    console.error('[LINE] 获取模板失败:', error.message);
    res.status(500).json({ success: false, message: '获取 LINE 模板失败: ' + error.message });
  }
});

// 保存当前公司 LINE 模板
router.put('/templates', authenticate, async (req, res) => {
  try {
    const { templates } = req.body;
    if (!templates || typeof templates !== 'object') {
      return res.status(400).json({ success: false, message: 'templates 必须为对象' });
    }
    const saved = await templateService.saveTemplates(req.companyId, templates);
    res.json({ success: true, templates: saved, message: 'LINE 模板已保存' });
  } catch (error) {
    console.error('[LINE] 保存模板失败:', error.message);
    res.status(500).json({ success: false, message: '保存 LINE 模板失败: ' + error.message });
  }
});

// 部署/更新卖家专属 Rich Menu（政策 / 报名活动 / 联系客服）并设为默认
router.post('/rich-menu/setup', authenticate, async (req, res) => {
  try {
    if (!config.isConfigured) {
      return res.status(400).json({ success: false, message: 'LINE 未配置凭证，无法部署 Rich Menu' });
    }
    // 清理旧的同名 Rich Menu，避免堆积（SDK v11：getRichMenuList 返回 { richmenus: [...] }）
    try {
      const listRes = await lineClient.getRichMenuList();
      const list = listRes?.richmenus || listRes?.richMenuList || [];
      console.log('[LINE] Rich Menu 列表:', list.length, '个');
      await Promise.all(
        list
          .filter(m => m.name === 'supplyRichMenu')
          .map(m => lineClient.deleteRichMenu(m.richMenuId).catch(() => {}))
      );
    } catch (e) {
      console.warn('[LINE] 清理旧 Rich Menu 失败（忽略）:', e.message);
    }
    // SDK v11：createRichMenu 返回 { richMenuId: '...' }
    console.log('[LINE] 创建 Rich Menu...');
    const createRes = await lineClient.createRichMenu(flex.buildSupplyRichMenu());
    const richMenuId = createRes.richMenuId;
    console.log('[LINE] Rich Menu 创建成功:', richMenuId);
    // 注意：Rich Menu 图片需另行上传（setRichMenuImage），此处仅创建结构并设默认
    await lineClient.setDefaultRichMenu(richMenuId);
    res.json({
      success: true,
      richMenuId,
      message: 'Rich Menu 已创建并设为默认，请上传菜单图片后生效'
    });
  } catch (error) {
    const detail = error.body || error.message;
    console.error('[LINE] 部署 Rich Menu 失败:', detail);
    res.status(500).json({ success: false, message: '部署 Rich Menu 失败: ' + (error.body?.message || error.message) });
  }
});

// ===== M3 绑定码 =====

// 生成绑定码（达人 / 卖家）：body { role, id }
router.post('/binding-code', authenticate, async (req, res) => {
  try {
    const { role, id } = req.body;
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'role 必须为 influencer 或 shopContact' });
    }
    if (!id) {
      return res.status(400).json({ success: false, message: '缺少目标 id' });
    }
    const result = await bindingService.generateToken({ role, id, companyId: req.companyId });
    res.json({ success: true, ...result, link: buildAddFriendLink(result.token) });
  } catch (error) {
    console.error('[LINE] 生成绑定码失败:', error.message);
    res.status(400).json({ success: false, message: '生成绑定码失败: ' + error.message });
  }
});

// 查询绑定状态：query { role, id }
router.get('/binding-status', authenticate, async (req, res) => {
  try {
    const { role, id } = req.query;
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'role 必须为 influencer 或 shopContact' });
    }
    const status = await bindingService.getBindingStatus({ role, id, companyId: req.companyId });
    res.json({ success: true, ...status });
  } catch (error) {
    console.error('[LINE] 查询绑定状态失败:', error.message);
    res.status(400).json({ success: false, message: '查询绑定状态失败: ' + error.message });
  }
});

// 解绑：body { role, id }
router.post('/unbind', authenticate, async (req, res) => {
  try {
    const { role, id } = req.body;
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'role 必须为 influencer 或 shopContact' });
    }
    await bindingService.unbind({ role, id, companyId: req.companyId });
    res.json({ success: true, message: '已解绑' });
  } catch (error) {
    console.error('[LINE] 解绑失败:', error.message);
    res.status(400).json({ success: false, message: '解绑失败: ' + error.message });
  }
});

// ===== M4 受众分群 & 推送 =====

// 受众预估：body { criteria: { categoryTags, suitableCategories, followerMin, followerMax } }
router.post('/audience/preview', authenticate, async (req, res) => {
  try {
    const criteria = (req.body && req.body.criteria) || {};
    const count = await audienceService.previewCount(req.companyId, criteria);
    const mode = count >= pushService.NARROWCAST_THRESHOLD ? 'narrowcast_available' : 'multicast';
    res.json({ success: true, count, suggestedMode: mode, narrowcastThreshold: pushService.NARROWCAST_THRESHOLD });
  } catch (error) {
    console.error('[LINE] 受众预估失败:', error.message);
    res.status(500).json({ success: false, message: '受众预估失败: ' + error.message });
  }
});

// 发起活动 Campaign 推送：body { productId?, mode?, criteria? }
router.post('/activity/:id/push', authenticate, async (req, res) => {
  try {
    const { productId, mode, criteria } = req.body || {};
    const result = await pushService.sendCampaign({
      activityId: req.params.id,
      companyId: req.companyId,
      operatorId: req.userId,
      operatorName: (req.user && (req.user.realName || req.user.username)) || '',
      productId,
      mode,
      criteriaOverride: criteria
    });
    res.json({ success: true, ...result, message: '推送已发起' });
  } catch (error) {
    console.error('[LINE] 发起推送失败:', error.message);
    res.status(400).json({ success: false, message: '发起推送失败: ' + error.message });
  }
});

// 回查推送进度：query { requestId? }
router.get('/activity/:id/push-status', authenticate, async (req, res) => {
  try {
    const status = await pushService.getPushStatus({
      activityId: req.params.id,
      companyId: req.companyId,
      requestId: req.query.requestId
    });
    res.json({ success: true, ...status });
  } catch (error) {
    console.error('[LINE] 回查推送进度失败:', error.message);
    res.status(500).json({ success: false, message: '回查推送进度失败: ' + error.message });
  }
});

// ===== M5 额度 & 概览 =====

// 本月额度使用情况
router.get('/quota', authenticate, async (req, res) => {
  try {
    const usage = await quotaService.getMonthlyUsage(req.companyId);
    res.json({ success: true, usage });
  } catch (error) {
    console.error('[LINE] 获取额度失败:', error.message);
    res.status(500).json({ success: false, message: '获取额度失败: ' + error.message });
  }
});

// Dashboard 概览：绑定数 + 本月推送 + 额度
router.get('/overview', authenticate, async (req, res) => {
  try {
    const overview = await quotaService.getOverview(req.companyId);
    res.json({ success: true, ...overview });
  } catch (error) {
    console.error('[LINE] 获取概览失败:', error.message);
    res.status(500).json({ success: false, message: '获取概览失败: ' + error.message });
  }
});

module.exports = router;
