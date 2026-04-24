---
name: samples-bd新增弹层优化及三地同步部署
overview: 整理/samples-bd新增弹层优化变更，同步到GitHub和线上服务器，保持本地、GitHub、线上三地代码一致。
todos:
  - id: explore-changes
    content: 使用[subagent:code-explorer]深入探索所有变更文件，生成详细变更报告
    status: completed
  - id: create-sync-record
    content: 创建同步记录文件到pending-sync目录，详细记录变更内容
    status: completed
    dependencies:
      - explore-changes
  - id: commit-changes
    content: 提交代码到本地Git仓库，包含清晰的提交信息
    status: completed
    dependencies:
      - create-sync-record
  - id: push-to-github
    content: 推送代码到GitHub远程仓库，保持版本同步
    status: completed
    dependencies:
      - commit-changes
  - id: request-deployment-auth
    content: 请求主人授权进行线上服务器部署操作
    status: completed
    dependencies:
      - push-to-github
  - id: backup-database
    content: 备份线上MongoDB数据库，确保数据安全
    status: completed
    dependencies:
      - request-deployment-auth
  - id: sync-to-server
    content: 使用rsync同步代码到线上服务器，不排除dist目录
    status: completed
    dependencies:
      - backup-database
  - id: rebuild-services
    content: 在服务器上执行docker compose build --no-cache && docker compose up -d
    status: completed
    dependencies:
      - sync-to-server
  - id: verify-deployment
    content: 验证线上服务状态，检查/samples-bd页面功能
    status: completed
    dependencies:
      - rebuild-services
---

## 需求概述

整理当前代码变更内容，将修改同步到GitHub仓库和线上服务器，确保本地、GitHub、线上三地代码一致，并制定符合项目规范的安全部署计划。

## 核心变更内容

1. **ManagementBDSelf.vue** - /samples-bd页面"新增"弹层优化

- 添加`isCurrentUserMaintainer`函数判断维护者是否为当前用户
- 维护者显示去掉"维护者: "文本，当前用户显示绿色(#67c23a)，其他用户显示橙色(#e6a23c)
- poolType公海/私海改为英文public/private
- 搜索达人逻辑优化：添加防抖(300ms)、最小长度验证(2字符)、忽略数据权限(ignoreDataScope: true)

2. **influencer-managements.js** - 达人管理API

- 添加ignoreDataScope参数处理，支持忽略数据权限过滤

3. **Management.vue** - 样品管理页面

- 相关颜色和显示优化（需进一步确认具体变更）

4. **recruitments.js** - 招募管理API

- 需确认具体变更内容

## 部署要求

- 遵循RULES.md和memory中的操作规范
- 保持三地代码一致性（本地、GitHub、线上）
- 线上操作需主人授权，确保安全可控
- 部署前进行数据库备份，避免数据丢失

## 技术方案

### 部署架构

基于现有Docker Compose架构，保持前后端分离部署模式：

- 前端：Vue.js + Element Plus，构建为静态文件由Nginx服务
- 后端：Node.js + Express + MongoDB，提供RESTful API
- 数据库：MongoDB 7，使用认证连接

### 同步策略

1. **代码版本控制**：使用Git管理代码变更，确保可追溯性
2. **文件同步**：使用rsync将本地代码同步到服务器，排除node_modules和.git目录，但必须包含dist目录
3. **容器重建**：使用docker compose build --no-cache确保镜像更新

### 安全措施

1. **数据库备份**：部署前备份线上MongoDB数据
2. **分阶段部署**：先本地验证，再GitHub提交，最后服务器部署
3. **回滚机制**：保持Git版本可回退，数据库备份可恢复

### 验证机制

1. **本地验证**：前端构建成功，后端服务正常启动
2. **线上验证**：HTTP状态码检查，API接口测试
3. **功能验证**：检查/samples-bd页面新增弹层功能正常

## 代理扩展

### SubAgent

- **code-explorer**
- 目的：深入探索代码变更，确保全面了解所有修改内容
- 预期成果：生成详细的变更分析报告，确认所有文件修改的完整性和一致性