# 多阶段构建 - 后端
FROM node:18-alpine AS backend

WORKDIR /app

# 复制后端代码
COPY server/package*.json ./server/
COPY server ./server

# 安装依赖
WORKDIR /app/server
RUN npm ci --only=production

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["npm", "start"]
