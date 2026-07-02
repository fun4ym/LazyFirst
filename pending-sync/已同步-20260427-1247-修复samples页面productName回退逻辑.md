# 修复 samples 页面 productName 回退逻辑

**修改日期**: 2026年4月27日 12:47  
**执行人**: 小垃圾  
**授权状态**: 待同步  

## 修复的问题

### `/samples-bd` 页面商品信息列不显示数据
- **现象**: `/samples-bd` 页面“商品信息”列使用 `ProductCell` 组件，但部分记录显示空白
- **根本原因**: 后端 `samples.js` 在组装返回数据时，当 `productMap` 中找不到对应商品时，`productName` 字段返回空字符串，导致前端 `ProductCell` 无法显示商品名称
- **修复方案**: 在 `productName` 字段赋值时添加回退逻辑，优先使用商品映射表，其次使用样品记录自身的 `productName` 字段，最后返回空字符串

## 修改的文件

### 后端
- `server/routes/samples.js` (第301行)
  - 修改前: `productName: (productMapById[obj.productId] || productMapByTikTokId[obj.productId])?.name || '',`
  - 修改后: `productName: (productMapById[obj.productId] || productMapByTikTokId[obj.productId])?.name || obj.productName || '',`

## 影响范围
- `/samples` 页面商品信息显示
- `/samples-bd` 页面商品信息显示
- 任何使用 `ProductCell` 组件且依赖 `productName` 字段的页面

## 验证方法
1. 访问 `/samples-bd` 页面
2. 检查之前显示空白的商品信息列是否现在能正常显示商品名称
3. 访问 `/samples` 页面，确认商品信息显示正常

## 同步状态
- [ ] 已提交到 Git
- [ ] 已同步到服务器
- [ ] 已部署验证

## 备注
此修复与数据清理任务（修复重复计数）关联，建议在部署数据清理脚本后一并部署。