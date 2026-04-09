#!/bin/bash
# 数据库定时备份脚本
# 备份MongoDB数据库到本地文件

BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_BACKUP="/tmp/tapdb_${DATE}.archive"
HOST_BACKUP="${BACKUP_DIR}/tapdb_${DATE}.archive"

# 创建备份目录（如果不存在）
mkdir -p ${BACKUP_DIR}

# 1. 在容器内执行mongodump备份（只备份tap_system数据库）
sudo docker exec tap-mongodb mongodump \
  --archive=${CONTAINER_BACKUP} \
  --gzip \
  --db=tap_system \
  --authenticationDatabase=admin \
  -u tapadmin \
  -p tap_admin_pass_2024

if [ $? -ne 0 ]; then
    echo "[$(date)] 容器内备份失败!" >&2
    exit 1
fi

# 2. 将备份文件复制到主机
sudo docker cp tap-mongodb:${CONTAINER_BACKUP} ${HOST_BACKUP}

if [ $? -eq 0 ] && [ -f "${HOST_BACKUP}" ]; then
    echo "[$(date)] 数据库备份成功: ${HOST_BACKUP}"
    
    # 3. 清理容器内临时文件
    sudo docker exec tap-mongodb rm -f ${CONTAINER_BACKUP}
    
    # 4. 保留最近30天的备份，删除更旧的
    find ${BACKUP_DIR} -name "tapdb_*.archive" -mtime +30 -delete
    echo "[$(date)] 清理30天前的旧备份完成"
else
    echo "[$(date)] 数据库备份失败!" >&2
    exit 1
fi
