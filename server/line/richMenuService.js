// Rich Menu 生成&部署服务
// - 用 jimp 生成两套菜单图片（2500×843）
// - 部署到 LINE 并支持按角色绑定
const Jimp = require('jimp');
const lineClient = require('./client');
const flex = require('./flex');

const MENU_WIDTH = 2500;
const MENU_HEIGHT = 843;
const SECTION_COUNT = 3;
const SECTION_WIDTH = Math.floor(MENU_WIDTH / SECTION_COUNT); // 833, 833, 834

// 颜色方案
const COLORS = {
  supply: {
    left:   { bg: 0x6C5CE7FF, text: '#FFFFFF' }, // 政策
    middle: { bg: 0xA855F7FF, text: '#FFFFFF' }, // 报名
    right:  { bg: 0xD946EFFF, text: '#FFFFFF' }, // 客服
  },
  influencer: {
    left:   { bg: 0xEC4899FF, text: '#FFFFFF' }, // 活动
    middle: { bg: 0xF97316FF, text: '#FFFFFF' }, // 产品
    right:  { bg: 0x06B6D4FF, text: '#FFFFFF' }, // 客服
  },
};

// 为每个分区绘制：背景色 + 文字标签
async function drawSection(image, x, w, h, color, label, subLabel) {
  // 背景色
  for (let dx = x; dx < x + w && dx < image.bitmap.width; dx++) {
    for (let dy = 0; dy < h; dy++) {
      image.setPixelColor(color.bg, dx, dy);
    }
  }
  // 主标签（泰文）
  const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
  const tw = Jimp.measureText(font, label);
  image.print(font, x + Math.floor((w - tw) / 2), Math.floor(h * 0.35), label);

  // 副标签（英文）
  if (subLabel) {
    const fontSub = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
    const sw = Jimp.measureText(fontSub, subLabel);
    image.print(fontSub, x + Math.floor((w - sw) / 2), Math.floor(h * 0.55), subLabel);
  }
}

// 生成卖家版 Rich Menu 图片
async function generateSupplyImage() {
  const image = new Jimp(MENU_WIDTH, MENU_HEIGHT);
  await drawSection(image, 0,        SECTION_WIDTH, MENU_HEIGHT, COLORS.supply.left,   'นโยบาย', 'Policy');
  await drawSection(image, 833,      SECTION_WIDTH, MENU_HEIGHT, COLORS.supply.middle, 'สมัครร่วม', 'Register');
  await drawSection(image, 1667,     SECTION_WIDTH, MENU_HEIGHT, COLORS.supply.right,  'ติดต่อ', 'Contact');

  // 分区竖线
  for (let y = 0; y < MENU_HEIGHT; y++) {
    image.setPixelColor(0xFFFFFFFF, 833, y);
    image.setPixelColor(0xFFFFFFFF, 1666, y);
  }

  return image.getBufferAsync(Jimp.MIME_JPEG);
}

// 生成达人版 Rich Menu 图片
async function generateInfluencerImage() {
  const image = new Jimp(MENU_WIDTH, MENU_HEIGHT);
  await drawSection(image, 0,        SECTION_WIDTH, MENU_HEIGHT, COLORS.influencer.left,   'กิจกรรม', 'Events');
  await drawSection(image, 833,      SECTION_WIDTH, MENU_HEIGHT, COLORS.influencer.middle, 'สินค้า', 'Products');
  await drawSection(image, 1667,     SECTION_WIDTH, MENU_HEIGHT, COLORS.influencer.right,  'ติดต่อ', 'Contact');

  for (let y = 0; y < MENU_HEIGHT; y++) {
    image.setPixelColor(0xFFFFFFFF, 833, y);
    image.setPixelColor(0xFFFFFFFF, 1666, y);
  }

  return image.getBufferAsync(Jimp.MIME_JPEG);
}

// 创建并上传一套 Rich Menu
async function deployRichMenu(builder, imageFn) {
  // ① 创建菜单对象
  const menuDef = builder();
  const { richMenuId } = await lineClient.createRichMenu(menuDef);
  console.log(`[RichMenu] 创建菜单: ${richMenuId} (${menuDef.name})`);

  // ② 上传图片
  const imgBuffer = await imageFn();
  await lineClient.setRichMenuImage(richMenuId, imgBuffer, 'image/jpeg');
  console.log(`[RichMenu] 上传图片: ${richMenuId}`);

  return richMenuId;
}

// 清理已有菜单 & 部署两套
async function setup() {
  // 先清理历史菜单
  try {
    const existing = await lineClient.getRichMenuList();
    const list = existing.richmenus || [];
    for (const m of list) {
      await lineClient.deleteRichMenu(m.richMenuId);
      console.log(`[RichMenu] 已清理: ${m.richMenuId}`);
    }
  } catch (e) {
    console.warn('[RichMenu] 清理旧菜单失败（忽略）:', e.message);
  }

  // 部署卖家菜单（含图片）
  const supplyMenuId = await deployRichMenu(flex.buildSupplyRichMenu, generateSupplyImage);

  // 部署达人菜单（含图片）
  const influencerMenuId = await deployRichMenu(flex.buildInfluencerRichMenu, generateInfluencerImage);

  // 卖家菜单设为默认（兜底）。免费号可能不支持，失败就跳过
  try {
    await lineClient.setDefaultRichMenu(supplyMenuId);
    console.log(`[RichMenu] 卖家菜单设为默认: ${supplyMenuId}`);
  } catch (e) {
    console.warn(`[RichMenu] 设默认菜单失败（免费号限制，跳过）: ${e.message}`);
  }

  console.log(`[RichMenu] 部署完成: 卖家=${supplyMenuId} 达人=${influencerMenuId}`);
  return { supplyMenuId, influencerMenuId };
}

// 给用户挂对应菜单
async function attachRoleMenu(userId, role) {
  try {
    const existing = await lineClient.getRichMenuList();
    const menus = existing.richmenus || [];
    const targetName = role === 'influencer' ? 'influencerRichMenu' : 'supplyRichMenu';
    const target = menus.find(m => m.name === targetName);

    if (!target) {
      console.log(`[RichMenu] 未找到菜单 "${targetName}"，请先运行 setup`);
      return false;
    }

    await lineClient.linkRichMenuToUser(userId, target.richMenuId);
    console.log(`[RichMenu] ${role} 用户 ${userId} 已挂菜单: ${target.richMenuId}`);
    return true;
  } catch (e) {
    console.error(`[RichMenu] 挂载菜单失败 (${role}):`, e.message);
    return false;
  }
}

module.exports = {
  setup,
  attachRoleMenu,
  generateSupplyImage,
  generateInfluencerImage,
};
