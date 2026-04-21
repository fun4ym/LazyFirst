---
name: recruitment-public-style-templates
overview: 为 /recruitments/public 公开招募页面设计3种风格模板（温暖风、甜美风、科技风），支持配色主题分离，模板与配色可自由组合。
design:
  styleKeywords:
    - 温暖风
    - 甜美风
    - 科技风
    - 玻璃拟态
    - 马卡龙
    - 粒子效果
  fontSystem:
    fontFamily: system-ui
    heading:
      size: 20px
      weight: 700
    subheading:
      size: 16px
      weight: 600
    body:
      size: 14px
      weight: 400
  colorSystem:
    primary:
      - "#775999"
      - "#FF6B35"
      - "#E91E63"
    background:
      - "#FFF8F0"
      - "#FFF0F5"
      - "#0D0D1A"
    text:
      - "#333333"
      - "#FFFFFF"
    functional:
      - "#6DAD19"
      - "#e6a23c"
      - "#ff6b6b"
todos:
  - id: create-style-components
    content: 创建样式配置文件 recruitmentStyles.js，导出预设配色方案
    status: completed
  - id: create-warm-style
    content: 实现温暖风模板 WarmStyle.vue（含完整UI和样式）
    status: completed
    dependencies:
      - create-style-components
  - id: create-sweet-style
    content: 实现甜美风模板 SweetStyle.vue（含完整UI和样式）
    status: completed
    dependencies:
      - create-style-components
  - id: create-tech-style
    content: 实现科技风模板 TechStyle.vue（参考PublicProducts.vue风格）
    status: completed
    dependencies:
      - create-style-components
  - id: update-public-recruitment
    content: 重构 PublicRecruitment.vue，实现模板动态切换和主题色应用
    status: completed
    dependencies:
      - create-warm-style
      - create-sweet-style
      - create-tech-style
  - id: update-drawer-config
    content: 优化抽屉配置，将 style1/2/3 改为 warm/sweet/tech，添加预设配色快捷选择
    status: completed
    dependencies:
      - update-public-recruitment
  - id: add-i18n-translations
    content: 添加国际化翻译（三种风格名称、预设配色名称）
    status: completed
    dependencies:
      - update-drawer-config
---

## 需求概述

为 `/recruitments/public` 公开招募页面设计多套精美UI模板，实现风格与配色分离的灵活配置系统。

## 核心功能

1. **三种风格模板**（通过抽屉的"页面样式"选项切换）

- **温暖风 (warm)**：柔和渐变、圆角卡片、暖色调背景、温馨亲切感
- **甜美风 (sweet)**：马卡龙色系、可爱元素、精致装饰、少女感
- **科技风 (tech)**：深色背景、光晕粒子效果、玻璃拟态卡片（参考PublicProducts.vue）

2. **配色系统**（通过抽屉的"主题色"选择器切换）

- 用户可选任意颜色作为主题色
- 主题色应用到当前风格模板的各个元素上
- 实现：3种模板 × N种配色 = 无限组合

3. **抽屉配置优化**

- 将"样式一/二/三"改为风格名称（温暖/甜美/科技）
- 添加预设配色方案快捷选择

## 设计细节

### 温暖风设计

- 背景：柔和暖色渐变（米白到浅橙）
- 卡片：圆角卡片、柔和阴影、暖色边框
- 按钮：圆角胶囊形、渐变背景
- 字体：圆润现代
- 动画：缓慢柔和的淡入效果

### 甜美风设计

- 背景：马卡龙粉色系（淡粉+淡紫+薄荷绿点缀）
- 卡片：精致边框、蝴蝶结/星星装饰元素
- 按钮：圆角、糖果色渐变
- 字体：优雅手写体/圆体
- 动画：轻盈弹跳效果

### 科技风设计（参考PublicProducts.vue）

- 背景：深色 + 动态光球 + 粒子效果 + 网格层
- 卡片：玻璃拟态（毛玻璃效果边框发光）
- 按钮：霓虹发光边框、渐变填充
- 字体：科技感无衬线
- 动画：脉冲光效、悬浮高亮

## 技术方案

### 技术栈

- **前端框架**：Vue3 + Composition API（现有项目）
- **样式方案**：Scoped CSS + CSS Variables（主题色动态应用）
- **构建工具**：Vite（现有项目）

### 实现架构

#### 组件结构

```
frontend/src/views/recruitments/
├── PublicRecruitment.vue          # 主组件（保留数据逻辑）
├── components/
│   ├── recruitmentStyles.js       # [NEW] 样式配置导出
│   ├── WarmStyle.vue              # [NEW] 温暖风模板
│   ├── SweetStyle.vue             # [NEW] 甜美风模板
│   └── TechStyle.vue              # [NEW] 科技风模板
```

#### 样式切换逻辑

```javascript
// PublicRecruitment.vue
<template>
  <!-- 根据 layoutStyle 动态渲染对应模板 -->
  <WarmStyle v-if="layoutStyle === 'warm'" :data="recruitment" :themeColor="themeColor" />
  <SweetStyle v-else-if="layoutStyle === 'sweet'" :data="recruitment" :themeColor="themeColor" />
  <TechStyle v-else-if="layoutStyle === 'tech'" :data="recruitment" :themeColor="themeColor" />
</template>
```

#### 主题色应用方式

- 通过 CSS Variables 实现主题色动态切换
- 每个模板定义自己的颜色映射变量
- 示例：`--theme-primary: v-bind(themeColor)`

### 数据结构

```javascript
// pageStyle 配置（已存在）
{
  layoutStyle: 'warm' | 'sweet' | 'tech',  // 替换原有的 style1/style2/style3
  themeColor: '#775999'  // 用户选择的任意颜色
}
```

### 抽屉配置优化

```javascript
// Index.vue 样式选项
<el-option label="温暖风" value="warm" />
<el-option label="甜美风" value="sweet" />
<el-option label="科技风" value="tech" />

// 预设配色快捷选择
const presetColors = [
  { label: '浪漫紫', value: '#775999' },
  { label: '活力橙', value: '#FF6B35' },
  { label: '清新绿', value: '#4CAF50' },
  { label: '少女粉', value: '#E91E63' },
  { label: '天空蓝', value: '#2196F3' }
]
```

### 性能考虑

- 三个模板组件使用 `defineAsyncComponent` 懒加载
- 背景粒子效果使用 CSS 动画而非 JS 渲染
- 保持现有功能完整，不破坏数据逻辑

## 招募公开页多风格模板设计

### 温暖风 (Warm Style)

- **背景**：柔和暖色渐变 (#FFF8F0 → #FFE4D0)
- **主色调**：用户选择的主题色作为强调色
- **卡片**：大圆角(20px)、柔和阴影、浅色底
- **特点**：温馨亲切、柔和舒适感

### 甜美风 (Sweet Style)

- **背景**：马卡龙色系 (#FFF0F5 淡粉 + #F5F0FF 淡紫)
- **装饰元素**：星星/蝴蝶结图标点缀
- **卡片**：精致边框、渐变描边
- **特点**：可爱俏皮、少女感

### 科技风 (Tech Style)

- **背景**：深色 (#0D0D1A) + 动态光球 + 粒子
- **卡片**：玻璃拟态、边框发光效果
- **参考**：PublicProducts.vue 的 UI 风格
- **特点**：科技感、未来感、酷炫