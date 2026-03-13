#!/bin/bash

# TAP 系统停止脚本

echo "======================================"
echo "  TAP System - 停止脚本"
echo "======================================"
echo ""

# 停止后端
if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    echo "🛑 停止后端服务 (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null
    rm logs/backend.pid
    echo "✅ 后端已停止"
else
    echo "⚠️  后端 PID 文件不存在，尝试通过端口查找..."
    BACKEND_PID=$(lsof -t -i:3000 2>/dev/null)
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID
        echo "✅ 后端已停止 (PID: $BACKEND_PID)"
    else
        echo "ℹ️  后端未运行"
    fi
fi

# 停止前端
if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    echo ""
    echo "🛑 停止前端服务 (PID: $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null
    rm logs/frontend.pid
    echo "✅ 前端已停止"
else
    echo ""
    echo "⚠️  前端 PID 文件不存在，尝试通过端口查找..."
    FRONTEND_PID=$(lsof -t -i:5173 2>/dev/null)
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID
        echo "✅ 前端已停止 (PID: $FRONTEND_PID)"
    else
        echo "ℹ️  前端未运行"
    fi
fi

echo ""
echo "======================================"
echo "  ✅ 所有服务已停止"
echo "======================================"
