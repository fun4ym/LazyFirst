#!/bin/bash

# 数据备份脚本
# 在服务器更新或重启前自动执行

BACKUP_DIR="/Users/mor/CodeBuddy/LazyFirst/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="${BACKUP_DIR}/backup_${TIMESTAMP}"

echo "========================================="
echo "开始备份数据..."
echo "时间: $(date)"
echo "========================================="

# 创建备份目录
mkdir -p "${BACKUP_PATH}"

# 1. 备份 MongoDB 数据（如果使用真实 MongoDB）
# mongoexport --db your_database_name --out "${BACKUP_PATH}/mongo_backup.json" 2>/dev/null || echo "跳过 MongoDB 导出（内存模式或未配置）"

# 2. 备份重要配置文件
echo "备份配置文件..."
cp -r /Users/mor/CodeBuddy/LazyFirst/server/config "${BACKUP_PATH}/" 2>/dev/null || echo "无config目录"

# 3. 备份数据模型
echo "备份数据模型..."
mkdir -p "${BACKUP_PATH}/models_backup"
cp /Users/mor/CodeBuddy/LazyFirst/server/models/*.js "${BACKUP_PATH}/models_backup/" 2>/dev/null

# 4. 备份路由文件
echo "备份路由文件..."
mkdir -p "${BACKUP_PATH}/routes_backup"
cp /Users/mor/CodeBuddy/LazyFirst/server/routes/*.js "${BACKUP_PATH}/routes_backup/" 2>/dev/null

# 5. 备份数据库schema文档
echo "备份schema文档..."
cp /Users/mor/CodeBuddy/LazyFirst/database-schema*.md "${BACKUP_PATH}/" 2>/dev/null

# 6. 记录当前git状态（如果有）
echo "记录git状态..."
cd /Users/mor/CodeBuddy/LazyFirst
git status > "${BACKUP_PATH}/git_status.txt" 2>/dev/null || echo "无git仓库"
git log -1 --oneline > "${BACKUP_PATH}/last_commit.txt" 2>/dev/null || echo "无git仓库"

# 创建备份清单
cat > "${BACKUP_PATH}/backup_info.txt" <<EOF
备份信息
========================================
备份时间: $(date)
备份路径: ${BACKUP_PATH}
备份类型: 配置和代码备份

包含内容:
- models_backup/: 数据模型文件
- routes_backup/: 路由文件
- database-schema*.md: 数据库schema文档
- git_status.txt: Git状态
- last_commit.txt: 最后一次提交信息

恢复说明:
此备份主要用于代码和配置回滚。
如果是内存MongoDB，数据在服务重启后会重置。
如需持久化数据，请配置真实MongoDB。
EOF

echo "========================================="
echo "备份完成！"
echo "备份位置: ${BACKUP_PATH}"
echo "========================================="

# 清理旧备份（保留最近10个）
echo "清理旧备份..."
cd "${BACKUP_DIR}"
ls -t | tail -n +11 | xargs rm -rf 2>/dev/null || true

echo "旧备份已清理（保留最近10个）"
echo "========================================="
