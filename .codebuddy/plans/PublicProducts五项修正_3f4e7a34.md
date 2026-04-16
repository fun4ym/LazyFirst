---
name: PublicProducts五项修正
overview: 修正PublicProducts页面的5个问题：Header品牌名改全称、统计卡片加฿货币符号、筛选改用productGrade+下拉、商品卡片补tiktokProductId、确认加载更多功能正常
todos:
  - id: update-backend-api
    content: 后端修改：filters加grades、products加grade筛选、stats加maxSellingPrice、select加productGrade
    status: completed
  - id: update-frontend-page
    content: 前端修改：品牌名/฿符号/grades chips/tiktokProductId/统计卡片
    status: completed
    dependencies:
      - update-backend-api
---

## 用户需求（5项修正）

1. Header品牌名 "LazyFirst" → "LazyFirst Co., Ltd."
2. 统计卡片第三个值加฿货币符号前缀，显示最高售价如 "฿999"
3. 筛选区chips改用 productGrade（ทั่วไป/ฮิต/หลัก/ใหม่），店铺保留下拉框
4. 商品卡片补上 tiktokProductId 显示
5. 确认加载更多按钮存在且正常工作（已存在，无需修改）

## 修改文件

### 1. `server/routes/public-products.js` [MODIFY]

- `/filters` 接口：增加 `grades` 返回字段，值为 distinct productGrade
- `/products` 接口：增加 `grade` 查询参数，筛选 productGrade；select 加上 productGrade 字段
- `/stats` 接口：增加 `maxSellingPrice` 返回字段

### 2. `frontend/src/views/products/PublicProducts.vue` [MODIFY]

- Header品牌名 "LazyFirst" → "LazyFirst Co., Ltd."
- 第三个stat-card值改为 `฿{{ stats.maxSellingPrice }}`，标签改为 "ราคาสูงสุด"
- chips改用grades数据（ทั่วไป/ฮิต/หลัก/ใหม่），去掉category chips，店铺保留下拉框
- 商品卡片card-info区加tiktokProductId显示
- 加载更多已有，无需修改

## productGrade泰文映射

| productGrade | 泰文 |
| --- | --- |
| ordinary | ทั่วไป |
| hot | ฮิต |
| main | หลัก |
| new | ใหม่ |