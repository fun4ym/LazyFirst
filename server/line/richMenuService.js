// Rich Menu 生成&部署服务
// - 用 jimp 生成两套菜单图片（2500×843）
// - 部署到 LINE 并支持按角色绑定
const Jimp = require('jimp');
const lineClient = require('./client');
const flex = require('./flex');

const MENU_WIDTH = 2500;
const MENU_HEIGHT = 843;

// 颜色方案（0xAARRGGBB）
const hex = (s) => (parseInt(s.replace('#', ''), 16) << 8) | 0xFF;
const COLORS = {
  supply: [
    { bg: hex('#6C5CE7'), text: '#FFFFFF' },
    { bg: hex('#A855F7'), text: '#FFFFFF' },
    { bg: hex('#D946EF'), text: '#FFFFFF' },
  ],
  influencer: [
    { bg: hex('#EC4899'), text: '#FFFFFF' },
    { bg: hex('#F97316'), text: '#FFFFFF' },
    { bg: hex('#06B6D4'), text: '#FFFFFF' },
  ],
};

// 为每个分区绘制背景色 + 文字
async function drawSection(image, x, w, h, color, label, subLabel) {
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
  await drawSection(image, 0,    833, MENU_HEIGHT, COLORS.supply[0], 'นโยบาย', 'Policy');
  await drawSection(image, 833,  834, MENU_HEIGHT, COLORS.supply[1], 'สมัครร่วม', 'Register');
  await drawSection(image, 1667, 833, MENU_HEIGHT, COLORS.supply[2], 'ติดต่อ', 'Contact');
  // 分区竖线
  for (let y = 0; y < MENU_HEIGHT; y++) { image.setPixelColor(0xFFFFFFFF, 833, y); image.setPixelColor(0xFFFFFFFF, 1666, y); }
  return image.getBufferAsync(Jimp.MIME_JPEG);
}

// 生成达人版 Rich Menu 图片
async function generateInfluencerImage() {
  const image = new Jimp(MENU_WIDTH, MENU_HEIGHT);
  await drawSection(image, 0,    833, MENU_HEIGHT, COLORS.influencer[0], 'กิจกรรม', 'Events');
  await drawSection(image, 833,  834, MENU_HEIGHT, COLORS.influencer[1], 'สินค้า', 'Products');
  await drawSection(image, 1667, 833, MENU_HEIGHT, COLORS.influencer[2], 'ติดต่อ', 'Contact');
  for (let y = 0; y < MENU_HEIGHT; y++) { image.setPixelColor(0xFFFFFFFF, 833, y); image.setPixelColor(0xFFFFFFFF, 1666, y); }
  return image.getBufferAsync(Jimp.MIME_JPEG);
}

// 创建并上传一套 Rich Menu
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

  const supplyMenuId = await deployRichMenu(flex.buildSupplyRichMenu, generateSupplyImage);
  const influencerMenuId = await deployRichMenu(flex.buildInfluencerRichMenu, generateInfluencerImage);

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

module.exports = { setup, attachRoleMenu, generateSupplyImage, generateInfluencerImage };
