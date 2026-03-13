# Excel导入问题排查指南

## 问题描述
导入Excel文件时提示：
- "服务器错误，请稍后重试"
- "处理导入数据失败"
- 控制台显示 500 Internal Server Error

## 解决方案

### 1. 重启服务器（必须）

服务器可能还在运行旧代码，需要重启以加载新安装的 `xlsx` 模块。

**方法A：手动重启**
```bash
# 1. 停止当前服务器
# 在运行服务器的终端按 Ctrl+C

# 2. 重新启动
cd /Users/mor/CodeBuddy/LazyFirst/server
npm run dev
```

**方法B：使用重启脚本**
```bash
cd /Users/mor/CodeBuddy/LazyFirst
./restart-server.sh
```

### 2. 验证模块安装

确认 `xlsx` 模块已正确安装：
```bash
cd /Users/mor/CodeBuddy/LazyFirst/server
npm ls xlsx
```

应该看到输出：`xlsx@0.18.5`

如果未安装，运行：
```bash
npm install xlsx
```

### 3. 检查服务器日志

重启服务器后，观察控制台输出，查找以下日志：
- `Import request received` - 收到导入请求
- `File received: /path/to/file filename.xlsx` - 文件接收成功
- `Reading Excel file...` - 开始读取Excel
- `Excel file parsed, found X rows` - Excel解析成功
- `Import completed: {success: X, failed: Y}` - 导入完成

如果看到错误，请记录完整的错误信息。

### 4. 使用调试工具

我创建了调试页面来帮助诊断问题：

**访问：** `file:///Users/mor/CodeBuddy/LazyFirst/test-import-debug.html`

或者通过Web服务器访问（如果前端运行中）：
`http://localhost:5173/test-import-debug.html`

**使用步骤：**
1. 点击"从LocalStorage加载"按钮获取Token
2. 选择Excel文件
3. 点击"上传"按钮
4. 查看上传结果和错误信息
5. 点击"查询最近10条订单"验证数据是否保存到数据库

### 5. 检查数据库连接

确保MongoDB正在运行：
```bash
# 如果使用本地MongoDB
ps aux | grep mongod

# 如果使用MongoDB Atlas
# 检查 .env 文件中的 MONGODB_URI 配置
```

### 6. 检查权限

确保uploads目录有写入权限：
```bash
ls -la /Users/mor/CodeBuddy/LazyFirst/server/uploads
```

### 7. Excel文件格式检查

确保Excel文件：
- 文件格式：`.xlsx` 或 `.xls`
- 第一行包含所有必需的字段名（中文）
- 不要有隐藏的合并单元格
- 数据行数不超过系统限制（默认10MB）

**必需的字段：**
- 订单ID
- 子订单ID
- 达人用户名
- 商品名称
- SKU
- 商品ID
- 商品价格
- 下单件数
- 店铺名称
- 店铺代码
- 订单状态
- （以及所有佣金相关字段...）

## 唯一性规则

系统使用 **"订单ID + 子订单ID"** 作为唯一标识：

- **新增**：如果数据库中不存在该组合，则创建新记录
- **更新**：如果数据库中已存在该组合，则更新该记录的所有字段
- **跳过**：如果行中没有订单ID，则跳过该行

## 预期的成功响应

成功导入时，前端应显示：
```
导入完成：成功 X 条，失败 Y 条
```

后端返回的JSON结构：
```json
{
  "success": true,
  "message": "导入完成：成功 2 条，失败 0 条",
  "data": {
    "success": 2,
    "failed": 0,
    "errors": []
  }
}
```

## 常见错误及解决

### 错误：xlsx module not found
**原因：** xlsx模块未安装或服务器未重启
**解决：**
1. 运行 `npm install xlsx`
2. 重启服务器

### 错误：处理导入数据失败
**原因：** 服务器还在运行旧代码
**解决：** 重启服务器

### 错误：Please upload Excel file
**原因：** 文件未正确上传
**解决：**
- 检查文件大小是否超过10MB
- 检查网络连接
- 查看浏览器Network标签确认请求是否发送

### 错误：订单ID为空
**原因：** Excel中有空行或格式错误
**解决：**
- 检查Excel文件，确保所有数据行都有订单ID
- 删除空行或标题行
- 确保第一行是中文标题

### 错误：连接数据库失败
**原因：** MongoDB未运行或连接字符串错误
**解决：**
- 启动MongoDB服务
- 检查 `.env` 文件配置
- 确认数据库端口（默认27017）未被占用

## 验证数据导入

导入成功后，可以通过以下方式验证：

1. **前端页面**：刷新 `http://localhost:5173/report-orders` 查看数据
2. **调试工具**：使用调试页面的"查询数据库"功能
3. **MongoDB客户端**：直接查询 `reportorders` 集合

## 联系支持

如果以上步骤都无法解决问题，请提供：
1. 服务器控制台的完整错误日志
2. 浏览器控制台的错误信息
3. Network标签中请求的详细信息
4. 您的Excel文件截图（前几行）
