#!/bin/bash
# 数据库定时备份脚本
# 备份MongoDB数据库到本地文件

BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/tapdb_${DATE}.archive"

# 创建备份目录（如果不存在）
mkdir -p ${BACKUP_DIR}

# 执行mongodump备份
docker exec tap-mongodb mongodump \
  --archive=${BACKUP_FILE} \
  --gzip \
  --authenticationDatabase=admin \
  -u tapadmin \
  -p tap_admin_pass_2024

# 检查备份是否成功
if [ $? -eq 0 ] && [ -f "${BACKUP_FILE}" ]; then
    echo "[$(date)] 数据库备份成功: ${BACKUP_FILE}"
    
    # 保留最近30天的备份，删除更旧的
    find ${BACKUP_DIR} -name "tapdb_*.archive" -mtime +30 -delete
    echo "[$(date)] 清理30天前的旧备份完成"
else
    echo "[$(date)] 数据库备份失败!" >&2
    exit 1
fi
