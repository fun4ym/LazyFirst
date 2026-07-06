# LazyFirst TikTok 数据采集器 - 安装指南

## 功能简介

这是一款Chrome扩展程序，可以在浏览TikTok时自动采集达人数据并同步到LazyFirst系统。

### 核心功能
- ✅ 自动识别TikTok页面（搜索页、达人主页、视频详情页）
- ✅ 一键导入达人到LazyFirst系统
- ✅ 批量导入功能（搜索页多选）
- ✅ 显示LazyFirst系统中的历史数据
- ✅ 自动更新维护记录
- ✅ 本地缓存减少API调用
- ✅ 一次登录，7天无感使用

## 安装步骤

### 1. 加载扩展到Chrome

1. 打开Chrome浏览器
2. 在地址栏输入：`chrome://extensions/`
3. 右上角启用「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择 `tiktok-extension` 文件夹
6. 扩展加载成功，图标会出现在Chrome工具栏

### 2. 登录LazyFirst系统

1. 点击Chrome工具栏中的扩展图标
2. 在弹出的窗口中输入：
   - **API地址**：`http://localhost:3001/api`（本地开发）或生产环境地址
   - **用户名**：你的LazyFirst用户名
   - **密码**：你的密码
3. 点击「登录」按钮
4. 登录成功后会显示你的用户信息

### 3. 配置选项（可选）

1. 点击Popup中的「设置」按钮
2. 或者在扩展管理页面点击「详细信息」→「扩展选项」
3. 配置以下选项：
   - API地址
   - 启用/禁用功能
   - 清除缓存
   - 重置设置

## 使用方法

### 搜索页批量导入

1. 打开TikTok搜索页（如 `https://www.tiktok.com/search?q=test`）
2. 页面右上角会出现「批量导入到LazyFirst」按钮
3. 每个视频卡片左上角会出现复选框
4. 勾选要导入的达人
5. 点击「批量导入到LazyFirst」按钮
6. 等待导入完成，会显示成功/失败数量

### 达人主页一键导入

1. 打开任意达人主页（如 `https://www.tiktok.com/@username`）
2. 页面右上角会出现「导入到LazyFirst」按钮
3. 如果达人已存在于LazyFirst系统，会显示历史数据覆盖层
4. 点击「导入到LazyFirst」或「更新数据」按钮

### 视频详情页一键导入

1. 打开任意视频详情页（如 `https://www.tiktok.com/@username/video/123456`）
2. 页面右上角会出现「导入到LazyFirst」按钮
3. 操作同达人主页

## 常见问题

### 1. 扩展图标不显示
- 检查是否已启用扩展
- 检查Chrome工具栏是否隐藏了扩展图标（点击拼图图标查看）

### 2. 登录失败
- 检查API地址是否正确（必须以 `http://` 或 `https://` 开头）
- 检查用户名和密码是否正确
- 检查网络连接是否正常

### 3. 导入失败
- 检查是否已登录
- 检查API地址是否正确
- 检查LazyFirst系统是否正常运行
- 查看Chrome控制台错误信息（右键→检查→Console）

### 4. 页面没有显示按钮
- 检查当前页面是否是TikTok页面（`https://www.tiktok.com/*`）
- 刷新页面重试
- 检查扩展是否正常启用

### 5. 批量导入无响应
- 检查是否选择了要导入的达人
- 检查网络连接
- 查看Console错误信息

## 开发调试

### 查看日志

1. **Background Service Worker日志**
   - 在 `chrome://extensions/` 页面点击扩展的「服务工作进程」链接
   
2. **Content Script日志**
   - 在TikTok页面右键→检查
   - 打开Console标签页
   
3. **Popup日志**
   - 右键点击扩展图标→检查弹出窗口
   - 打开Console标签页

### 修改代码后重新加载

1. 在 `chrome://extensions/` 页面找到本扩展
2. 点击「重新加载」按钮
3. 刷新TikTok页面

## 技术架构

- **Manifest V3**：Chrome扩展最新规范
- **Content Scripts**：注入TikTok页面，解析DOM数据
- **Background Service Worker**：处理API调用、Token管理、数据同步
- **Chrome Storage**：本地存储Token和配置
- **MutationObserver**：监听TikTok SPA页面变化

## 文件结构

```
tiktok-extension/
├── manifest.json          # 扩展配置
├── popup/                 # 弹窗页面
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/               # 设置页面
│   ├── options.html
│   ├── options.js
│   └── options.css
├── background/            # 后台服务
│   └── background.js
├── content/               # 内容脚本
│   ├── content.js
│   └── content.css
├── utils/                 # 工具函数
└── assets/                # 资源文件
    └── icons/
        ├── icon16.png
        ├── icon48.png
        └── icon128.png
```

## 支持

如有问题，请联系开发团队或查看项目文档。
