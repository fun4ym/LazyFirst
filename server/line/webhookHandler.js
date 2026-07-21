// LINE Webhook 事件分发
// M1：follow 发欢迎语；message 发通用帮助。
// M2：follow/message 使用 OA 级模板（templateService）；关键词自动回复（政策 / 客服）。
// M3 将在此接入绑定码识别（bindingService）。
const client = require('./client');
const flex = require('./flex');
const templateService = require('./templateService');
const bindingService = require('./bindingService');
const richMenuService = require('./richMenuService');

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
        // M3 处理：绑定码回传等
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
    const companyId = await templateService.resolveCompanyId();
    const templates = await templateService.getTemplates(companyId);
    const procurementContact = await templateService.getProcurementContact(companyId);
    await client.replyMessage(replyToken, flex.welcomeMessage({
      welcome: templates.welcome,
      procurementContact,
      baseUrl: flex.baseUrl()
    }));

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

          // 发绑定成功 Flex 卡片
          await client.replyMessage(replyToken, [
            flex.boundSuccessCard({ name: nameStr, role: roleStr, shopName, contactName, shopCode, bdName, bdContact }),
            flex.onboardingGuide(roleStr)
          ]);

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

module.exports = { handle };
