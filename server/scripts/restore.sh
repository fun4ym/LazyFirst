#!/bin/bash

# MongoDB 恢复脚本
# 使用方法: ./restore.sh <backup-file.tar.gz>

set -e

# 检查参数
if [ -z "$1" ]; then
    echo "❌ 错误: 请指定备份文件"
    echo "用法: ./restore.sh <backup-file.tar.gz>"
    echo ""
    echo "可用备份文件:"
    ls -lh ./backups/backup_*.tar.gz 2>/dev/null | tail -5
    exit 1
fi

BACKUP_FILE="$1"

# 检查文件是否存在
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ 错误: 备份文件不存在: $BACKUP_FILE"
    exit 1
fi

# 从环境变量或默认值获取 MongoDB URI
if [ -z "$MONGODB_URI" ]; then
    DB_NAME="${DB_NAME:-tap_system}"
    MONGODB_URI="mongodb://localhost:27017/${DB_NAME}"
fi

echo "========================================="
echo "📥 开始恢复数据库..."
echo "========================================="
echo "📁 备份文件: $BACKUP_FILE"
echo "📅 时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="
echo ""
echo "⚠️  警告: 恢复操作将覆盖现有数据！"
echo "⚠️  建议先备份当前数据库"
echo ""

# 确认操作
read -p "是否继续恢复? (输入 'yes' 继续): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ 操作已取消"
    exit 0
fi

# 解压备份文件
TEMP_DIR="./backups/temp_restore"
echo ""
echo "📦 解压备份文件..."
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# 查找备份目录
BACKUP_DIR_NAME=$(find "$TEMP_DIR" -type d -name "backup_*" | head -1)
if [ -z "$BACKUP_DIR_NAME" ]; then
    echo "❌ 错误: 备份文件格式不正确"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# 恢复数据库
echo ""
echo "🔄 恢复数据到数据库..."
mongorestore --uri="$MONGODB_URI" --dir="$BACKUP_DIR_NAME" --drop

# 清理临时文件
rm -rf "$TEMP_DIR"

echo ""
echo "========================================="
echo "✅ 恢复完成！"
echo "========================================="
echo "📅 时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="
