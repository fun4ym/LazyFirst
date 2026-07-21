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
    th: '📜 นโยบายความร่วมมือ LazyFirst\n\n• ค่าคอมมิชชั่นสูงถึง 20% ตามยอดขาย\n• รับสินค้าตัวอย่างฟรีสำหรับ Creator ที่ผ่านการคัดเลือก\n• แจ้งเตือนแบบเรียลไทม์เมื่อมีคำขอตัวอย่าง\n• จัดส่งตัวอย่างรวดเร็ว ติดตามสถานะได้\n• ทีม BD ดูแลให้คำปรึกษาแบบ 1:1',
    en: '📜 LazyFirst Partnership Policy\n\n• Up to 20% commission based on sales\n• Free product samples for qualified Creators\n• Real-time notifications on sample requests\n• Fast sample delivery with tracking\n• Dedicated 1:1 BD support'
  },
  contactReply: {
    th: '📞 ทีมงาน LazyFirst พร้อมให้บริการ\n\nส่งข้อความทิ้งไว้ เราจะติดต่อกลับภายใน 24 ชั่วโมง\nขอบคุณที่ใช้บริการ LazyFirst ค่ะ 🙏',
    en: '📞 LazyFirst Support Team\n\nLeave us a message and we\'ll get back to you within 24 hours.\nThank you for choosing LazyFirst! 🙏'
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

// 读取指定公司的 LINE 模板（含默认值 + 采购部联系方式）
async function getTemplates(companyId) {
  if (!companyId) return { ...withDefaults(null), procurementContact: { name: '', phone: '', line: '', email: '' } };
  try {
    const company = await Company.findById(companyId).select('contact phone settings.lineTemplates settings.procurementContact').lean();
    const templates = withDefaults(company && company.settings && company.settings.lineTemplates);
    const pc = company && company.settings && company.settings.procurementContact;
    templates.procurementContact = {
      name: (pc && pc.name) || '',
      phone: (pc && pc.phone) || (company && company.phone) || '',
      line: (pc && pc.line) || '',
      email: (pc && pc.email) || (company && company.contact) || ''
    };
    return templates;
  } catch (e) {
    console.error('[LINE] 读取模板失败:', e.message);
    return { ...withDefaults(null), procurementContact: { name: '', phone: '', line: '', email: '' } };
  }
}

// 保存指定公司的 LINE 模板（含采购部联系方式）
async function saveTemplates(companyId, templates) {
  const merged = withDefaults(templates);
  const update = { 'settings.lineTemplates': merged };
  // 同步保存采购部联系方式
  if (templates.procurementContact && typeof templates.procurementContact === 'object') {
    update['settings.procurementContact'] = {
      name: templates.procurementContact.name || '',
      phone: templates.procurementContact.phone || '',
      line: templates.procurementContact.line || '',
      email: templates.procurementContact.email || ''
    };
  }
  await Company.findByIdAndUpdate(companyId, { $set: update });
  // 读回最新（含兜底值）
  return await getTemplates(companyId);
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

// 读取采购部联系方式（欢迎语卖家分支展示）。优先用 settings.procurementContact，
// 字段缺失时回退顶层 contact / phone，保证无配置也不空白。
async function getProcurementContact(companyId) {
  if (!companyId) return { name: '', phone: '', line: '', email: '' };
  try {
    const company = await Company.findById(companyId)
      .select('contact phone settings.procurementContact').lean();
    const pc = (company && company.settings && company.settings.procurementContact) || {};
    return {
      name: pc.name || '',
      phone: pc.phone || (company && company.phone) || '',
      line: pc.line || '',
      email: pc.email || (company && company.contact) || ''
    };
  } catch (e) {
    console.error('[LINE] 读取采购部联系方式失败:', e.message);
    return { name: '', phone: '', line: '', email: '' };
  }
}

module.exports = {
  DEFAULT_TEMPLATES,
  withDefaults,
  render,
  getTemplates,
  saveTemplates,
  resolveCompanyId,
  getProcurementContact
};
