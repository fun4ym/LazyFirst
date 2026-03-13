# TAP系统前端

基于 Vue 3 + Vite + Element Plus 构建的现代化前端应用

## 技术栈

- Vue 3 (Composition API)
- Vite
- Vue Router
- Pinia (状态管理)
- Element Plus (UI组件库)
- Axios (HTTP请求)
- Chart.js (图表)

## 开发

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:5173

### 构建生产版本
```bash
npm run build
```

## 项目结构

```
src/
├── views/              # 页面组件
│   ├── Login.vue     # 登录页
│   ├── Dashboard.vue # 数据概览
│   ├── influencers/  # 达人管理
│   ├── samples/      # 样品管理
│   ├── orders/       # 订单管理
│   └── commissions/  # 分润管理
├── layouts/           # 布局组件
│   └── MainLayout.vue
├── router/            # 路由配置
├── stores/            # Pinia状态管理
│   └── auth.js       # 认证状态
├── utils/             # 工具函数
│   └── request.js    # Axios封装
├── App.vue            # 根组件
└── main.js            # 入口文件
```

## 功能模块

- 登录认证
- 数据概览
- 达人管理（公海/私海池）
- 样品申请管理
- 订单管理
- 分润管理
