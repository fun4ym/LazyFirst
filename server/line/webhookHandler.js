// LINE Webhook 事件分发
// M1：follow 发欢迎语；message 发通用帮助。
// M2：follow/message 使用 OA 级模板（templateService）；关键词自动回复（政策 / 客服）。
// M3 将在此接入绑定码识别（bindingService）。
const crypto = require('crypto');
const client = require('./client');
const flex = require('./flex');
const templateService = require('./templateService');
const bindingService = require('./bindingService');
const richMenuService = require('./richMenuService');
const User = require('../models/User');
const Influencer = require('../models/Influencer');

// 关键词映射（泰文/英文/中文均可触发）
const POLICY_KEYWORDS = ['นโยบาย', 'policy', '政策', '带货政策'];
const CONTACT_KEYWORDS = ['ติดต่อ', 'contact', '客服', '联系客服', '联系bd', 'BD'];
const SAMPLES_KEYWORDS = ['ขอตัวอย่าง', 'samples', '申样', '样品', '记录', 'record'];

function matchKeyword(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.some(k => lower.includes(k.toLowerCase()));
}

async function handle(event) {
  if (!event || !event.type) return;
  try {
    switch (event.type) {
      case 'follow':
        await handleFollow(event);
        break;
      case 'message':
        if (event.message && event.message.type === 'text') {
          await handleText(event);
        }
        break;
      case 'postback':
        await handlePostback(event);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error('[LINE] 处理事件失败:', err.message);
  }
}

async function handleFollow(event) {
  const replyToken = event.replyToken;
  const lineUserId = event.source && event.source.userId;
  try {
    await client.replyMessage(replyToken, flex.welcomeMessage());

    // 检查是否已绑定角色，自动挂对应 Rich Menu
    if (lineUserId) {
      try {
        const role = await bindingService.getRoleByLineUser(lineUserId);
        if (role) {
          await richMenuService.attachRoleMenu(lineUserId, role);
        }
      } catch (rmErr) {
        console.warn('[LINE] follow 自动挂菜单失败（忽略）:', rmErr.message);
      }
    }
  } catch (e) {
    console.error('[LINE] follow 回复失败:', e.message);
  }
}

async function handleText(event) {
  const replyToken = event.replyToken;
  const text = (event.message.text || '').trim();
  try {
    const companyId = await templateService.resolveCompanyId();
    const templates = await templateService.getTemplates(companyId);
    const lineUserId = event.source && event.source.userId;

    // 优先识别绑定码 → 完成 lineUserId ↔ Influencer/ShopContact 绑定
    const parsed = bindingService.parseCode(text);
    if (parsed) {
      try {
        const result = await bindingService.confirm({ token: parsed.token, lineUserId });
        if (result.ok) {
          const nameStr = result.name || '-';
          const roleStr = result.role || parsed.role;
          const shopName = result.shopName || '';
          const contactName = result.contactName || '';
          const shopCode = result.shopCode || '';
          const bdName = result.bdName || '';
          const bdContact = result.bdContact || '';

          // 发绑定成功 Flex 卡片（达人只发卡片，引导提示已在卡片内）
          const replyMessages = [flex.boundSuccessCard({ name: nameStr, role: roleStr, shopName, contactName, shopCode, bdName, bdContact })];
          if (roleStr !== 'influencer') {
            replyMessages.push(flex.onboardingGuide(roleStr));
          }
          await client.replyMessage(replyToken, replyMessages);

          // 绑定成功后自动挂对应角色菜单
          try {
            await richMenuService.attachRoleMenu(lineUserId, roleStr);
          } catch (rmErr) {
            console.warn('[LINE] 绑定后挂菜单失败（忽略）:', rmErr.message);
          }
        } else {
          await client.replyMessage(replyToken, {
            type: 'text',
            text: 'รหัสผูกบัญชีไม่ถูกต้องหรือหมดอายุ / Invalid or expired binding code.'
          });
        }
      } catch (bindErr) {
        console.error('[LINE] 绑定失败:', bindErr.message);
        await client.replyMessage(replyToken, {
          type: 'text',
          text: 'เกิดข้อผิดพลาด กรุณาลองใหม่ / Something went wrong, please try again.'
        });
      }
      return;
    }

    // 政策关键词 → 政策 Flex 卡
    if (matchKeyword(text, POLICY_KEYWORDS)) {
      await client.replyMessage(replyToken, flex.policyFlexCard(templates.policy));
      return;
    }

    // 联系方式关键词 → 统一回复 LINE 二维码 + 联系人信息
    if (matchKeyword(text, CONTACT_KEYWORDS)) {
      if (templates.autoReplyEnabled !== false) {
        try {
          const qrUrl = `${flex.baseUrl()}/images/contact-line-qr.jpg`;
          const procurementContact = await templateService.getProcurementContact(companyId);
          const phone = procurementContact.phone || '';
          const contactText = [
            '📞 联系方式 / ติดต่อเรา / Contact Us',
            '',
            '👤 联系人 / Contact: Mrs. Ding',
            phone ? `📱 电话 / Tel: ${phone}` : null,
            '💬 LINE: @380xfno',
            '🌐 官网 / Website: https://tap.lazyfirst.com',
            '',
            '扫码添加 LINE 好友 / สแกน QR Code เพื่อเพิ่มเพื่อน'
          ].filter(Boolean).join('\n');

          await client.replyMessage(replyToken, [
            {
              type: 'image',
              originalContentUrl: qrUrl,
              previewImageUrl: qrUrl
            },
            { type: 'text', text: contactText }
          ]);
        } catch (contactErr) {
          console.warn('[LINE] 联系方式回复失败:', contactErr.message);
          const msg = `${templates.contactReply.th}\n${templates.contactReply.en}`.trim();
          await client.replyMessage(replyToken, { type: 'text', text: msg });
        }
      }
      return;
    }

    // 样品关键词 → 根据用户角色返回对应的样品/产品链接
    if (matchKeyword(text, SAMPLES_KEYWORDS)) {
      try {
        const role = lineUserId ? await bindingService.getRoleByLineUser(lineUserId) : null;
        if (role === 'shopContact') {
          // 卖家：查找所属店铺，返回申样记录链接
          const ShopContact = require('../models/ShopContact');
          const shopContact = await ShopContact.findOne({ lineUserId }).populate('shopId', 'shopName shopCode identificationCode');
          if (shopContact && shopContact.shopId) {
            const code = shopContact.shopId.identificationCode;
            const shopName = shopContact.shopId.shopName || '';
            const link = code ? `${flex.baseUrl()}/samples/public?s=${code}` : `${flex.baseUrl()}/samples/public`;
            await client.replyMessage(replyToken, {
              type: 'text',
              text: `📋 รายการขอตัวอย่าง / Sample Records\n${shopName}\n\n👉 ${link}\n\n💡 เก็บลิงก์นี้ไว้เปิดดูรายการขอตัวอย่างได้ทุกเมื่อ / Bookmark this link to view sample records anytime.`
            });
          } else {
            await client.replyMessage(replyToken, {
              type: 'text',
              text: '🔒 กรุณาผูกบัญชีก่อนใช้งาน / Please bind your account first.\n\nติดต่อฝ่ายจัดซื้อเพื่อขอรหัสผูกบัญชี / Contact Procurement for your binding code.'
            });
          }
        } else if (role === 'influencer') {
          await client.replyMessage(replyToken, {
            type: 'text',
            text: `📦 ดูสินค้า / Browse Products\n👉 ${flex.baseUrl()}/products/public\n\n📋 กิจกรรม / Events\n👉 ${flex.baseUrl()}/recruitments/public`
          });
        } else {
          await client.replyMessage(replyToken, {
            type: 'text',
            text: '🔒 กรุณาผูกบัญชีก่อนใช้งาน / Please bind your account first.\n\nส่งรหัสผูกบัญชีของคุณที่นี่ / Send your binding code here to get started.'
          });
        }
      } catch (samplesErr) {
        console.warn('[LINE] 样品链接查找失败:', samplesErr.message);
        await client.replyMessage(replyToken, {
          type: 'text',
          text: '🔒 กรุณาผูกบัญชีก่อนใช้งาน / Please bind your account first.\n\nส่งรหัสผูกบัญชีของคุณที่นี่ / Send your binding code here.'
        });
      }
      return;
    }

    // 兜底通用帮助
    await client.replyMessage(replyToken, flex.genericHelpMessage());
  } catch (e) {
    console.error('[LINE] message 回复失败:', e.message);
  }
}

// 统一发送联系方式（LINE 二维码 + 联系人信息）
async function sendContactMessage(replyToken, companyId) {
  const qrUrl = `${flex.baseUrl()}/images/contact-line-qr.jpg`;
  const procurementContact = await templateService.getProcurementContact(companyId);
  const phone = procurementContact.phone || '';
  const contactText = [
    '📞 联系方式 / ติดต่อเรา / Contact Us',
    '',
    '👤 联系人 / Contact: Mrs. Ding',
    phone ? `📱 电话 / Tel: ${phone}` : null,
    '💬 LINE: @380xfno',
    '🌐 官网 / Website: https://tap.lazyfirst.com',
    '',
    '扫码添加 LINE 好友 / สแกน QR Code เพื่อเพิ่มเพื่อน'
  ].filter(Boolean).join('\n');
  await client.replyMessage(replyToken, [
    { type: 'image', originalContentUrl: qrUrl, previewImageUrl: qrUrl },
    { type: 'text', text: contactText }
  ]);
}

// Postback 事件分发（菜单按钮 / 卡片按钮触发）
async function handlePostback(event) {
  const replyToken = event.replyToken;
  const postback = event.postback;
  const data = (postback && postback.data) || '';
  const params = new URLSearchParams(data);
  const action = params.get('action');
  const lineUserId = event.source && event.source.userId;
  console.log('[LINE] Postback:', action, data);
  try {
    switch (action) {
      // 「联系专属 BD」：引导发送绑定码，提供「无专属 BD」入口
      case 'contact_bd': {
        await client.replyMessage(replyToken, {
          type: 'flex',
          altText: '联系专属 BD',
          contents: {
            type: 'bubble',
            body: {
              type: 'box', layout: 'vertical', spacing: 'md', paddingAll: 'md', contents: [
                { type: 'text', text: '请发送 BD 给你的代码完成绑定 🔑\n（绑定后即可自动匹配你的专属 BD）', wrap: true, size: 'md' },
                { type: 'button', style: 'primary', color: '#775999', action: { type: 'postback', label: '无专属 BD / No dedicated BD', data: 'action=list_bd' } }
              ]
            }
          }
        });
        break;
      }
      // 「联系采购部」：发送 LINE 二维码 + 联系人信息
      case 'contact_procurement': {
        const companyId = await templateService.resolveCompanyId();
        await sendContactMessage(replyToken, companyId);
        break;
      }
      // 「无专属 BD」：列出 BD 账号供选择
      case 'list_bd': {
        const companyId = await templateService.resolveCompanyId();
        const users = await User.find({
          companyId,
          $or: [{ role: 'bd' }, { isDefaultLineContact: true }],
          lineQr: { $ne: '' }
        }).populate('deptId', 'name').lean();
        if (!users.length) {
          await client.replyMessage(replyToken, { type: 'text', text: '暂无可联系的 BD，请直接联系采购部。' });
          break;
        }
        await client.replyMessage(replyToken, flex.bdListFlex(users));
        break;
      }
      // 选中某个 BD：展示其 LINE 二维码 + 链接
      case 'select_bd': {
        const bdId = params.get('bdId');
        if (!bdId) break;
        const companyId = await templateService.resolveCompanyId();
        const bd = await User.findOne({ _id: bdId, companyId }).lean();
        if (!bd) {
          await client.replyMessage(replyToken, { type: 'text', text: '未找到该 BD。' });
          break;
        }
        const card = flex.bdContactCard(bd);
        if (card.imageUrl) {
          await client.replyMessage(replyToken, [
            { type: 'image', originalContentUrl: card.imageUrl, previewImageUrl: card.imageUrl },
            { type: 'text', text: card.text }
          ]);
        } else {
          await client.replyMessage(replyToken, { type: 'text', text: card.text });
        }
        break;
      }
      // 「意见反馈」：返回带令牌的反馈页链接
      case 'feedback': {
        const companyId = await templateService.resolveCompanyId();
        const influencer = await Influencer.findOne({ lineUserId, companyId });
        if (!influencer) {
          await client.replyMessage(replyToken, { type: 'text', text: '请先发送绑定码完成绑定后再提交反馈。' });
          break;
        }
        if (!influencer.feedbackToken) {
          influencer.feedbackToken = crypto.randomBytes(16).toString('hex');
          await influencer.save();
        }
        await client.replyMessage(replyToken, {
          type: 'flex',
          altText: '意见反馈',
          contents: {
            type: 'bubble',
            body: {
              type: 'box', layout: 'vertical', spacing: 'md', paddingAll: 'md', contents: [
                { type: 'text', text: '💬 意见反馈 / Feedback', weight: 'bold', size: 'lg' },
                { type: 'text', text: '点击下方按钮提交您的意见或问题，我们会通过 LINE 回复您。', wrap: true, size: 'sm', color: '#666666' }
              ]
            },
            footer: {
              type: 'box', layout: 'vertical', spacing: 'sm', contents: [
                { type: 'button', style: 'primary', color: '#775999', action: { type: 'uri', label: '去反馈 / Send Feedback', uri: `${flex.baseUrl()}/feedback?t=${influencer.feedbackToken}` } }
              ]
            }
          }
        });
        break;
      }
      default:
        // 兼容旧菜单关键字暂不支持
        break;
    }
  } catch (err) {
    console.error('[LINE] postback 处理失败:', err.message);
  }
}

module.exports = { handle };
