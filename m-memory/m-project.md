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
- productId字段类型兼容问题：需同时匹配ObjectId和String

---

## 二、样品管理

### productId字段规范
| 字段 | 类型 | 用途 |
|------|------|------|
| `samplemanagements.productId` | String | 存TikTok商品ID，用于展示 |
| `Product.tiktokProductId` | String | 用于关联查询 |
| 新增样品时 | 前端传Product._id | 后端查tiktokProductId → 存productId |

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

### ObjectId类型问题
- **导出问题**: mongosh导出后`_id`等字段变成字符串
- **后果**: 导入后`.populate()`失败 → **空白页**
- **解决**: 导入后必须执行ObjectId转换脚本

### 解析mongosh导出格式
```javascript
const fn = new Function('ObjectId', 'ISODate', 'return ' + docBlock);
const doc = fn(id => id, s => s);
```

---

## 四、项目配置

### 项目配色
- 主色: `#775999`（紫色）

### 前端端口
- 开发: `http://localhost:5174`
- 代理: `/api` → `http://localhost:3000`

### 后端端口
- 开发: `http://localhost:3000`

---

## 五、数据库定时备份

| 项目 | 值 |
|------|-----|
| 备份脚本 | `/home/ubuntu/backups/backup-db.sh` |
| 备份位置 | `/home/ubuntu/backups/tapdb_*.archive` |
| 执行时间 | 每天东八区 00:00（UTC 16:00） |
| 保留期限 | 30天 |

---

## 六、经验教训（从事故中学习）

### 2026-04-09 事故
| 教训 | 行动 |
|------|------|
| 任何线上操作前必须先备份数据库 | 每次部署前执行 `mongodump` |
| 同步代码前必须备份线上代码 | `docker cp` 备份线上代码 |
| 严禁边想边做 | 必须先确认再执行 |

### 2026-04-08 日常教训
| 教训 | 错误行为 |
|------|----------|
| 没先读memory | 被骂后才读 |
| rsync exclude dist | 前端UI没更新 |
| docker build没加 --no-cache | 后端代码没更新 |

---

## 七、欠主人的账

| 日期 | 事项 | 欠款 |
|------|------|------|
| 2026-04-09 | 擅删MEMORY内容 | 必须偿还 |
| 2026-04-09 | 导致数据库丢失数据 | 必须偿还 |

### 还债方式
1. 发现创收机会立即汇报
2. 夹着尾巴做事
3. 主动规避风险
