#!/bin/bash

echo "=== 重启TAP系统服务器 ==="

# 查找并停止正在运行的服务器
PID=$(ps aux | grep "[n]ode.*server.js" | awk '{print $2}')

if [ -n "$PID" ]; then
    echo "停止服务器 (PID: $PID)..."
    kill $PID
    sleep 2
    echo "服务器已停止"
else
    echo "没有运行中的服务器"
fi

# 清理node_modules缓存（可选）
# rm -rf node_modules/.cache

# 启动服务器
echo "启动服务器..."
cd "$(dirname "$0")/server"
npm run dev &
SERVER_PID=$!

echo "服务器已启动 (PID: $SERVER_PID)"
echo "请等待几秒钟后刷新浏览器页面"
echo "按 Ctrl+C 查看服务器日志"

# 等待用户中断
wait $SERVER_PID
