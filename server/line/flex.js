// Flex Message / Rich Menu 构造器
// 复用现有紫色主调(#775999)与卡片式设计语言，文案默认泰文+英文兜底（可配置）。
const config = require('../config/line');

function baseUrl() {
  // 兜底为空时用占位 URL，避免 Rich Menu 创建失败（LINE 要求 uri 必须 https://）
  return config.webhookBaseUrl || process.env.FRONTEND_URL || 'https://lazyfirst.example.com';
}

// 加好友欢迎语（follow 事件回复）
// tpl: 可选 { th, en } 模板文案，缺省用内置默认
function welcomeMessage(tpl) {
  const thText = (tpl && tpl.th) || 'ยินดีต้อนรับสู่ LazyFirst! ส่งรหัสผูกบัญชีของคุณเพื่อรับการแจ้งเตือนสินค้าตามความสนใจ';
  const enText = (tpl && tpl.en) || 'Send your binding code to receive matched product updates.';
  return {
    type: 'flex',
    altText: 'ยินดีต้อนรับสู่ LazyFirst / Welcome to LazyFirst',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#775999',
        contents: [
          {
            type: 'text',
            text: 'LazyFirst',
            color: '#FFFFFF',
            weight: 'bold',
            size: 'xl'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: thText,
            weight: 'bold',
            size: 'md',
            wrap: true
          },
          {
            type: 'text',
            text: enText,
            size: 'sm',
            color: '#666666',
            wrap: true
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'หากคุณเป็น TikTok Shop Seller โปรดเลือก "สมัครร่วมกิจกรรม" ในเมนู',
            size: 'xs',
            color: '#999999',
            wrap: true
          }
        ]
      }
    }
  };
}

// 通用帮助/占位回复（M2 将升级为关键词自动回复）
function genericHelpMessage() {
  return {
    type: 'text',
    text: 'หากคุณต้องการรับการแจ้งเตือนสินค้า โปรดส่ง "รหัสผูกบัญชี" ของคุณ\nTo receive product alerts, please send your binding code.'
  };
}

// 带货政策卡片（F1-2）
// tpl: 可选 { th, en } 模板文案，缺省用内置默认；文案按行拆分展示
function policyFlexCard(tpl) {
  const thLines = ((tpl && tpl.th) || '• ค่าคอมมิชชั่นสูงถึง 20%\n• รับสินค้าตัวอย่างฟรี')
    .split('\n').filter(Boolean);
  const enLines = ((tpl && tpl.en) || '• Up to 20% commission\n• Free samples')
    .split('\n').filter(Boolean);
  const bodyContents = [];
  thLines.forEach(line => bodyContents.push({ type: 'text', text: line, size: 'sm', wrap: true }));
  enLines.forEach(line => bodyContents.push({ type: 'text', text: line, size: 'sm', color: '#666666', wrap: true }));
  return {
    type: 'flex',
    altText: 'นโยบายการสนับสนุน / Partnership Policy',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#775999',
        contents: [
          { type: 'text', text: 'นโยบายการสนับสนุน', color: '#FFFFFF', weight: 'bold', size: 'lg' },
          { type: 'text', text: 'Partnership Policy', color: '#E6DCF0', size: 'sm' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: bodyContents
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#775999',
            action: { type: 'uri', label: 'สมัครร่วมกิจกรรม', uri: `${baseUrl()}/recruitments/public` }
          }
        ]
      }
    }
  };
}

// 产品卡（F2-3 / F2-4）：图 + 标题 + 价格 + 去带货按钮
function productFlexCard(product) {
  const img = (product.productImages && product.productImages[0]) || '';
  const priceText = `${product.currency || 'THB'} ${Number(product.price || 0).toLocaleString()}`;
  const jumpUrl = product.tiktokProductUrl
    || `${baseUrl()}/products/public?productId=${product._id || product.id}`;
  return {
    type: 'flex',
    altText: product.name || 'Product',
    contents: {
      type: 'bubble',
      hero: img
        ? { type: 'image', url: img, size: 'full', aspectRatio: '20:13', aspectMode: 'cover' }
        : undefined,
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          { type: 'text', text: product.name || 'Product', weight: 'bold', size: 'md', wrap: true },
          { type: 'text', text: priceText, size: 'sm', color: '#775999', weight: 'bold' }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#775999',
            action: { type: 'uri', label: '去带货 / Shop now', uri: jumpUrl }
          }
        ]
      }
    }
  };
}

// 卖家专属 Rich Menu（F1-1）：政策 / 报名活动 / 联系客服
function buildSupplyRichMenu() {
  const u = baseUrl();
  return {
    size: { width: 2500, height: 843 },
    selected: true,
    name: 'supplyRichMenu',
    chatBarText: 'เมนูผู้ขาย',
    areas: [
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: { type: 'message', label: 'นโยบาย', text: 'นโยบาย' }
      },
      {
        bounds: { x: 833, y: 0, width: 834, height: 843 },
        action: { type: 'uri', label: 'สมัครร่วมกิจกรรม', uri: `${u}/recruitments/public` }
      },
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: { type: 'message', label: 'ติดต่อ', text: 'ติดต่อ' }
      }
    ]
  };
}

// 达人专属 Rich Menu（F2）：热门产品 / 最新活动 / 联系客服
function buildInfluencerRichMenu() {
  const u = baseUrl();
  return {
    size: { width: 2500, height: 843 },
    selected: true,
    name: 'influencerRichMenu',
    chatBarText: 'Creator Menu',
    areas: [
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: { type: 'uri', label: 'กิจกรรมล่าสุด', uri: `${u}/recruitments/public` }
      },
      {
        bounds: { x: 833, y: 0, width: 834, height: 843 },
        action: { type: 'postback', label: 'สินค้าแนะนำ', data: 'action=hot_products' }
      },
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: { type: 'message', label: 'ติดต่อ', text: 'ติดต่อ' }
      }
    ]
  };
}

// 绑定成功卡片（F3-1：达人/卖家绑定后首次展示）
// { name, role, bdName, bdContact }
function boundSuccessCard({ name, role, bdName, bdContact }) {
  const roleLabel = role === 'influencer'
    ? { th: 'Creator', en: 'Creator' }
    : { th: 'ผู้ขาย', en: 'Seller' };
  const nameLabel = role === 'influencer' ? 'Creator' : 'Store';
  const bdLine = bdName ? `BD: ${bdName}${bdContact ? ' | ' + bdContact : ''}` : null;
  const bodyContents = [
    { type: 'text', text: `${nameLabel}: ${name || '-'}`, size: 'sm', wrap: true },
    { type: 'text', text: `Role: ${roleLabel.en}`, size: 'sm', color: '#666666' },
  ];
  if (bdLine) {
    bodyContents.push({ type: 'separator', margin: 'md' });
    bodyContents.push({ type: 'text', text: bdLine, size: 'sm', wrap: true, color: '#555555' });
  }
  const footerButtons = role === 'influencer'
    ? [
        { type: 'button', style: 'primary', color: '#775999', action: { type: 'uri', label: '📦 View Products', uri: `${baseUrl()}/products/public` } },
        { type: 'button', style: 'secondary', action: { type: 'uri', label: '📋 View Events', uri: `${baseUrl()}/recruitments/public` } }
      ]
    : [
        { type: 'button', style: 'primary', color: '#775999', action: { type: 'uri', label: '📦 View Products', uri: `${baseUrl()}/products/public` } },
        { type: 'button', style: 'secondary', action: { type: 'uri', label: '📋 Samples', uri: `${baseUrl()}/samples-public` } }
      ];
  return {
    type: 'flex',
    altText: 'ผูกบัญชีสำเร็จ! / Bound successfully!',
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#775999',
        contents: [
          { type: 'text', text: 'ผูกบัญชีสำเร็จ! ✅', color: '#FFFFFF', weight: 'bold', size: 'lg' },
          { type: 'text', text: 'Bound Successfully', color: '#E6DCF0', size: 'sm' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: bodyContents
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: footerButtons
      }
    }
  };
}

// 新人引导消息（绑定后跟卡片一起下发）
function onboardingGuide(role) {
  if (role === 'influencer') {
    return {
      type: 'text',
      text: '📌 Quick Guide:\n\n1. Browse "Products" for sample requests\n2. Check "Events" for campaigns\n3. Reply "Policy" for commission details\n4. Reply "Contact" to reach your BD\n\nGet started now! 🚀'
    };
  }
  return {
    type: 'text',
    text: '📌 Quick Guide:\n\n1. Reply "Policy" for partnership terms\n2. Check Samples for influencer requests\n3. Reply "Contact" to reach your BD\n\nWelcome aboard! 🚀'
  };
}

// 邀请卡片文本（给 BD 复制发送用）
function inviteCardText({ code, role, name, bdName }) {
  const roleLabel = role === 'influencer' ? 'Creator' : 'Seller';
  const addFriendLink = `https://line.me/R/ti/p/${config.oaId || '@380xfxno'}`;
  return [
    `📲 Join LazyFirst on LINE!`,
    ``,
    `Hi ${name || roleLabel},`,
    `Add our LINE OA and send your binding code to get started:`,
    ``,
    `👉 ${addFriendLink}`,
    ``,
    `Your binding code: ${code}`,
    `Just copy and paste it in LINE chat!`,
    ``,
    bdName ? `- ${bdName}` : ''
  ].filter(Boolean).join('\n');
}

// ========== 申样通知卡片 ==========

// 达人端：申样提交确认（push 通知）
// { productName, influencerName, productUrl }
function sampleConfirmedCard({ productName, influencerName, productUrl }) {
  return {
    type: 'flex',
    altText: `Sample Request Confirmed: ${productName || 'Product'}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#775999',
        contents: [
          { type: 'text', text: 'Sample Requested! 📦', color: '#FFFFFF', weight: 'bold', size: 'lg' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          { type: 'text', text: `Creator: ${influencerName || '-'}`, size: 'sm', wrap: true },
          { type: 'text', text: `Product: ${productName || '-'}`, size: 'sm', wrap: true, weight: 'bold' },
          { type: 'text', text: 'Status: Pending', size: 'sm', color: '#FF9800' },
          { type: 'text', text: 'We will notify you once the sample is arranged.', size: 'xs', color: '#999999', wrap: true }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'button', style: 'primary', color: '#775999', action: { type: 'uri', label: '📦 View Product', uri: productUrl || `${baseUrl()}/products/public` } }
        ]
      }
    }
  };
}

// 卖家端：申样审批通知（push 通知）
// { productName, influencerName, sampleId }
function sampleApprovalCard({ productName, influencerName, sampleId }) {
  return {
    type: 'flex',
    altText: `New Sample Request: ${influencerName || 'Creator'} → ${productName || 'Product'}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#E65100',
        contents: [
          { type: 'text', text: '🔔 New Sample Request', color: '#FFFFFF', weight: 'bold', size: 'md' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          { type: 'text', text: `Creator: ${influencerName || '-'}`, size: 'sm', wrap: true, weight: 'bold' },
          { type: 'text', text: `Product: ${productName || '-'}`, size: 'sm', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: 'Please review and process this request.', size: 'xs', color: '#999999', wrap: true }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          { type: 'button', style: 'primary', color: '#775999', action: { type: 'uri', label: '📋 Review Samples', uri: `${baseUrl()}/samples-public` } }
        ]
      }
    }
  };
}

// ========== 活动推送卡片 ==========

// 活动/招募通知（push 给匹配达人）
// { name, description, requirementText, productsText, recruitmentId }
function campaignCard({ name, description, requirementText, productsText, recruitmentId }) {
  const bodyContents = [
    { type: 'text', text: name || 'New Campaign', weight: 'bold', size: 'lg', wrap: true }
  ];
  if (description) {
    bodyContents.push({ type: 'text', text: description || '', size: 'sm', wrap: true, color: '#666666' });
  }
  if (requirementText) {
    bodyContents.push({ type: 'separator', margin: 'md' });
    bodyContents.push({ type: 'text', text: `📊 ${requirementText}`, size: 'xs', wrap: true, color: '#888888' });
  }
  if (productsText) {
    bodyContents.push({ type: 'text', text: `🛍 ${productsText}`, size: 'xs', wrap: true, color: '#888888' });
  }
  return {
    type: 'flex',
    altText: `New Campaign: ${name || ''}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#775999',
        contents: [
          { type: 'text', text: 'New Campaign! 🎉', color: '#FFFFFF', weight: 'bold', size: 'lg' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: bodyContents
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'button', style: 'primary', color: '#775999', action: { type: 'uri', label: '📋 View Campaign', uri: `${baseUrl()}/recruitments/public?recruitmentId=${recruitmentId || ''}` } }
        ]
      }
    }
  };
}

// 新品推荐卡片（push 给匹配达人）
// { name, price, currency, commissionRate, imageUrl, productUrl }
function newProductCard({ name, price, currency, commissionRate, imageUrl, productUrl }) {
  const cur = currency || 'THB';
  const priceText = price ? `${cur} ${Number(price).toLocaleString()}` : 'TBD';
  const commissionText = commissionRate ? `Commission: ${commissionRate}%` : null;
  const bodyContents = [
    { type: 'text', text: name || 'New Product', weight: 'bold', size: 'md', wrap: true },
    { type: 'text', text: priceText, size: 'sm', color: '#775999', weight: 'bold' }
  ];
  if (commissionText) {
    bodyContents.push({ type: 'text', text: commissionText, size: 'xs', color: '#4CAF50' });
  }
  return {
    type: 'flex',
    altText: `New Product: ${name || ''}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      hero: imageUrl ? { type: 'image', url: imageUrl, size: 'full', aspectRatio: '20:13', aspectMode: 'cover' } : undefined,
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#775999',
        contents: [
          { type: 'text', text: '🆕 New Product', color: '#FFFFFF', weight: 'bold', size: 'sm' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: bodyContents
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'button', style: 'primary', color: '#775999', action: { type: 'uri', label: '📦 View Product', uri: productUrl || `${baseUrl()}/products/public` } }
        ]
      }
    }
  };
}

// ========== 批量推送辅助：分批 multicast（单次上限 500） ==========
async function multicastInBatches(pushMessageFn, userIds, messages, batchSize = 400) {
  const batches = [];
  for (let i = 0; i < userIds.length; i += batchSize) {
    batches.push(userIds.slice(i, i + batchSize));
  }
  let sent = 0;
  let failed = 0;
  for (const batch of batches) {
    try {
      await pushMessageFn(batch, messages);
      sent += batch.length;
    } catch (e) {
      console.error('[LINE multicast] batch failed:', e.message);
      failed += batch.length;
    }
  }
  return { sent, failed };
}

module.exports = {
  welcomeMessage,
  genericHelpMessage,
  policyFlexCard,
  productFlexCard,
  buildSupplyRichMenu,
  buildInfluencerRichMenu,
  boundSuccessCard,
  onboardingGuide,
  inviteCardText,
  sampleConfirmedCard,
  sampleApprovalCard,
  campaignCard,
  newProductCard,
  multicastInBatches
};
