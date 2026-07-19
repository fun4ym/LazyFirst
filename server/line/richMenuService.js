// Rich Menu 生成&部署服务
// - 用 jimp v1 生成两套菜单图片（2500×843）
// - 部署到 LINE 并支持按角色绑定
const { Jimp } = require('jimp');
const lineClient = require('./client');
const flex = require('./flex');

const MENU_WIDTH = 2500;
const MENU_HEIGHT = 843;
const SECTION_WIDTHS = [833, 834, 833]; // 左中右

// 颜色方案
const COLORS = {
  supply: [
    { bg: '#6C5CE7', text: '#FFFFFF' }, // 政策
    { bg: '#A855F7', text: '#FFFFFF' }, // 报名
    { bg: '#D946EF', text: '#FFFFFF' }, // 客服
  ],
  influencer: [
    { bg: '#EC4899', text: '#FFFFFF' }, // 活动
    { bg: '#F97316', text: '#FFFFFF' }, // 产品
    { bg: '#06B6D4', text: '#FFFFFF' }, // 客服
  ],
};

// 生成菜单图片
async function generateImage(sections, menuType) {
  const image = new Jimp({ width: MENU_WIDTH, height: MENU_HEIGHT, color: '#00000000' });

  let x = 0;
  for (let i = 0; i < 3; i++) {
    const w = SECTION_WIDTHS[i];
    const c = COLORS[menuType][i];
    const section = sections[i];

    // 背景色
    for (let dx = x; dx < x + w; dx++) {
      for (let dy = 0; dy < MENU_HEIGHT; dy++) {
        image.setPixelColor(Jimp.cssColorToHex(c.bg), dx, dy);
      }
    }

    // 主标签（泰文）
    const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
    image.print({ font, x: x + Math.floor((w - Jimp.measureText(font, section.label)) / 2), y: Math.floor(MENU_HEIGHT * 0.33), text: section.label });

    // 副标签（英文）
    const fontSub = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
    image.print({ font: fontSub, x: x + Math.floor((w - Jimp.measureText(fontSub, section.sub)) / 2), y: Math.floor(MENU_HEIGHT * 0.55), text: section.sub });

    x += w;
  }

  // 分区竖线
  let splitX = 0;
  for (let i = 0; i < 2; i++) {
    splitX += SECTION_WIDTHS[i];
    for (let dy = 0; dy < MENU_HEIGHT; dy++) {
      image.setPixelColor(0xFFFFFFFF, splitX, dy);
    }
  }

  return image.getBuffer('image/jpeg');
}

// 卖家版图片
function generateSupplyImage() {
  return generateImage([
    { label: 'นโยบาย', sub: 'Policy' },
    { label: 'สมัครร่วม', sub: 'Register' },
    { label: 'ติดต่อ', sub: 'Contact' },
  ], 'supply');
}

// 达人版图片
function generateInfluencerImage() {
  return generateImage([
    { label: 'กิจกรรม', sub: 'Events' },
    { label: 'สินค้า', sub: 'Products' },
    { label: 'ติดต่อ', sub: 'Contact' },
  ], 'influencer');
}

// 创建菜单对象 + 上传图片
async function deployRichMenu(builder, imageFn) {
  const menuDef = builder();
  const { richMenuId } = await lineClient.createRichMenu(menuDef);
  console.log(`[RichMenu] 创建菜单: ${richMenuId} (${menuDef.name})`);

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
