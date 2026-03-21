#!/bin/bash

# TAP 系统启动脚本

echo "======================================"
echo "  TAP System - 启动脚本"
echo "======================================"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo ""

# 安装后端依赖（如果需要）
echo "📦 检查后端依赖..."
if [ ! -d "server/node_modules" ]; then
    echo "正在安装后端依赖..."
    cd server && npm install && cd ..
    echo "✅ 后端依赖安装完成"
else
    echo "✅ 后端依赖已存在"
fi

# 安装前端依赖（如果需要）
echo ""
echo "📦 检查前端依赖..."
if [ ! -d "frontend/node_modules" ]; then
    echo "正在安装前端依赖..."
    cd frontend && npm install && cd ..
    echo "✅ 前端依赖安装完成"
else
    echo "✅ 前端依赖已存在"
fi

echo ""
echo "======================================"
echo "  启动服务"
echo "======================================"
echo ""

# 创建日志目录
mkdir -p logs

# 启动后端
echo "🚀 启动后端服务 (端口: 3000)..."
cd server && nohup npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ 后端已启动 (PID: $BACKEND_PID)"
echo "   日志文件: logs/backend.log"
echo ""

# 等待后端启动
echo "⏳ 等待后端服务启动..."
sleep 5

# 检查后端是否启动成功
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ 后端服务启动成功！"
else
    echo "⚠️  后端服务可能启动失败，请检查日志: tail -f logs/backend.log"
fi

# 启动前端
echo ""
echo "🚀 启动前端服务..."
cd frontend && nohup npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ 前端已启动 (PID: $FRONTEND_PID)"
echo "   日志文件: logs/frontend.log"
echo ""

# 等待前端启动并检测端口
echo "⏳ 等待前端服务启动..."
sleep 3

# 检测前端实际端口
FRONTEND_PORT=$(grep -o "http://localhost:[0-9]*" logs/frontend.log | head -1 | grep -o "[0-9]*$")
if [ -z "$FRONTEND_PORT" ]; then
    FRONTEND_PORT=5173  # 默认端口
fi
echo "✅ 前端端口: $FRONTEND_PORT"

# 保存端口到文件
echo $FRONTEND_PORT > logs/frontend.port

echo ""
echo "======================================"
echo "  🎉 系统启动完成！"
echo "======================================"
echo ""
echo "📱 前端访问地址: http://localhost:$FRONTEND_PORT"
echo "🔧 后端访问地址: http://localhost:3000"
echo ""
echo "📊 查看后端日志: tail -f logs/backend.log"
echo "🎨 查看前端日志: tail -f logs/frontend.log"
echo "🔌 查看前端端口: cat logs/frontend.port"
echo ""
echo "🛑 停止服务: ./stop.sh"
echo "======================================"
echo ""

# 保存 PID
echo $BACKEND_PID > logs/backend.pid
echo $FRONTEND_PID > logs/frontend.pid
