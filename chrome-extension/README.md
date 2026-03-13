# TAP TikTok Sync Chrome Extension

## 功能说明

这是一个用于从TikTok Partner Center同步样品数据到TAP系统的Chrome浏览器插件。

## 核心功能

1. **扫描页面数据** - 自动扫描TikTok Partner Center页面的样品数据
2. **同步到系统** - 将扫描的数据同步到TAP系统
3. **导出Excel** - 支持导出为CSV文件
4. **配置灵活** - 支持自定义API地址和Token

## 安装步骤

### 1. 开发模式安装

1. 下载或克隆此扩展到本地
2. 打开Chrome浏览器，访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `chrome-extension` 文件夹
6. 扩展安装完成

### 2. 准备图标文件

在 `chrome-extension/icons/` 目录下创建以下图标：
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

可以使用任何图片编辑工具创建，建议使用TAP系统的LOGO。

## 使用说明

### 1. 配置API

1. 点击浏览器工具栏中的扩展图标
2. 在设置中输入：
   - **TAP系统API地址**: `http://localhost:3000/api` (开发环境) 或部署后的生产环境地址
   - **API Token**: 从TAP系统登录后获取的JWT Token

3. 点击"保存设置"

### 2. 获取Token

登录TAP系统后，在浏览器开发者工具中：
1. 打开Application/存储 → Local Storage
2. 找到token字段
3. 复制Token值

### 3. 扫描数据

1. 访问TikTok Partner Center的样品管理页面
2. 点击扩展图标
3. 点击"扫描当前页面"按钮
4. 扩展会自动识别并提取页面中的样品数据

### 4. 同步数据

1. 扫描完成后，点击"同步到TAP系统"按钮
2. 扩展会自动将数据发送到TAP系统
3. 同步完成后会显示成功和失败的统计

### 5. 导出数据

如果需要手动处理，可以点击"导出为Excel"按钮导出CSV文件。

## 技术实现

### Content Script (`content.js`)

负责在TikTok Partner Center页面中：
- 扫描DOM元素提取样品数据
- 支持多种页面结构识别
- 实时解析TikTok ID、日期、状态等信息

### Popup (`popup.html` + `popup.js`)

插件主界面：
- 显示页面状态和API连接状态
- 提供扫描、同步、导出功能
- 配置API地址和Token

### Background (`background.js`)

后台服务：
- 监听扩展安装事件
- 处理扩展消息

### 样式 (`content.css`)

页面样式：
- 高亮识别的样品数据
- 显示扫描状态徽章

## 数据识别逻辑

插件会尝试多种方式识别TikTok Partner Center的样品数据：

1. **表格识别** - 查找 `<table>` 元素
2. **卡片识别** - 查找包含样品信息的卡片
3. **文本匹配** - 使用正则表达式提取关键信息

### 提取字段

- 达人名称
- TikTok ID (@username)
- 产品名称
- 申请日期
- 状态 (pending/approved/shipped/rejected/received)
- Campaign ID
- TikTok Sample ID

## API接口

插件使用TAP系统的样品管理API：

```http
POST /api/samples
Content-Type: application/json
Authorization: Bearer <token>

{
  "productId": "产品ID",
  "influencerId": "达人ID",
  "requestDate": "2024-01-01",
  ...
}
```

## 注意事项

1. **Token有效期** - JWT Token默认7天过期，过期后需要重新获取
2. **页面变动** - TikTok页面结构变化可能影响识别，需要更新content.js
3. **网络连接** - 确保能正常访问TAP系统的API地址
4. **数据匹配** - 同步时需要手动匹配产品和达人（插件提供基础信息）

## 安全说明

1. Token存储在Chrome本地存储中，不会上传到任何第三方
2. API地址和Token仅用于与TAP系统通信
3. 不会收集任何用户隐私数据

## 故障排查

### 无法扫描数据
- 确保在TikTok Partner Center页面
- 刷新页面后重试
- 检查页面是否完全加载

### 同步失败
- 检查API地址是否正确
- 确认Token是否有效
- 查看浏览器控制台错误信息

### Token过期
- 重新登录TAP系统
- 获取新的Token
- 更新插件设置

## 开发建议

如果需要适配新的页面结构：

1. 打开TikTok Partner Center样品页面
2. 在开发者工具中检查DOM结构
3. 修改 `content.js` 中的选择器和提取逻辑
4. 重新加载扩展测试

## License

MIT
