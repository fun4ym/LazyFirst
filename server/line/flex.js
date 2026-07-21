// Flex Message / Rich Menu 构造器
// 复用现有紫色主调(#775999)与卡片式设计语言，文案默认泰文+英文兜底（可配置）。
const config = require('../config/line');

function baseUrl() {
  // 兜底为空时用占位 URL，避免 Rich Menu 创建失败（LINE 要求 uri 必须 https://）
  return config.webhookBaseUrl || process.env.FRONTEND_URL || 'https://lazyfirst.example.com';
}

// 卡片信息行（标签 + 值），带分隔线观感
function infoRow(label, value, valueColor) {
  return {
    type: 'box',
    layout: 'horizontal',
    spacing: 'md',
    contents: [
      { type: 'text', text: label, size: 'sm', color: '#9E9E9E', flex: 2, weight: 'bold' },
      { type: 'text', text: String(value == null || value === '' ? '-' : value), size: 'sm', color: valueColor || '#1F1F1F', flex: 5, wrap: true, weight: 'bold', align: 'end' }
    ]
  };
}

// 加好友欢迎语（follow 事件回复）
// 中性、不具象对方是达人还是卖家：先介绍公司，再分两条路径引导。
// opts: { welcome?: {th,en}, procurementContact?: {name,phone,line,email}, baseUrl?: string }
function welcomeMessage(opts = {}) {
  const welcome = opts.welcome || {};
  const thText = welcome.th || 'ยินดีต้อนรับสู่ LazyFirst! เราคือแพลตฟอร์มที่เชื่อมต่อ TikTok Creator กับร้านค้า';
  const enText = welcome.en || 'Welcome to LazyFirst! We are a platform connecting TikTok Creators with Sellers.';

  const pc = opts.procurementContact || {};
  // 采购部联系方式行（有则展示）
  const procurementRows = [];
  if (pc.name) procurementRows.push(infoRow('采购部 / Procurement', pc.name));
  if (pc.phone) procurementRows.push(infoRow('โทร / Tel', pc.phone));
  if (pc.line) procurementRows.push(infoRow('LINE', pc.line));
  if (pc.email) procurementRows.push(infoRow('อีเมล / Email', pc.email));

  const creatorPath = {
    type: 'box',
    layout: 'vertical',
    spacing: 'sm',
    margin: 'md',
    backgroundColor: '#F3EEF8',
    cornerRadius: 'md',
    paddingAll: 'md',
    contents: [
      { type: 'text', text: '🎬 หากคุณเป็น Creator / TikTok 达人', weight: 'bold', size: 'sm', color: '#775999', wrap: true },
      { type: 'text', text: '• ติดต่อ BD ที่ดูแลคุณเพื่อขอ "รหัสผูกบัญชี"\n• Contact your account BD to get your binding code', size: 'xs', color: '#1F1F1F', wrap: true },
      { type: 'text', text: '• ผูกบัญชีแล้วรับ: ดูสินค้า / ของตัวอย่างฟรี / อัปเดตแคมเปญและค่าคอมมิชชั่น\n• After binding: browse products, free samples, campaign & commission updates', size: 'xs', color: '#555555', wrap: true }
    ]
  };

  const sellerPath = {
    type: 'box',
    layout: 'vertical',
    spacing: 'sm',
    margin: 'md',
    backgroundColor: '#FDF1E6',
    cornerRadius: 'md',
    paddingAll: 'md',
    contents: [
      { type: 'text', text: '🛍 หากคุณเป็น Seller / 商家', weight: 'bold', size: 'sm', color: '#EF6C00', wrap: true },
      { type: 'text', text: '• ติดต่อฝ่ายจัดซื้อของเราเพื่อรับ "รหัสผูกบัญชี"\n• Contact our Procurement team to get your binding code', size: 'xs', color: '#1F1F1F', wrap: true },
      { type: 'text', text: '• ผูกบัญชีแล้วรับ: แจ้งเตือนเมื่อ Creator ขอของตัวอย่าง + ลิงก์รายการ申样บน PC\n• After binding: real-time alerts when Creators request your samples + PC sample list link', size: 'xs', color: '#555555', wrap: true }
    ].concat(procurementRows.length ? [
      { type: 'separator', margin: 'sm' },
      ...procurementRows
    ] : [])
  };

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
          { type: 'text', text: 'LazyFirst', color: '#FFFFFF', weight: 'bold', size: 'xl' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          { type: 'text', text: thText, weight: 'bold', size: 'md', wrap: true },
          { type: 'text', text: enText, size: 'sm', color: '#666666', wrap: true },
          creatorPath,
          sellerPath,
          {
            type: 'text',
            text: '📩 เมื่อได้รับรหัสแล้ว ให้ส่งรหัสมาที่แชทนี้เพื่อผูกบัญชี\n📩 Once you have your code, send it here to bind your account.',
            margin: 'md',
            size: 'xs',
            color: '#775999',
            weight: 'bold',
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
    altText: '公司介绍 / เกี่ยวกับเรา / About LazyFirst',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#775999',
        contents: [
          { type: 'text', text: '公司介绍 / เกี่ยวกับเรา', color: '#FFFFFF', weight: 'bold', size: 'lg' },
          { type: 'text', text: 'About LazyFirst', color: '#E6DCF0', size: 'sm' }
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

// 产品卡（活动推送用）：主图 + 标题 + 价格/佣金 + 去带货按钮
function productFlexCard(product) {
  const img = (product.images && product.images[0]) || (product.productImages && product.productImages[0]) || '';
  const price = product.price || product.priceRangeMin || 0;
  const priceText = `${product.currency || 'THB'} ${Number(price).toLocaleString()}`;
  const commission = product.commissionRate != null
    ? product.commissionRate
    : (product.activityConfigs && product.activityConfigs[0] && product.activityConfigs[0].promotionInfluencerRate);
  const jumpUrl = product.tiktokProductUrl
    || `${baseUrl()}/products/public?productId=${product._id || product.id}`;
  const body = [
    { type: 'text', text: product.name || 'Product', weight: 'bold', size: 'lg', wrap: true, color: '#1F1F1F' }
  ];
  if (price) body.push(infoRow('💰 价格', priceText, '#E53935'));
  if (commission != null) body.push(infoRow('🤝 佣金', `${commission}%`, '#2E7D32'));
  return {
    type: 'flex',
    altText: product.name || 'Product',
    contents: {
      type: 'bubble',
      size: 'kilo',
      hero: img
        ? { type: 'image', url: img, size: 'full', aspectRatio: '16:9', aspectMode: 'cover' }
        : undefined,
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#775999',
        paddingAll: 'md',
        contents: [
          { type: 'text', text: '🎯 活动商品推荐', color: '#FFFFFF', weight: 'bold', size: 'md' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: 'lg',
        contents: body
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#775999',
            height: 'sm',
            action: { type: 'uri', label: '🚀 立即推广赚佣金', uri: jumpUrl }
          }
        ]
      }
    }
  };
}

// 卖家专属 Rich Menu（F1-1）：申样记录 / 合作政策 / 联系采购
function buildSupplyRichMenu() {
  const u = baseUrl();
  return {
    size: { width: 2500, height: 843 },
    selected: true,
    name: 'supplyRichMenu',
    chatBarText: 'Seller Menu',
    areas: [
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: { type: 'message', label: 'Sample Records', text: 'samples' }
      },
      {
        bounds: { x: 833, y: 0, width: 834, height: 843 },
        action: { type: 'message', label: 'Policy', text: 'policy' }
      },
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: { type: 'message', label: 'Contact', text: 'contact' }
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
// 达人：{ name, role, bdName, bdContact }
// 卖家：{ name, role, shopName, contactName, shopCode, bdName, bdContact }
function boundSuccessCard({ name, role, shopName, contactName, shopCode, bdName, bdContact }) {
  const roleLabel = role === 'influencer'
    ? { th: 'Creator', en: 'Creator' }
    : { th: 'ผู้ขาย', en: 'Seller' };
  const bodyContents = [];
  if (role === 'influencer') {
    bodyContents.push({ type: 'text', text: `Creator: ${name || '-'}`, size: 'sm', wrap: true });
  } else {
    bodyContents.push({ type: 'text', text: `Store: ${shopName || name || '-'}`, size: 'sm', wrap: true, weight: 'bold' });
    bodyContents.push({ type: 'text', text: `Contact: ${contactName || '-'}`, size: 'sm', wrap: true, color: '#666666' });
    bodyContents.push({ type: 'separator', margin: 'sm' });
    bodyContents.push({ type: 'text', text: '🔔 达人申请您的商品样品时，LINE 会实时通知您', size: 'sm', wrap: true, color: '#EF6C00', weight: 'bold' });
    bodyContents.push({ type: 'text', text: 'You will get real-time LINE alerts when Creators request your samples', size: 'xs', wrap: true, color: '#999999' });
  }
  bodyContents.push({ type: 'text', text: `Role: ${roleLabel.en}`, size: 'sm', color: '#999999' });
  if (bdName) {
    bodyContents.push({ type: 'separator', margin: 'md' });
    bodyContents.push({ type: 'text', text: `BD: ${bdName}${bdContact ? ' | ' + bdContact : ''}`, size: 'sm', wrap: true, color: '#555555' });
  }
  const footerButtons = role === 'influencer'
    ? [
        { type: 'button', style: 'primary', color: '#775999', action: { type: 'uri', label: '📦 View Products', uri: `${baseUrl()}/products/public` } },
        { type: 'button', style: 'secondary', action: { type: 'uri', label: '📋 View Events', uri: `${baseUrl()}/recruitments/public` } }
      ]
    : [
        { type: 'button', style: 'primary', color: '#775999', action: { type: 'uri', label: '📋 申样记录 / Sample Records', uri: `${baseUrl()}/samples/public?s=${shopCode || ''}` } },
        { type: 'button', style: 'secondary', action: { type: 'message', label: '📜 合作政策 / Policy', text: 'policy' } }
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
    text: '📌 Quick Guide / คู่มือเริ่มต้น:\n\n1. 🔔 有达人申请您的商品样品时，LINE 会实时通知您\n   Real-time LINE alerts when Creators request your samples\n2. 💻 点击「申样记录 / Sample Records」查看 PC 端申样列表\n   Tap "Sample Records" to open your PC sample list\n3. 📜 回复 "Policy" 查看合作与佣金政策\n   Reply "Policy" for partnership & commission terms\n4. 💬 回复 "Contact" 联系您的 BD / 采购部\n   Reply "Contact" to reach your BD / Procurement\n\nWelcome aboard! 🚀'
  };
}

// 邀请卡片文本（给 BD 复制发送用）
function inviteCardText({ code, role, name, bdName }) {
  const roleLabel = role === 'influencer' ? 'Creator' : 'Seller';
  const addFriendLink = `https://line.me/R/ti/p/${config.oaId || '@380xfno'}`;
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

// 卖家端：申样记录通知（push 给已绑定 LINE 的店铺联系人）
// { productName, influencerName, sampleId, recordUrl, statusText }
// recordUrl: WAP 申样记录详情页链接（含修改寄养状态完整功能）
function sampleRecordCard({ productName, influencerName, sampleId, recordUrl, statusText }) {
  const body = [
    infoRow('👤 达人', influencerName, '#1F1F1F'),
    infoRow('🛍 商品', productName, '#1F1F1F')
  ];
  if (statusText) body.push(infoRow('📦 当前状态', statusText, '#EF6C00'));
  return {
    type: 'flex',
    altText: `新的申样记录：${influencerName || 'Creator'} → ${productName || 'Product'}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#EF6C00',
        paddingAll: 'md',
        contents: [
          { type: 'text', text: '📦 新的申样记录', color: '#FFFFFF', weight: 'bold', size: 'lg' },
          { type: 'text', text: '有达人申请了你的商品样品，点击查看并处理', color: '#FFE0CC', size: 'xs', margin: 'xs' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: 'lg',
        contents: body
      },
      footer: recordUrl ? {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#EF6C00',
            height: 'sm',
            action: { type: 'uri', label: '📋 查看并记录详情', uri: recordUrl }
          }
        ]
      } : undefined
    }
  };
}

// 卖家端：申样链接推送（生成/刷新申样页识别码时 push 给已绑定 LINE 的店铺联系人）
// { shopName, link }
function sampleLinkCard({ shopName, link }) {
  return {
    type: 'flex',
    altText: `申样链接已更新${shopName ? '：' + shopName : ''}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#775999',
        paddingAll: 'md',
        contents: [
          { type: 'text', text: '🔗 申样链接已更新', color: '#FFFFFF', weight: 'bold', size: 'lg' },
          { type: 'text', text: '以下是你的专属申样页面链接', color: '#E6DCF0', size: 'xs', margin: 'xs' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: 'lg',
        contents: [
          ...(shopName ? [infoRow('🏪 店铺', shopName, '#1F1F1F')] : []),
          {
            type: 'box',
            layout: 'vertical',
            margin: 'sm',
            paddingAll: '12px',
            cornerRadius: '8px',
            backgroundColor: '#F3EDFA',
            contents: [
              { type: 'text', text: link || '', size: 'sm', color: '#6A1B9A', wrap: true, weight: 'bold' }
            ]
          }
        ]
      },
      footer: link ? {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#775999',
            height: 'sm',
            action: { type: 'uri', label: '🔗 打开申样页面', uri: link }
          }
        ]
      } : undefined
    }
  };
}

// 综合费率展示块（招募推送用）
// rateInfo: { rate: number(%), diff: number(百分点，正=高于广场) }
function rateInfoBlock(rateInfo) {
  if (!rateInfo || rateInfo.rate == null) return null;
  const { rate, diff } = rateInfo;
  let diffText, diffColor;
  if (diff > 0) { diffText = `↑ 高于广场 ${diff}%`; diffColor = '#2E7D32'; }
  else if (diff < 0) { diffText = `↓ 低于广场 ${Math.abs(diff)}%`; diffColor = '#C62828'; }
  else { diffText = '与广场持平'; diffColor = '#757575'; }
  return {
    type: 'box',
    layout: 'vertical',
    margin: 'md',
    paddingAll: '12px',
    cornerRadius: '10px',
    backgroundColor: '#F3EDFA',
    borderColor: '#E1D4F2',
    borderWidth: '1px',
    contents: [
      {
        type: 'box',
        layout: 'baseline',
        spacing: 'sm',
        contents: [
          { type: 'text', text: '综合费率', size: 'sm', color: '#6A1B9A', weight: 'bold', flex: 1 },
          { type: 'text', text: `${rate}%`, size: 'xl', weight: 'bold', color: '#6A1B9A', align: 'end', flex: 0 }
        ]
      },
      {
        type: 'text',
        text: diffText,
        size: 'xs',
        color: diffColor,
        margin: 'xs',
        align: 'end',
        weight: 'bold'
      }
    ]
  };
}

// ========== 活动推送卡片 ==========

// 活动/招募通知（push 给匹配达人）
// { name, description, requirementText, productsText, recruitmentId, rateInfo }
function campaignCard({ name, description, requirementText, productsText, recruitmentId, rateInfo }) {
  const body = [
    { type: 'text', text: name || 'New Campaign', weight: 'bold', size: 'xl', wrap: true, color: '#1F1F1F' }
  ];
  if (description) {
    body.push({ type: 'text', text: description, size: 'sm', wrap: true, color: '#666666', margin: 'sm' });
  }
  if (requirementText) body.push(infoRow('📊 要求', requirementText, '#1F1F1F'));
  if (productsText) body.push(infoRow('🛍 商品', productsText, '#1F1F1F'));
  const rateBlock = rateInfoBlock(rateInfo);
  if (rateBlock) body.push(rateBlock);
  return {
    type: 'flex',
    altText: `New Campaign: ${name || ''}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#5E35B1',
        paddingAll: 'md',
        contents: [
          { type: 'text', text: '🎉 新活动来袭', color: '#FFFFFF', weight: 'bold', size: 'lg' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: 'lg',
        contents: body
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#5E35B1',
            height: 'sm',
            action: { type: 'uri', label: '📋 查看活动详情', uri: `${baseUrl()}/recruitments/public?recruitmentId=${recruitmentId || ''}` }
          }
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
  const body = [
    { type: 'text', text: name || 'New Product', weight: 'bold', size: 'lg', wrap: true, color: '#1F1F1F' },
    infoRow('💰 价格', priceText, '#E53935')
  ];
  if (commissionRate != null) body.push(infoRow('🤝 推广佣金', `${commissionRate}%`, '#2E7D32'));
  return {
    type: 'flex',
    altText: `单品推荐：${name || ''}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      hero: imageUrl ? { type: 'image', url: imageUrl, size: 'full', aspectRatio: '16:9', aspectMode: 'cover' } : undefined,
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#6A1B9A',
        paddingAll: 'md',
        contents: [
          { type: 'text', text: '📦 单品推荐 · FEATURED', color: '#FFFFFF', weight: 'bold', size: 'sm' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: 'lg',
        contents: body
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#6A1B9A',
            height: 'sm',
            action: { type: 'uri', label: '📦 查看商品详情', uri: productUrl || `${baseUrl()}/products/public` }
          }
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
  baseUrl,
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
  sampleRecordCard,
  sampleLinkCard,
  campaignCard,
  newProductCard,
  multicastInBatches
};
