# LazyFirst TikTok 数据采集器

Chrome Extension for LazyFirst system to collect TikTok influencer data.

## 功能特性

- ✅ 自动采集TikTok达人数据（搜索页、达人主页、视频详情页）
- ✅ 一键同步到LazyFirst系统
- ✅ 显示LazyFirst历史数据（GMV、FV等指标）
- ✅ 一次登录，永久无感（JWT Token自动管理）

## 安装方法

1. 打开Chrome浏览器，进入 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `tiktok-extension` 目录

## 使用方法

### 1. 登录

- 点击Chrome工具栏上的LazyFirst图标
- 输入LazyFirst系统的API地址、用户名和密码
- 点击"登录"

### 2. 浏览TikTok

- 访问TikTok搜索页、达人主页或视频详情页
- 插件会自动检测达人信息
- 如果达人已存在于LazyFirst，会显示历史数据
- 如果达人不存在，会显示"导入到LazyFirst"按钮

### 3. 同步数据

- 点击"导入到LazyFirst"按钮，将数据同步到系统
- 插件会自动检查达人是否存在，存在则更新维护记录，不存在则创建新达人

## 配置说明

### API地址

- 本地开发：`http://localhost:3001/api`
- 生产环境：`https://your-domain.com/api`

### 设置选项

- 自动同步：开启后，浏览TikTok时自动同步达人数据
- 显示覆盖层：在TikTok页面上显示LazyFirst历史数据
- 显示GMV/FV标签：在达人信息上显示GMV/FV标签

## 文件结构

```
tiktok-extension/
├── manifest.json              # 插件配置
├── popup/                    # 弹出窗口
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/                  # 设置页面
│   ├── options.html
│   ├── options.js
│   └── options.css
├── content/                  # 内容脚本
│   ├── content.js
│   ├── content.css
│   ├── pages/               # 页面处理逻辑
│   └── components/          # UI组件
├── background/               # 后台服务
│   ├── background.js
│   ├── auth.js
│   ├── api.js
│   └── sync.js
├── utils/                   # 工具函数
│   ├── constants.js
│   ├── storage.js
│   └── parser.js
└── assets/                  # 静态资源
    └── icons/
```

## 注意事项

### 图标文件

⚠️ 当前使用的是SVG占位符图标，需要替换为实际的PNG图标文件：

- `assets/icons/icon16.png` (16x16)
- `assets/icons/icon48.png` (48x48)
- `assets/icons/icon128.png` (128x128)

可以使用任何图片编辑工具创建这些图标，或者使用在线工具生成。

### CORS配置

确保LazyFirst后端已配置CORS，允许Chrome Extension跨域请求：

```javascript
// server.js
const cors = require('cors');
app.use(cors({
  origin: '*'
}));
```

### TikTok页面改版

TikTok可能会改版页面结构，导致DOM选择器失效。如果遇到问题，需要更新 `utils/constants.js` 中的选择器。

## 开发计划

- [x] Phase 1: 项目初始化
- [x] Phase 2: 认证功能
- [ ] Phase 3: 搜索页数据采集
- [ ] Phase 4: 达人主页数据采集
- [ ] Phase 5: 数据同步逻辑
- [ ] Phase 6: 性能优化
- [ ] Phase 7: 测试与文档

## 技术栈

- Chrome Extension Manifest V3
- Vanilla JavaScript
- Chrome Storage API
- Fetch API

## 许可证

MIT License
