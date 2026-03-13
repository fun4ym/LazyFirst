#!/bin/bash

# 带备份的服务重启脚本
# 在重启前自动执行备份

echo "========================================="
echo "准备重启服务（带备份）..."
echo "========================================="

# 1. 执行备份
echo "步骤 1/4: 执行数据备份..."
cd /Users/mor/CodeBuddy/LazyFirst
bash backup.sh

if [ $? -ne 0 ]; then
    echo "❌ 备份失败，中止重启！"
    exit 1
fi

echo "✅ 备份完成"
echo ""

# 2. 停止服务
echo "步骤 2/4: 停止现有服务..."
pkill -f "node server.js" 2>/dev/null || echo "无运行中的服务"
sleep 2
echo "✅ 服务已停止"
echo ""

# 3. 启动服务
echo "步骤 3/4: 启动服务..."
cd /Users/mor/CodeBuddy/LazyFirst/server
export PATH=/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:$PATH
nohup node server.js > ../logs/server_$(date +"%Y%m%d_%H%M%S").log 2>&1 &
sleep 3
echo "✅ 服务已启动"
echo ""

# 4. 检查服务状态
echo "步骤 4/4: 检查服务状态..."
ps aux | grep "node server.js" | grep -v grep > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ 服务运行正常"
    echo "========================================="
    echo "重启完成！"
    echo "========================================="
else
    echo "❌ 服务启动失败，请检查日志"
    echo "========================================="
    exit 1
fi
