#!/bin/bash
set -e

echo "=== Step 1: 全量数据备份 ==="
BACKUP_DIR="/home/ubuntu/backups/backup_$(date +%Y%m%d_%H%M%S)"
sudo docker exec tap-mongodb mongodump \
  --username tapsystem \
  --password tap_system_pass_2024 \
  --authenticationDatabase tap_system \
  --db tap_system \
  --out "$BACKUP_DIR"
echo "备份完成: $BACKUP_DIR"
ls -la "$BACKUP_DIR"

echo ""
echo "=== Step 2: 拉取最新代码 ==="
cd /home/ubuntu/tap-system
git pull

echo ""
echo "=== Step 3: 后端重建 (--no-cache) ==="
sudo docker compose build --no-cache backend
sudo docker compose up -d backend

echo ""
echo "=== Step 4: 前端构建 ==="
cd /home/ubuntu/tap-system/frontend
npm run build

echo ""
echo "=== Step 5: 前端重建 (--no-cache) ==="
cd /home/ubuntu/tap-system
sudo docker compose build --no-cache frontend
sudo docker compose up -d frontend

echo ""
echo "=== Step 6: 验证 ==="
sudo docker compose ps
echo ""
sudo docker compose logs --tail=10 backend

echo ""
echo "=== 部署完成! ==="
