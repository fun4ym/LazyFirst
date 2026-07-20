// LINE 绑定服务（方案A：唯一绑定码；预留方案B：官方 Account Link linkToken）
// 达人写 Influencer.lineUserId，卖家写 ShopContact.lineUserId（零新表）。
const crypto = require('crypto');
const Influencer = require('../models/Influencer');
const ShopContact = require('../models/ShopContact');

// 绑定码前缀区分角色：达人 LZI / 卖家 LZS
const PREFIX = { influencer: 'LZI', shopContact: 'LZS' };
// 绑定码正则（用于 Webhook 文本识别）
const CODE_REGEX = /\b(LZI|LZS)-([A-Z0-9]{6})\b/i;

function targetModel(role) {
  if (role === 'influencer') return Influencer;
  if (role === 'shopContact') return ShopContact;
  throw new Error('未知绑定角色: ' + role);
}

// 生成 6 位大写字母数字随机码
function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去除易混淆字符
  let s = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) s += chars[bytes[i] % chars.length];
  return s;
}

// 方案A：为达人/卖家生成唯一绑定码并落库
// role: 'influencer' | 'shopContact'
async function generateToken({ role, id, companyId }) {
  const Model = targetModel(role);
  const doc = await Model.findOne({ _id: id, companyId });
  if (!doc) throw new Error('目标不存在或无权限');
  const token = `${PREFIX[role]}-${randomCode()}`;
  doc.lineBindingToken = token;
  await doc.save();
  return { token, role, id: doc._id };
}

// 从文本中解析绑定码（供 Webhook 使用）
function parseCode(text) {
  if (!text) return null;
  const m = String(text).match(CODE_REGEX);
  if (!m) return null;
  const prefix = m[1].toUpperCase();
  const code = m[2].toUpperCase();
  const token = `${prefix}-${code}`;
  const role = prefix === 'LZI' ? 'influencer' : 'shopContact';
  return { token, role };
}

// 方案A：确认绑定，将 lineUserId 写入匹配到 bindingToken 的记录
// 返回 { ok, role, name } 或 { ok:false, reason }
async function confirm({ token, lineUserId }) {
  console.log('[LINE Binding] confirm called:', { token, lineUserId: lineUserId || 'EMPTY!' });
  if (!token || !lineUserId) return { ok: false, reason: 'invalid_params' };
  const parsed = parseCode(token);
  if (!parsed) return { ok: false, reason: 'invalid_token' };
  const Model = targetModel(parsed.role);

  // 同一 lineUserId 已绑定其它记录 → 先解绑，保证一对一
  await Model.updateMany(
    { lineUserId, lineBindingToken: { $ne: parsed.token } },
    { $set: { lineUserId: '' } }
  );

  const doc = await Model.findOne({ lineBindingToken: parsed.token })
    .populate(parsed.role === 'influencer' ? 'assignedTo' : 'tracker', 'realName phone');

  if (!doc) return { ok: false, reason: 'token_not_found' };

  console.log('[LINE Binding] before save:', { docId: doc._id, lineUserId, currentLineUserId: doc.lineUserId });
  doc.lineUserId = lineUserId;
  doc.lineBoundAt = new Date();
  doc.lineBindingToken = ''; // 一次性绑定码，用后失效
  await doc.save();
  console.log('[LINE Binding] after save:', { docId: doc._id, savedLineUserId: doc.lineUserId, lineBoundAt: doc.lineBoundAt });

  // 提取 BD 信息
  let bdName = '';
  let bdContact = '';
  if (parsed.role === 'influencer' && doc.assignedTo) {
    bdName = doc.assignedTo.realName || '';
    bdContact = doc.assignedTo.phone || '';
  } else if (parsed.role !== 'influencer') {
    bdName = doc.trackerName || '';
  }

  return {
    ok: true,
    role: parsed.role,
    name: doc.nickname || doc.name || doc.contactName || '',
    bdName,
    bdContact
  };
}

// 查询绑定状态
async function getBindingStatus({ role, id, companyId }) {
  const Model = targetModel(role);
  const doc = await Model.findOne({ _id: id, companyId })
    .select('lineUserId lineBindingToken lineBoundAt');
  if (!doc) throw new Error('目标不存在或无权限');
  return {
    bound: Boolean(doc.lineUserId),
    lineUserId: doc.lineUserId || '',
    lineBindingToken: doc.lineBindingToken || '',
    lineBoundAt: doc.lineBoundAt || null
  };
}

// 解绑
async function unbind({ role, id, companyId }) {
  const Model = targetModel(role);
  const doc = await Model.findOne({ _id: id, companyId });
  if (!doc) throw new Error('目标不存在或无权限');
  doc.lineUserId = '';
  doc.lineBoundAt = null;
  await doc.save();
  return { ok: true };
}

// 根据 lineUserId 反向查询绑定角色（供 Rich Menu 自动挂载）
async function getRoleByLineUser(lineUserId) {
  if (!lineUserId) return null;
  const influencer = await Influencer.findOne({ lineUserId });
  if (influencer) return 'influencer';
  const shopContact = await ShopContact.findOne({ lineUserId });
  if (shopContact) return 'shopContact';
  return null;
}

// ===== 预留方案B：官方 Account Link（linkToken/nonce）=====
// 上线 LIFF/Account Link 后实现：校验 nonce、用 linkToken 换取绑定关系。
async function bindWithLinkToken({ lineUserId, linkToken, nonce }) {
  // TODO 方案B：待启用 LIFF/Account Link 时实现
  throw new Error('方案B（Account Link）暂未启用');
}

module.exports = {
  PREFIX,
  CODE_REGEX,
  generateToken,
  parseCode,
  confirm,
  getBindingStatus,
  unbind,
  bindWithLinkToken,
  getRoleByLineUser
};
