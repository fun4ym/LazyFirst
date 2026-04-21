---
name: 修复SVG路径错误
overview: 修复前端5个Vue组件中损坏的商店图标SVG路径，消除控制台错误并确保图标正常渲染。
todos:
  - id: analyze-svg-errors
    content: 分析SVG路径数据，识别所有格式错误和修复点
    status: completed
  - id: create-correct-svg
    content: 创建正确的SVG路径数据，修复moveto命令和格式错误
    status: completed
    dependencies:
      - analyze-svg-errors
  - id: fix-publiccollection
    content: 修复PublicCollection.vue中的SVG图标
    status: completed
    dependencies:
      - create-correct-svg
  - id: fix-managementbdself
    content: 修复ManagementBDSelf.vue中的SVG图标
    status: completed
    dependencies:
      - create-correct-svg
  - id: fix-management
    content: 修复Management.vue中的SVG图标
    status: completed
    dependencies:
      - create-correct-svg
  - id: fix-reportorders
    content: 修复report-orders/Index.vue中的SVG图标
    status: completed
    dependencies:
      - create-correct-svg
  - id: fix-producttab
    content: 修复ProductTab.vue中的SVG图标
    status: completed
    dependencies:
      - create-correct-svg
  - id: verify-fixes
    content: 验证所有修复，确保SVG图标正常显示且控制台无错误
    status: completed
    dependencies:
      - fix-publiccollection
      - fix-managementbdself
      - fix-management
      - fix-reportorders
      - fix-producttab
---

## 问题概述

前端控制台出现三个SVG path错误，影响5个Vue组件文件的店铺图标显示。这些错误导致浏览器解析SVG路径时失败，可能影响图标渲染和页面性能。

## 具体错误

1. **路径数据格式错误**：`<path>`元素的d属性包含格式错误的数值序列，缺少必要的空格分隔
2. **缺少moveto命令**：第二个`<path>`的d属性以"-12.4-18.6"开头，缺少必需的'M'或'm'命令
3. **错误字符"h8svgc"**：应为"h83.6c"，字符"8svgc"是错误编码

## 影响范围

- frontend/src/views/samples/PublicCollection.vue
- frontend/src/views/samples/ManagementBDSelf.vue
- frontend/src/views/samples/Management.vue
- frontend/src/views/report-orders/Index.vue
- frontend/src/views/products/ProductTab.vue

## 修复目标

1. 修复所有SVG路径数据的格式错误
2. 确保每个路径命令格式正确
3. 消除浏览器控制台报错
4. 保持图标视觉外观不变

## 技术方案

### 问题分析

SVG路径数据包含多个格式问题：

1. **命令与参数缺少分隔**：如"0.8-0.6 1.4-1.4"应改为"0.8 -0.6 1.4 -1.4"
2. **缺少moveto命令**：路径必须以'M'或'm'开头
3. **错误字符替换**："h8svgc"应改为"h83.6c"
4. **相对/绝对命令混淆**：如"m0-17.3"应改为"m 0 -17.3"

### 修复策略

1. **逐行分析SVG路径**：识别所有路径命令和参数
2. **标准化路径格式**：确保命令与参数间有适当空格分隔
3. **修复具体错误**：

- 为第二个path添加moveto命令（'m'）
- 修复"h8svgc"为"h83.6c"
- 修正所有路径数据格式

4. **批量应用修复**：5个文件使用相同的SVG代码，可统一修复

### 实现方法

1. 创建正确的SVG路径数据
2. 使用统一的修复方案替换所有文件中的损坏SVG
3. 验证修复后SVG符合W3C SVG规范

### 技术要点

- SVG路径命令语法：M/m (moveto), L/l (lineto), H/h (horizontal lineto), V/v (vertical lineto), C/c (curveto), Z/z (closepath)
- 命令与参数必须用空格或逗号分隔
- 相对命令参数为相对坐标，绝对命令参数为绝对坐标
- 确保所有路径闭合正确

## 目录结构

```
frontend/
├── src/
│   ├── views/
│   │   ├── samples/
│   │   │   ├── PublicCollection.vue      # [MODIFY] 修复店铺SVG图标
│   │   │   ├── ManagementBDSelf.vue      # [MODIFY] 修复店铺SVG图标
│   │   │   └── Management.vue            # [MODIFY] 修复店铺SVG图标
│   │   ├── report-orders/
│   │   │   └── Index.vue                 # [MODIFY] 修复店铺SVG图标
│   │   └── products/
│   │       └── ProductTab.vue            # [MODIFY] 修复店铺SVG图标
└── styles/
    └── common.css                        # [REFERENCE] 包含shop-svg-icon样式定义
```