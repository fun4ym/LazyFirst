---
name: PublicProducts页面文案和样式升级
overview: 修改第一个卡片文案、新增独立slogan卡片、整体样式升级增加设计感和高级感
design:
  architecture:
    framework: vue
  styleKeywords:
    - Glassmorphism
    - Modern
    - Premium
  fontSystem:
    fontFamily: Noto Sans
    heading:
      size: 22px
      weight: 700
    subheading:
      size: 13px
      weight: 400
    body:
      size: 14px
      weight: 400
  colorSystem:
    primary:
      - "#775999"
      - "#5D3F7A"
    background:
      - "#F5F5F5"
      - "#FFFFFF"
    text:
      - "#000000"
      - "#333333"
      - "#909399"
    functional:
      - "#6DAD19"
      - "#5A9414"
todos:
  - id: update-hero-text
    content: 修改hero文案：LazyFirst Co., Ltd. + บริษัท TAP...
    status: completed
  - id: add-slogan-card
    content: 新增slogan卡片和整体样式升级
    status: completed
    dependencies:
      - update-hero-text
---

## 产品概述

PublicProducts.vue 达人商品展示页顶部区域文案调整和样式升级

## 核心功能

1. hero-section 文案修改："LazyFirst" → "LazyFirst Co., Ltd."，副标题 → "บริษัท TAP ในประเทศไทยที่ได้รับการรับรองจาก TikTok"
2. 新增独立 slogan 卡片：在 hero-section 和搜索区之间，单独展示"สินค้าคุณภาพ คอมมิชชันสูง สำหรับครีเอเตอร์"
3. 整体样式升级：增强设计感、高级感、吸引眼球（卡片阴影、渐变点缀、动画、精致搜索区等）

## 技术方案

### 修改文件

`/Users/mor/CodeBuddy/LazyFirst/frontend/src/views/products/PublicProducts.vue`（唯一修改文件）

### 具体改动

**1. 模板改动：**

- 第7行 `hero-brand`：`LazyFirst` → `LazyFirst Co., Ltd.`
- 第8行 `hero-sub`：`สินค้าคุณภาพ คอมมิชชันสูง สำหรับครีเอเตอร์` → `บริษัท TAP ในประเทศไทยที่ได้รับการรับรองจาก TikTok`
- 在 hero-section 和 search-section 之间新增 slogan 卡片，白底+紫色左边框+绿色点缀

**2. 样式升级：**

- hero-section：加深渐变层次，品牌名加 letter-spacing，副标题更精致
- slogan 卡片：白色背景，4px紫色左边框，绿色小装饰元素，微妙的入场动画
- 搜索区：搜索按钮加绿色 hover 态，输入框聚焦时紫色光晕
- 商品卡片：增加 hover 浮起效果（translateY + 阴影增强），佣金优势卡片绿色左边框更明显
- 整体：统一12px圆角，阴影层次更分明，间距更协调

## 设计风格

延续 #775999 紫色主色 + #6DAD19 绿色辅助色的配色体系，在现有基础上提升高级感和视觉冲击力。

## 页面布局（从上到下）

1. **Hero 区域**：紫色渐变背景，左侧公司名+副标题，右侧 Logo，底部预留 TikTok 登录按钮
2. **Slogan 卡片**（新增）：白底，左侧 4px 紫色边框，内容"สินค้าคุณภาพ คอมมิชชันสูง สำหรับครีเอเตอร์"，右下角绿色小装饰圆点，微妙 fadeIn 入场
3. **搜索筛选区**：白底，双行布局（下拉+输入框），更精致的交互反馈
4. **商品列表**：卡片式，hover 微浮起，佣金优势卡片有绿色竖条高亮
5. **底部**：紫色渐变 + 版权信息

## 关键设计细节

- hero 品牌名加大 letter-spacing 增强高级感
- slogan 卡片用 left-border + 渐入动画营造层次
- 商品卡片 hover 时 translateY(-2px) + 阴影加深
- 搜索按钮绿色 hover 态呼应辅助色