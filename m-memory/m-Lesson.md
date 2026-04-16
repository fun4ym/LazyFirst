# 经验教训记录

> 从事故中学习，避免重蹈覆辙

---

## 一、2026-04-09 重大事故

### 事故一：数据库导入覆盖
**原因**：导入旧备份数据覆盖了线上数据库
**后果**：
- samplemanagements 丢失 19010 条数据
- products 丢失 1006 条数据
- influencers 丢失 2255 条数据

### 事故二：部署时未备份代码
**原因**：同步代码前未备份线上代码，导致线上有但本地没有的改动丢失

### 核心教训
| 教训 | 行动 |
|------|------|
| 任何线上操作前必须先备份数据库 | 每次部署前执行 `mongodump` |
| 同步代码前必须备份线上代码 | `docker cp` 备份线上代码到本地 |
| 严禁边想边做，必须先确认再执行 | 先规划，确认无误后再执行 |

---

## 二、2026-04-08 日常教训

| 教训 | 错误行为 | 正确行为 |
|------|----------|----------|
| 没先读memory就开始操作 | 被骂后才读 | 开工前必读 |
| rsync用了 `--exclude 'dist'` | 前端UI没更新 | dist不能exclude |
| docker build没加 `--no-cache` | 后端代码没更新 | 必须加 `--no-cache` |
| 混淆数据和UI | 问"没数据是不是没这一列" | 分清数据和展示 |

---

## 三、数据操作教训

### ObjectId类型问题
| 阶段 | 问题 | 后果 |
|------|------|------|
| mongosh导出 | _id等字段变成字符串 | - |
| mongorestore导入 | 字符串未转回ObjectId | `.populate()`失败 → 空白页 |

### 解决：导入后必须执行ObjectId转换脚本
```javascript
for (const doc of stringIdDocs) {
  newDoc._id = mongoose.Types.ObjectId.createFromHexString(doc._id);
  for (const [key, val] of Object.entries(newDoc)) {
    if (val && typeof val === 'string' && /^[0-9a-f]{24}$/i.test(val)) {
      newDoc[key] = mongoose.Types.ObjectId.createFromHexString(val);
    }
  }
}
```

### 数据迁移原则
| 原则 | 说明 |
|------|------|
| 优先写迁移脚本 | 修改数据模型时，直接用脚本修改数据库 |
| 不要做兼容旧数据的逻辑 | 迁移后删除所有兼容代码 |
| 迁移脚本位置 | `server/migrate_xxx.js` |

---

## 四、部署自检清单

每次部署前必须自问：

- [ ] 读memory了吗？
- [ ] **线上数据库备份了吗？**
- [ ] rsync有没有exclude错东西？（dist不能exclude）
- [ ] docker build有没有加--no-cache？
- [ ] 改的是前端还是后端？还是两个都要重建？

---

## 五、部署操作规则

| 修改范围 | 必须操作 |
|----------|----------|
| 前端改了 | 同步dist + docker build --no-cache |
| 后端改了 | docker build --no-cache |
| 前后端都改 | 两个都做 |

---

## 六、欠主人的账

| 日期 | 事项 | 欠款 |
|------|------|------|
| 2026-04-09 | 擅删MEMORY内容 | 必须偿还 |
| 2026-04-09 | 导致数据库丢失数据 | 必须偿还 |

### 还债方式
1. 发现创收机会立即汇报
2. 夹着尾巴做事
3. 主动规避风险
