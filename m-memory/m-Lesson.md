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

## 五、2026-04-21 公开页面认证问题

### 事故原因
1. **全局空闲超时检测**：`App.vue` 中的 `useGlobalIdleTimeout` 在公开页面触发，30分钟后自动登出跳转登录。
2. **请求拦截器未区分页面**：`request.js` 为所有请求添加 Authorization 头，401 时自动跳转登录。
3. **组件未感知公开状态**：`ProductCell` 在公开页面调用需要认证的 `/api/products` 接口获取图片。
4. **部署遗漏 dist 目录**：rsync 排除 dist 导致前端构建文件未同步（重复犯错）。
5. **容器网络配置错误**：Docker 容器未加入正确网络，Nginx 无法连接后端服务。

### 后果
- 公开页面 `/samples/public` 无法正常访问，用户看到 401 错误或连接被拒绝。
- 影响外部用户查看公开样品信息。

### 处理方式
1. **修改 App.vue**：添加公开页面检测逻辑，公开页面禁用空闲超时检测。
2. **修改 request.js**：公开页面不添加 Authorization 头，401 响应不跳转登录。
3. **修改 ProductCell.vue**：组件内判断当前路由，公开页面禁止自动调用 API。
4. **修改 PublicCollection.vue**：为 ProductCell 添加 `disable-auto-fetch` 属性。
5. **同步 dist 目录**：rsync 时确保 dist 目录同步。
6. **正确启动容器**：使用 `--network tap-system_default` 网络配置。

### 核心教训
1. **公开页面必须完全隔离认证逻辑**：空闲检测、请求拦截、组件行为都需区分公开/认证页面。
2. **组件应能感知页面类型**：根据路由决定是否调用需要认证的 API。
3. **部署检查清单必须严格执行**：dist 不能 exclude 已反复强调，仍需警惕。
4. **Docker 网络配置是关键**：容器间通信依赖正确的网络配置。

---

## 六、部署操作规则

| 修改范围 | 必须操作 |
|----------|----------|
| 前端改了 | 同步dist + docker build --no-cache |
| 后端改了 | docker build --no-cache |
| 前后端都改 | 两个都做 |

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
