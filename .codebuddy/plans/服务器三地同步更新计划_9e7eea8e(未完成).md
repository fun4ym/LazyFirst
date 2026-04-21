---
name: 服务器三地同步更新计划
overview: 制定服务器更新计划，确保本地、GitHub和服务器代码一致，遵循memory规则，避免历史错误，提供高效更新路径和todo list。
todos:
  - id: read-rules
    content: 认真阅读RULES.md和memory文档，确保理解所有部署规则和安全铁律
    status: completed
  - id: analyze-diffs
    content: 使用[subagent:code-explorer]分析本地、GitHub、服务器三地代码差异
    status: completed
    dependencies:
      - read-rules
  - id: cleanup-local
    content: 清理本地临时调试文件（server/check*.js），提交未提交的修改到git
    status: in_progress
    dependencies:
      - analyze-diffs
  - id: push-to-github
    content: 推送本地提交到GitHub，确保本地与GitHub代码一致
    status: pending
    dependencies:
      - cleanup-local
  - id: backup-database
    content: 备份线上MongoDB数据库，确保数据安全
    status: pending
    dependencies:
      - push-to-github
  - id: sync-to-server
    content: 使用rsync同步代码到服务器（不exclude dist目录）
    status: pending
    dependencies:
      - backup-database
  - id: rebuild-containers
    content: 在服务器上执行docker compose build --no-cache && docker compose up -d
    status: pending
    dependencies:
      - sync-to-server
  - id: run-migration
    content: 执行数据迁移脚本migrate_sample_productId.js
    status: pending
    dependencies:
      - rebuild-containers
  - id: verify-deployment
    content: 验证网站可访问性、API功能、页面显示和数据库一致性
    status: pending
    dependencies:
      - run-migration
  - id: update-documentation
    content: 更新同步记录和memory文档，记录本次更新经验
    status: pending
    dependencies:
      - verify-deployment
---

## 用户需求分析

### 核心目标

确保本地、GitHub、服务器三地代码一致，完成安全高效的服务器更新，解决上次更新导致的商品信息显示问题。

### 具体需求

1. **差异整理**：分析并同步本地、GitHub、服务器之间的代码差异
2. **规则遵守**：严格遵循memory中制定的部署规则和安全铁律
3. **高效路径**：制定最短、最安全的更新路径，避免服务中断
4. **万无一失**：从代码、数据到执行计划全面分析，确保更新成功

### 问题背景

- 用户反馈样品管理页面商品信息列显示"--"（productId、productName、productImage、shop字段缺失）
- 上次更新后问题未解决，需要彻底修复并确保不再出错
- 存在未提交的本地修改、未推送的提交、临时调试文件需要清理

### 成功标准

- ✅ 三地代码完全一致
- ✅ 样品管理页面商品信息完整显示
- ✅ 所有API返回正确的商品字段
- ✅ 更新过程无服务中断或数据丢失

## 技术方案

### 技术栈

- **前端**：Vue 3 + Element Plus + Vite
- **后端**：Node.js + Express + MongoDB + Mongoose
- **部署**：Docker + Nginx + Docker Compose
- **数据库**：MongoDB（本地开发/线上生产）

### 实现方案

#### 1. 问题根因分析

通过代码探索发现商品信息显示问题的根本原因：

- **数据模型不一致**：`SampleManagement.productId`在服务器上可能仍为ObjectId类型，而前端需要TikTok商品ID（String）
- **API字段缺失**：后端API未返回`productImage`、`shopName`等兼容字段
- **数据未迁移**：历史数据中的productId仍为ObjectId，未转换为TikTok商品ID

#### 2. 修复方案

**已实施的修复**：

- ✅ `SampleManagement.js`：将`productId`类型从ObjectId改为String
- ✅ `samples.js`：添加`productImage`、`productId`（TikTok ID）、`shopName`字段映射
- ✅ `public-samples.js`：添加`shopName`字段
- ✅ 添加调试日志验证数据返回

**待执行的操作**：

- 执行数据迁移脚本`migrate_sample_productId.js`
- 同步修复到服务器环境
- 验证前端页面正确显示

#### 3. 系统架构

```
用户请求 → Nginx (SSL) → 前端容器 (Vue) → 后端容器 (Node.js) → MongoDB
```

#### 4. 关键技术点

- **字段兼容性**：API同时支持新旧数据格式，确保平滑过渡
- **批量查询优化**：使用`$in`查询减少数据库访问次数
- **调试日志**：关键路径添加详细日志，便于问题排查
- **数据迁移**：分批处理，避免内存溢出和服务中断

#### 5. 性能与安全

- **性能**：商品和店铺信息批量查询，shopMap缓存优化
- **安全**：遵循最小权限原则，API认证授权，数据库连接加密
- **可靠性**：更新前完整备份，可快速回滚，服务渐进式更新

### 目录结构影响

```
项目根目录/
├── server/
│   ├── models/SampleManagement.js          # [MODIFY] productId类型改为String
│   ├── models/Video.js                     # [MODIFY] 模型字段调整
│   ├── routes/samples.js                   # [MODIFY] 添加商品信息字段
│   ├── routes/public-samples.js            # [MODIFY] 添加shopName字段
│   └── migrate_sample_productId.js         # [EXECUTE] 数据迁移脚本
├── frontend/
│   └── src/views/samples/Management.vue    # [VERIFY] 前端已适配新字段
├── m-memory/
│   └── m-server.md                         # [MODIFY] 服务器文档更新
└── pending-sync/                           # [UPDATE] 同步记录管理
```

### 数据迁移策略

1. **安全备份**：更新前完整备份MongoDB数据库
2. **分批迁移**：按时间范围分批处理历史数据
3. **验证机制**：迁移后抽样验证数据正确性
4. **回滚预案**：保留迁移前数据快照，支持快速回滚

## 代理扩展使用

### SubAgent

- **code-explorer**
- **目的**：深度分析本地、GitHub、服务器三地代码差异，确保全面理解修改内容和影响范围
- **预期成果**：生成详细的代码差异报告，识别所有需要同步的文件，验证修复方案的完整性

### 扩展使用说明

1. 在执行计划前，使用[subagent:code-explorer]全面分析代码差异
2. 重点关注`samples.js`、`public-samples.js`、`SampleManagement.js`等核心文件的修改
3. 验证前端`Management.vue`与后端API的字段映射一致性
4. 检查数据迁移脚本`migrate_sample_productId.js`的逻辑正确性