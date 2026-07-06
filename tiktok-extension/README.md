# LazyFirst TikTok 数据采集器

Chrome扩展程序，在浏览TikTok时自动采集达人数据并同步到LazyFirst系统。

## 功能特性

- 🎯 **智能识别页面**：自动识别搜索页、达人主页、视频详情页
- 🚀 **一键导入**：快速将达人数据导入LazyFirst系统
- 📦 **批量导入**：搜索页多选达人，一次性批量导入
- 📊 **历史数据展示**：在TikTok页面直接查看LazyFirst系统中的历史数据
- 🔄 **自动更新**：自动添加维护记录，跟踪达人数据变化
- 💾 **本地缓存**：减少API调用，提升响应速度
- 🔐 **一次登录**：7天无感使用，Token自动管理

## 快速开始

### 安装扩展

1. 打开Chrome浏览器，访问 `chrome://extensions/`
2. 启用「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `tiktok-extension` 文件夹

### 登录系统

1. 点击Chrome工具栏中的扩展图标
2. 输入API地址、用户名、密码
3. 点击「登录」

详细说明请查看 [INSTALL.md](INSTALL.md)

## 使用方法

### 搜索页批量导入

1. 打开TikTok搜索页
2. 勾选要导入的达人
3. 点击「批量导入到LazyFirst」

### 达人主页/视频页一键导入

1. 打开达人主页或视频详情页
2. 点击「导入到LazyFirst」按钮

## 技术架构

- **Manifest V3**：Chrome扩展最新规范
- **Content Scripts**：注入TikTok页面，解析DOM数据
- **Background Service Worker**：处理API调用、Token管理
- **Chrome Storage API**：本地存储Token和配置

## 开发文档

- [安装指南](INSTALL.md) - 详细的安装和使用说明
- [测试指南](TESTING.md) - 测试方案和常见问题

## 支持

如有问题，请查看安装指南或联系开发团队。
