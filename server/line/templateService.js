// LINE OA 级模板服务（欢迎语 / 政策 / 客服自动回复）
// 复用 Company.settings.lineTemplates 存储（零新表），提供默认值兜底与占位符替换。
const Company = require('../models/Company');
const config = require('../config/line');

// 双语默认文案（泰文主 + 英文兜底），支持 {昵称} 占位符
const DEFAULT_TEMPLATES = {
  autoReplyEnabled: true,
  welcome: {
    th: 'ยินดีต้อนรับสู่ LazyFirst! ส่งรหัสผูกบัญชีของคุณเพื่อรับการแจ้งเตือนสินค้าตามความสนใจ',
    en: 'Welcome to LazyFirst! Send your binding code to receive matched product updates.'
  },
  policy: {
    th: '• ค่าคอมมิชชั่นสูงถึง 20%\n• รับสินค้าตัวอย่างฟรี',
    en: '• Up to 20% commission\n• Free samples'
  },
  contactReply: {
    th: 'ทีมงาน LazyFirst จะติดต่อกลับโดยเร็วที่สุด ขอบคุณค่ะ',
    en: 'Our LazyFirst team will contact you shortly. Thank you!'
  }
};

// 合并存储值与默认值，保证字段完整
function withDefaults(saved) {
  const s = saved || {};
  return {
    autoReplyEnabled: typeof s.autoReplyEnabled === 'boolean' ? s.autoReplyEnabled : DEFAULT_TEMPLATES.autoReplyEnabled,
    welcome: {
      th: (s.welcome && s.welcome.th) || DEFAULT_TEMPLATES.welcome.th,
      en: (s.welcome && s.welcome.en) || DEFAULT_TEMPLATES.welcome.en
    },
    policy: {
      th: (s.policy && s.policy.th) || DEFAULT_TEMPLATES.policy.th,
      en: (s.policy && s.policy.en) || DEFAULT_TEMPLATES.policy.en
    },
    contactReply: {
      th: (s.contactReply && s.contactReply.th) || DEFAULT_TEMPLATES.contactReply.th,
      en: (s.contactReply && s.contactReply.en) || DEFAULT_TEMPLATES.contactReply.en
    }
  };
}

// 占位符替换（当前支持 {昵称}）
function render(text, vars = {}) {
  if (!text) return '';
  return String(text).replace(/\{昵称\}/g, vars.nickname || '');
}

// 读取指定公司的 LINE 模板（含默认值）
async function getTemplates(companyId) {
  if (!companyId) return withDefaults(null);
  try {
    const company = await Company.findById(companyId).select('settings.lineTemplates').lean();
    return withDefaults(company && company.settings && company.settings.lineTemplates);
  } catch (e) {
    console.error('[LINE] 读取模板失败:', e.message);
    return withDefaults(null);
  }
}

// 保存指定公司的 LINE 模板
async function saveTemplates(companyId, templates) {
  const merged = withDefaults(templates);
  await Company.findByIdAndUpdate(companyId, {
    'settings.lineTemplates': merged
  });
  return merged;
}

// Webhook 无鉴权上下文：解析归属公司（优先 env 指定，回退首个公司）
async function resolveCompanyId() {
  if (config.defaultCompanyId) return config.defaultCompanyId;
  try {
    const company = await Company.findOne().select('_id').lean();
    return company ? company._id : null;
  } catch (e) {
    console.error('[LINE] 解析默认公司失败:', e.message);
    return null;
  }
}

module.exports = {
  DEFAULT_TEMPLATES,
  withDefaults,
  render,
  getTemplates,
  saveTemplates,
  resolveCompanyId
};
