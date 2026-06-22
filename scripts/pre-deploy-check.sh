#!/bin/bash

# ============================================
# Docker Compose 部署前安全检查脚本
# 用途：检测 docker-compose.yml 中的危险配置
# 使用时机：每次部署前执行
# 创建日期：2026-06-22
# 维护人：小垃圾
# ============================================

set -e

COMPOSE_FILE="docker-compose.yml"
ERRORS=0
WARNINGS=0

echo "=========================================="
echo "🔍 Docker Compose 部署前安全检查"
echo "=========================================="
echo ""

# 检查文件是否存在
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ ERROR: 找不到 $COMPOSE_FILE 文件"
    exit 1
fi

echo "✅ 找到配置文件: $COMPOSE_FILE"
echo ""
echo "开始检查..."
echo "------------------------------------------"

# ============================================
# 检查1：危险volume挂载（致命错误）
# ============================================
echo ""
echo "[检查1] 检测危险的 volume 挂载配置..."

if grep -A5 "backend:" "$COMPOSE_FILE" | grep -q "\./server:/app/server"; then
    echo "❌ 致命错误: 检测到危险的 volume 挂载!"
    echo "   配置: volumes: - ./server:/app/server"
    echo ""
    echo "   ⚠️  这个配置会覆盖容器内的 node_modules 目录"
    echo "   ⚠️  导致后端无法启动 → 502 Bad Gateway"
    echo ""
    echo "   解决方案:"
    echo "   1. 删除 docker-compose.yml 中的这行配置"
    echo "   2. 代码应通过 Dockerfile 的 COPY 指令打包进镜像"
    echo ""
    echo "   参考故障记录: pending-sync/20260622-1903-*.md"
    ERRORS=$((ERRORS+1))
else
    echo "✅ 未检测到危险的 server 目录挂载"
fi

if grep -A5 "frontend:" "$COMPOSE_FILE" | grep -q "\./frontend:/app/frontend"; then
    echo "❌ 致命错误: 检测到 frontend 危险挂载!"
    echo "   配置: volumes: - ./frontend:/app/frontend"
    ERRORS=$((ERRORS+1))
else
    echo "✅ 未检测到危险的 frontend 目录挂载"
fi

# ============================================
# 检查2：SSL证书是否在git中（安全警告）
# ============================================
echo ""
echo "[检查2] 检查 SSL 证书管理..."

if [ -d "ssl" ] && [ "$(ls -A ssl 2>/dev/null)" ]; then
    if git ls-files --error-unmatch ssl/*.pem >/dev/null 2>&1; then
        echo "⚠️  警告: SSL证书文件被git跟踪!"
        echo "   建议: 将 ssl/ 添加到 .gitignore"
        WARNINGS=$((WARNINGS+1))
    else
        echo "✅ SSL证书未被git跟踪（正确）"
    fi
else
    echo "ℹ️  未找到ssl目录或目录为空"
fi

# ============================================
# 检查3：环境变量配置
# ============================================
echo ""
echo "[检查3] 检查必要的环境变量..."

REQUIRED_VARS=("NODE_ENV" "MONGODB_URI" "JWT_SECRET")
for VAR in "${REQUIRED_VARS[@]}"; do
    if grep -q "$VAR" "$COMPOSE_FILE"; then
        echo "✅ $VAR 已配置"
    else
        echo "⚠️  警告: $VAR 未在 docker-compose.yml 中配置"
        WARNINGS=$((WARNINGS+1))
    fi
done

# ============================================
# 检查4：restart策略
# ============================================
echo ""
echo "[检查4] 检查容器重启策略..."

if grep -q "restart:" "$COMPOSE_FILE"; then
    echo "✅ 已配置 restart 策略"
else
    echo "⚠️  警告: 未配置 restart 策略（建议添加 restart: unless-stopped）"
    WARNINGS=$((WARNINGS+1))
fi

# ============================================
# 检查5：healthcheck（建议）
# ============================================
echo ""
echo "[检查5] 检查健康检查配置..."

if grep -q "healthcheck:" "$COMPOSE_FILE"; then
    echo "✅ 已配置 healthcheck"
else
    echo "ℹ️  建议为 backend 服务添加 healthcheck 配置"
fi

# ============================================
# 输出结果汇总
# ============================================
echo ""
echo "------------------------------------------"
echo "=========================================="
echo "📊 检查结果汇总"
echo "=========================================="
echo ""

if [ $ERRORS -gt 0 ]; then
    echo "❌ 发现 $ERRORS 个致命错误!"
    echo ""
    echo "请修复以上错误后再进行部署！"
    echo ""
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo "⚠️  发现 $WARNINGS 个警告（建议修复）"
    echo ""
    echo "可以继续部署，但建议先处理警告项"
    echo ""
    exit 0
else
    echo "✅ 所有检查通过！可以安全部署"
    echo ""
    exit 0
fi
