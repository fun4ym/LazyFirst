# 项目技术记录

> 项目相关的技术规范和代码记录

---

## 一、商品相关

### 商品图片
| 字段 | 类型 | 说明 |
|------|------|------|
| `images` | String | 头图，单个链接 |
| `productImages` | Array | 图片集，多个链接 |

### 显示规则
- 列表页：显示 `images`（头图）
- 详情页：显示 `productImages`（图片集）

### public-samples API
- 路径: `/api/public/samples?s=识别码`
- productId 字段类型兼容：需同时匹配 ObjectId 和 String

---

## 二、样品管理

### productId 字段规范
| 字段 | 类型 | 用途 |
|------|------|------|
| `samplemanagements.productId` | String | 存 TikTok 商品 ID，用于展示 |
| `Product.tiktokProductId` | String | 用于关联查询 |
| 新增样品时 | 前端传 Product._id | 后端查 tiktokProductId → 存 productId |

### 查询兼容写法
```javascript
const query = {
  $or: [
    { productId: { $in: objectIdList } },
    { productId: { $in: stringList } }
  ]
};
```

---

## 三、数据迁移规范

### 迁移原则
| 原则 | 说明 |
|------|------|
| 优先写迁移脚本 | 修改数据模型时，直接用脚本修改数据库 |
| 不要做兼容旧数据的逻辑 | 迁移后删除所有兼容代码 |
| 迁移脚本位置 | `server/migrate_xxx.js` |

### ObjectId 类型问题
- **导出问题**: mongosh 导出后 `_id` 等字段变成字符串
- **后果**: 导入后 `.populate()` 失败 → **空白页**
- **解决**: 导入后必须执行 ObjectId 转换脚本

### 解析 mongosh 导出格式
```javascript
const fn = new Function('ObjectId', 'ISODate', 'return ' + docBlock);
const doc = fn(id => id, s => s);
```

---

## 四、项目配置

### 项目配色
- 主色: `#775999`（紫色）

### 端口
- 前端开发: `http://localhost:5174`
- 后端开发: `http://localhost:3000`

---

## 五、数据库定时备份

| 项目 | 值 |
|------|-----|
| 备份脚本 | `/home/ubuntu/backups/backup-db.sh` |
| 备份位置 | `/home/ubuntu/backups/tapdb_*.archive` |
| 执行时间 | 每天东八区 00:00（UTC 16:00） |
| 保留期限 | 30 天 |

---

*文档更新日期: 2026-07-14*
*更新人: 小垃圾*
