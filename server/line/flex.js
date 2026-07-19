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

module.exports = {
  welcomeMessage,
  genericHelpMessage,
  policyFlexCard,
  productFlexCard,
  buildSupplyRichMenu,
  buildInfluencerRichMenu
};
