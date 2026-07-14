#!/bin/bash

# MongoDB 备份脚本
# 使用方法: ./backup.sh

set -e

# 配置
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="${DB_NAME:-tap_system}"

# 从环境变量或默认值获取 MongoDB URI
if [ -z "$MONGODB_URI" ]; then
    MONGODB_URI="mongodb://localhost:27017/${DB_NAME}"
fi

# 创建备份目录
mkdir -p "$BACKUP_DIR"

echo "========================================="
echo "📦 开始备份数据库..."
echo "========================================="
echo "📅 时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "🗄️  数据库: ${DB_NAME}"
echo "💾 备份目录: ${BACKUP_DIR}"
echo "========================================="

# 使用 mongodump 备份
BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"
mongodump --uri="$MONGODB_URI" --out="$BACKUP_PATH"

# 压缩备份
echo ""
echo "🗜️  压缩备份文件..."
tar -czf "$BACKUP_PATH.tar.gz" -C "$BACKUP_DIR" "backup_$TIMESTAMP"
rm -rf "$BACKUP_PATH"

# 只保留最近 7 天的备份
echo ""
echo "🧹 清理旧备份..."
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +7 -delete

# 显示备份文件大小
BACKUP_SIZE=$(du -h "$BACKUP_PATH.tar.gz" | cut -f1)
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup_*.tar.gz" | wc -l)

echo ""
echo "========================================="
echo "✅ 备份完成！"
echo "========================================="
echo "📁 备份文件: $BACKUP_PATH.tar.gz"
echo "📏 文件大小: $BACKUP_SIZE"
echo "📊 备份数量: $BACKUP_COUNT 个"
echo "📅 时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="
