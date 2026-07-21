// Rich Menu 生成&部署服务
// - 用 @napi-rs/canvas 生成两套菜单图片（2500×843），支持泰文渲染
// - 部署到 LINE 并支持按角色绑定
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const lineClient = require('./client');
const flex = require('./flex');

const MENU_WIDTH = 2500;
const MENU_HEIGHT = 843;

// 注册中文字体 + 泰文字体
const scFontPath = path.join(__dirname, '..', 'fonts', 'NotoSansSC-Regular.ttf');
const thaiFontPath = path.join(__dirname, '..', 'fonts', 'NotoSansThai-Regular.ttf');
GlobalFonts.registerFromPath(scFontPath, 'NotoSansSC');
GlobalFonts.registerFromPath(thaiFontPath, 'NotoSansThai');

// 颜色方案
const COLORS = {
  supply: ['#6C5CE7', '#A855F7', '#D946EF'],
  influencer: ['#EC4899', '#F97316', '#06B6D4'],
};

// 为每个分区绘制背景色 + 文字
function drawSection(ctx, x, w, h, bgColor, label, subLabel) {
  // 背景
  ctx.fillStyle = bgColor;
  ctx.fillRect(x, 0, w, h);

  // 主标签（中文使用 NotoSansSC，泰文/英文使用 NotoSansThai）
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 64px "NotoSansSC", "NotoSansThai", sans-serif';
  ctx.fillText(label, x + w / 2, h * 0.42);

  // 副标签（泰文）
  if (subLabel) {
    ctx.font = '32px "NotoSansThai", sans-serif';
    ctx.fillText(subLabel, x + w / 2, h * 0.58);
  }
}

// 生成分区竖线
function drawDividers(ctx) {
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(833, 0);
  ctx.lineTo(833, MENU_HEIGHT);
  ctx.moveTo(1666, 0);
  ctx.lineTo(1666, MENU_HEIGHT);
  ctx.stroke();
}

// 生成卖家版 Rich Menu 图片
async function generateSupplyImage() {
  const canvas = createCanvas(MENU_WIDTH, MENU_HEIGHT);
  const ctx = canvas.getContext('2d');

  drawSection(ctx, 0,    833, MENU_HEIGHT, COLORS.supply[0], '申样记录', 'บันทึกขอตัวอย่าง');
  drawSection(ctx, 833,  834, MENU_HEIGHT, COLORS.supply[1], '公司介绍', 'เกี่ยวกับเรา');
  drawSection(ctx, 1667, 833, MENU_HEIGHT, COLORS.supply[2], '联系方式', 'ติดต่อเรา');
  drawDividers(ctx);

  return canvas.toBuffer('image/jpeg', { quality: 0.92 });
}

// 生成达人版 Rich Menu 图片
async function generateInfluencerImage() {
  const canvas = createCanvas(MENU_WIDTH, MENU_HEIGHT);
  const ctx = canvas.getContext('2d');

  drawSection(ctx, 0,    833, MENU_HEIGHT, COLORS.influencer[0], 'กิจกรรม', 'Events');
  drawSection(ctx, 833,  834, MENU_HEIGHT, COLORS.influencer[1], 'สินค้า', 'Products');
  drawSection(ctx, 1667, 833, MENU_HEIGHT, COLORS.influencer[2], 'ติดต่อ', 'Contact');
  drawDividers(ctx);

  return canvas.toBuffer('image/jpeg', { quality: 0.92 });
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
