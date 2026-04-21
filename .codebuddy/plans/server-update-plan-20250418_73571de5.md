---
name: server-update-plan-20250418
overview: 整理当前未提交的代码更改，制定详细的服务器更新部署计划
todos:
  - id: prepare-local-changes
    content: 整理本地未提交内容，确认需要部署的19个文件，排除.codebuddy/目录下的临时文件
    status: completed
  - id: commit-changes
    content: 提交代码到本地git仓库，添加有意义的提交信息
    status: completed
    dependencies:
      - prepare-local-changes
  - id: build-frontend
    content: 进入frontend目录执行npm run build，确保前端构建成功
    status: completed
    dependencies:
      - commit-changes
  - id: sync-to-server
    content: 使用rsync同步代码到服务器，排除node_modules和.git但不排除dist目录
    status: completed
    dependencies:
      - build-frontend
  - id: rebuild-containers
    content: SSH连接到服务器，执行docker compose build --no-cache重建前后端容器
    status: completed
    dependencies:
      - sync-to-server
  - id: restart-services
    content: 在服务器上执行docker compose up -d重启所有服务
    status: completed
    dependencies:
      - rebuild-containers
  - id: verify-deployment
    content: 验证网站可正常访问，检查视频管理页面和国际化功能
    status: completed
    dependencies:
      - restart-services
---

## 需求概述

整理本地未提交的代码更改内容，并制定完整的服务器更新计划，将19个修改文件安全部署到线上服务器。

## 核心需求

1. **整理未提交内容**：确认所有修改文件，排除不应部署的临时文件（.codebuddy/目录下的9个文件）
2. **制定部署流程**：按照服务器部署规范，将前端国际化增强、VideoManagement.vue重构、后端模型和路由修改等更新部署到线上环境
3. **验证部署结果**：确保网站功能正常，修改正确生效，包括视频管理页面、国际化切换、商品导入功能等

## 修改内容摘要

### 前端修改（10个文件）

- **国际化增强**：新增common.dash、common.doubleDash、common.countUnit、samples.date、samples.videoStreamCode等键值
- **VideoManagement.vue重构**：移除influencerAccount和adStatus搜索项，表格列调整，商品信息显示优化
- **其他页面优化**：Management.vue、ManagementBDSelf.vue、PublicCollection.vue等页面的样式和功能改进

### 后端修改（4个文件）

- **模型修改**：SampleManagement.js中influencerId从required: true改为required: false
- **迁移脚本修复**：migrate_fix_remaining.js修复聚合管道条件逻辑
- **导入功能增强**：init-import.js增加店铺匹配逻辑和详细日志，activities.js增加日志和默认值

### 不应部署的文件（9个）

- .codebuddy/teams/下的5个临时文件（已删除）
- .codebuddy/plans/下的4个计划文件（未跟踪）

## 技术方案

### 部署环境

- **服务器IP**: 150.109.183.29
- **服务器用户**: ubuntu
- **部署目录**: /home/ubuntu/tap-system/
- **域名**: tap.lazyfirst.com
- **MongoDB连接**: mongodb://tapsystem:5Qb0Q9WqztimCNuzfVoX@150.109.183.29:27017/tap_system?authSource=tap_system

### 部署策略分析

根据修改内容分析：

- **前端修改**：10个文件，包括国际化文件、样式文件、Vue组件 → 需要重建前端容器
- **后端修改**：4个文件，包括模型、路由、迁移脚本 → 需要重建后端容器
- **结论**：前后端都需要重建，使用完整部署流程

### 部署铁律遵守

1. 🚫 **禁止执行** `docker compose down`（会丢失SSL证书volume挂载）
2. 🚫 **rsync禁止exclude** `dist`（前端构建文件会丢失）
3. ✅ **docker build必须加** `--no-cache`
4. ✅ **根据修改内容决定操作**：前后端都改 → 两个都重建

### 系统架构

```
用户访问 → Nginx反向代理 → 前端容器 (Vue.js) → 后端容器 (Node.js/Express) → MongoDB数据库
```

### 部署流程设计

1. **本地准备阶段**：整理代码、提交更改、构建前端
2. **代码同步阶段**：使用rsync同步代码到服务器（排除node_modules和.git，但不排除dist）
3. **服务器部署阶段**：重建Docker容器、重启服务
4. **验证阶段**：检查网站访问、功能测试、错误排查

### 关键实施细节

1. **rsync命令**：必须包含`--exclude 'node_modules' --exclude '.git'`，但不能排除dist
2. **Docker构建**：必须使用`docker compose build --no-cache`确保使用最新代码
3. **服务重启**：使用`docker compose up -d`重新创建容器

### 风险与缓解

1. **数据库兼容性风险**：influencerId改为非必填，部署前在本地测试模型兼容性
2. **国际化键缺失风险**：检查所有语言文件完整性，确保新增键值都有对应翻译
3. **前端构建失败风险**：本地先构建前端，确认无错误后再部署
4. **部署失败回滚**：准备git回滚方案，可快速恢复到上一可用版本