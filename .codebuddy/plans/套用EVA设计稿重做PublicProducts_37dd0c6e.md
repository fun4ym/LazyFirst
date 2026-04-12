---
name: 套用EVA设计稿重做PublicProducts
overview: 按照TikTok_Creator_UI_Prototype_EVA.html设计稿，重写PublicProducts.vue页面。核心变化：暗色主题、浮动玻璃Header、粒子动画背景、发光徽章、统计卡片、横向滚动筛选chips、商品卡片大图+佣金对比+CTA发光按钮。文案改泰文，Logo用项目logo，TikTok logo替换
design:
  architecture:
    framework: vue
    component: tdesign
  fontSystem:
    fontFamily: Inter
    heading:
      size: 28px
      weight: 800
    subheading:
      size: 16px
      weight: 500
    body:
      size: 14px
      weight: 400
  colorSystem:
    primary:
      - "#775999"
      - "#9579B2"
      - "#5A4573"
    background:
      - "#050505"
      - "#0A0A0A"
      - "#111111"
      - "#1E1E1E"
    text:
      - "#FFFFFF"
      - "#B0B0B0"
      - "#666666"
    functional:
      - "#6DAD19"
      - "#8BC736"
      - "#528612"
      - "#FF2D55"
todos:
  - id: add-stats-api
    content: 后端新增 /api/public/products/stats 统计接口
    status: completed
  - id: rewrite-public-products
    content: 完全重写 PublicProducts.vue（EVA-01暗色主题）
    status: completed
    dependencies:
      - add-stats-api
  - id: test-verify
    content: 本地验证页面效果和API
    status: completed
    dependencies:
      - rewrite-public-products
---

## 用户需求

套用EVA-01暗色主题设计稿，完全重做 `/products/public` 达人商品展示页面。

### 核心要求

- Logo替换成项目的 `/logo.png`
- TikTok logo用SVG icon，不用emoji
- 文字全部用泰文
- 用现有数据和API套用设计稿的暗色EVA-01风格模板

### 设计稿核心特征

- **暗色主题**：#050505/#0A0A0A/#111111 背景，非白底
- **浮动玻璃Header**：fixed定位，毛玻璃+紫色发光边框
- **Hero区域**：粒子动画、发光徽章、大标题渐变文字、搜索框发光聚焦、3个统计卡片
- **横向滚动筛选chips**：圆角胶囊，激活态渐变发光
- **商品卡片**：大图16:10+HOT/NEW角标+佣金差异角标+双列价格佣金对比+CTA发光按钮
- **背景特效**：紫色+绿色orb浮动、网格纹理、粒子上升
- **动画**：徽章脉冲、卡片hover渐变边框+上浮、图片hover缩放、CTA光扫效果

### 文案泰文对照

| 英文 | 泰文 |
| --- | --- |
| TAP Certified Partner | บริษัท TAP ในประเทศไทยที่ได้รับการรับรองจาก TikTok |
| Earn More with Your TikTok | รับคอมมิชชันสูงขึ้น กับ TikTok ของคุณ |
| Get higher commissions... | รับคอมมิชชันพิเศษผ่านลิงก์ของเรา สูงกว่าหน้าร้านถึง 25% |
| Search products or shops... | ค้นหาสินค้า / ร้านค้า... |
| Products | สินค้า |
| Max Commission | คอมมิชชันสูงสุด |
| Your Commission | คอมมิชชันคุณ |
| vs Shop | เทียบหน้าร้าน |
| Get TikTok Link | เข้า TikTok ขาย |
| Featured Products | สินค้าแนะนำ |
| All Products | ทั้งหมด |
| High Commission | คอมมิชชันสูง |
| New Arrivals | สินค้าใหม่ |


## 技术方案

### 修改文件

1. **`frontend/src/views/products/PublicProducts.vue`** — 完全重写，套用EVA-01暗色设计稿
2. **`server/routes/public-products.js`** — 新增 `GET /api/public/products/stats` 统计接口（商品总数、最高佣金率、最大佣金差）

### 后端新增接口

`GET /api/public/products/stats` 返回：

```
{
  "success": true,
  "data": {
    "totalProducts": 246,
    "maxCommissionRate": 25.0,
    "maxCommissionDiff": 15.0
  }
}
```

用聚合查询从 activityConfigs 中计算最高达人佣金率和最大佣金差（达人率-广场率）。

### 前端架构

完全重写 PublicProducts.vue，保留现有script逻辑（API调用、数据获取、筛选、分页），全新template+style：

**模板结构（从上到下）：**

1. 背景特效层（orb浮动 + 网格纹理 + 粒子）
2. 浮动玻璃Header（fixed，logo+品牌名+TikTok登录预留）
3. Hero区域（发光徽章+大标题+副标题+搜索框+统计卡片）
4. 横向滚动筛选chips（categories作为chips，shops用下拉）
5. 商品卡片列表（大图+角标+双列佣金对比+CTA按钮）
6. 加载更多
7. 底部版权

**样式要点：**

- CSS变量定义EVA配色体系
- 暗色背景 #050505
- 毛玻璃header: backdrop-filter: blur(24px) + 半透明背景
- 渐变文字: background-clip: text
- 卡片hover: 渐变边框(mask-composite) + translateY(-8px) + 发光阴影
- CTA按钮: 渐变背景 + 光扫效果(before伪元素)
- 粒子动画: @keyframes particleFloat
- Orb浮动: @keyframes orbFloat

### 数据映射

| 设计稿字段 | 现有数据 |
| --- | --- |
| product.shop | prod.shopId.shopName |
| product.name | prod.name |
| product.image | prod.images[0] |
| product.commission | getInfluencerRate(prod) * 100 |
| product.shopCommission | prod.squareCommissionRate * 100 |
| product.badge | getCommissionDiff > 10 ? 'hot' : null |
| commission-highlight | getCommissionDiff(prod) |
| product-cta link | getActivityLink(prod) |


### 注意事项

- 商品卡片用单列布局（移动端优先，max-width: 480px）
- el-select 保留用于店铺筛选（chips用于类目）
- 保留 ref 推广追踪逻辑
- 保留 loadMore 分页逻辑
- 文字全泰文

## 设计风格：EVA-01 暗色赛博朋克

套用设计稿的暗色主题，以 #775999（EVA Purple）和 #6DAD19（EVA Green）为核心配色，搭配 #050505 纯黑背景，打造科技感十足的达人带货平台。

### 页面布局（移动端，从上到下）

1. **浮动玻璃Header** - fixed顶部，半透明黑底+毛玻璃+紫色发光边框，左侧logo.png+品牌名渐变文字，右侧TikTok登录按钮（Phase 2隐藏）
2. **Hero区域** - 粒子动画+orb浮动背景，发光徽章脉冲"บริษัท TAP..."，大标题渐变文字"รับคอมมิชชันสูงขึ้น"，副标题泰文描述，圆角搜索框（聚焦紫色发光），3个统计卡片（商品数/最高佣金/最大差值）
3. **横向滚动筛选** - 类目chips横向滚动，激活态渐变发光；店铺筛选下拉
4. **商品卡片** - 暗色卡片，16:10大图（hover缩放1.1x），HOT角标绿色渐变，佣金差异角标，店名紫色+圆点，商品名白色，双列网格（价格|佣金对比），CTA渐变发光按钮+光扫效果
5. **加载更多** - 圆角胶囊按钮
6. **底部** - 暗色+版权

### 关键动画

- 背景orb浮动 8s循环
- 粒子上升 6s循环
- 徽章脉冲 2s
- 卡片hover渐变边框+上浮8px+发光
- 图片hover缩放1.1x
- CTA按钮光扫效果
- 搜索框聚焦scale+发光