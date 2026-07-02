# Chrome Extension 测试指南

## 测试步骤

### 1. 加载扩展

1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"（右上角）
4. 点击"加载已解压的扩展程序"
5. 选择 `tiktok-extension` 目录

### 2. 登录

1. 点击Chrome工具栏上的LazyFirst图标
2. 输入API地址（本地：`http://localhost:3001/api`）
3. 输入用户名和密码
4. 点击"登录"

**预期结果**：
- 登录成功，显示用户信息
- 显示"今日同步"和"最后同步"数据

**可能的问题**：
- 如果登录失败，检查：
  - API地址是否正确
  - 用户名和密码是否正确
  - LazyFirst后端是否运行
  - CORS是否配置正确

### 3. 测试搜索页数据采集

1. 打开TikTok搜索页（例如：`https://www.tiktok.com/search?q=beauty`）
2. 等待页面加载完成
3. 检查是否有"导入到LazyFirst"按钮出现在视频卡片上

**预期结果**：
- 每个视频卡片上应该有一个"导入到LazyFirst"按钮
- 点击按钮后，应该调用Background API同步数据

**可能的问题**：
- 如果没有按钮出现，检查：
  - Content Script是否成功注入（查看Console日志）
  - DOM选择器是否正确（TikTok可能已改版）
  - 页面是否完全加载

### 4. 测试达人主页数据采集

1. 打开一个达人主页（例如：`https://www.tiktok.com/@username`）
2. 等待页面加载完成
3. 检查是否有覆盖层或"导入到LazyFirst"按钮

**预期结果**：
- 如果达人已存在于LazyFirst，显示历史数据覆盖层
- 如果达人不存在，显示"导入到LazyFirst"按钮

**可能的问题**：
- 如果没有覆盖层或按钮，检查：
  - Content Script是否成功注入
  - DOM选择器是否正确
  - API调用是否成功

### 5. 测试数据同步

1. 在搜索页或达人主页点击"导入到LazyFirst"按钮
2. 检查是否显示成功消息
3. 登录LazyFirst系统，检查达人是否已创建或更新

**预期结果**：
- 显示"导入成功"消息
- LazyFirst系统中出现新的达人记录或维护记录

**可能的问题**：
- 如果同步失败，检查：
  - Token是否有效
  - API端点是否正确
  - 网络请求是否成功（查看Background Console）

## 调试技巧

### 查看Console日志

1. **Popup Console**：
   - 右键点击LazyFirst图标
   - 选择"检查弹出窗口"
   - 查看Console标签

2. **Background Console**：
   - 访问 `chrome://extensions/`
   - 找到LazyFirst扩展
   - 点击"服务工作进程"（Service Worker）
   - 查看Console标签

3. **Content Script Console**：
   - 打开TikTok页面
   - 按F12打开开发者工具
   - 查看Console标签

### 常见错误

1. **CORS错误**：
   - 错误：`Access-Control-Allow-Origin`
   - 解决：在LazyFirst后端配置CORS

2. **Token过期**：
   - 错误：`401 Unauthorized`
   - 解决：重新登录获取新Token

3. **DOM选择器失效**：
   - 错误：`Cannot read property 'querySelector' of null`
   - 解决：更新 `content.js` 中的选择器

## 下一步

完成测试后，继续完善功能：

- [ ] 优化DOM选择器（根据实际测试结果）
- [ ] 添加批量导入功能
- [ ] 添加本地缓存
- [ ] 优化用户体验
- [ ] 编写完整文档
