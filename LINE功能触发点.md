# LINE 推送功能触发点说明

> 整理时间：2026-07-20
> 适用范围：LazyFirst 后端 `server/` + 前端 `frontend/`
> 全局开关：`lineConfig.isConfigured`（来自 `server/config/line.js`，需 `.env` 配置 `LINE_CHANNEL_ACCESS_TOKEN` + `LINE_CHANNEL_SECRET` + `LINE_CHANNEL_ID`）。未配置时，所有主动推送均跳过，不影响主流程。

---

## 一、LINE 绑定引导（Binding Guide）

绑定引导由「用户加好友」和「发送绑定码」两条自动链路，加上「前端生成绑定码」入口组成。

### 1. 用户加 OA 好友（follow 事件）
- **触发位置**：`server/line/webhookHandler.js:43-65`
- **流程**：LINE 平台回调 webhook → `handleFollow` → 回复 `welcomeMessage`（欢迎语 Flex 卡）→ 若该用户已绑定角色，自动挂载对应 Rich Menu。
- **触发条件**：用户首次关注 LINE OA（无需任何操作，平台自动触发）。

### 2. 用户发送绑定码（message 事件）
- **触发位置**：`server/line/webhookHandler.js:67-134`
- **流程**：用户发来绑定码文本 → `bindingService.confirm` 写入 `lineUserId` → 回复 `boundSuccessCard`（绑定成功卡）+ `onboardingGuide`（新人引导文案）。
- **触发条件**：聊天消息能被 `bindingService.parseCode` 识别为有效绑定码。

### 3. 前端生成绑定码（BD 操作入口）
- **入口 A（达人）**：`frontend/src/views/influencer-managements/Index.vue:800-804` → `<LineBindingDialog role="influencer">`
- **入口 B（卖家/店铺联系人）**：`frontend/src/views/products/ShopTab.vue:250-252` → `<LineBindingDialog role="shopContact">`
- **弹窗组件**：`frontend/src/components/LineBindingDialog.vue`
- **后端接口**：`POST /api/line/binding-code`（`server/routes/line.js:108`）→ `bindingService.generateToken`
- **绑定码文案**：`flex.inviteCardText`（`server/line/flex.js:287`），含加好友链接 + 绑定码，由 BD 复制发给达人/卖家。

---

## 二、申样通知（Sample Notification）

### 触发位置
- **接口**：`POST /api/samples`
- **代码**：`server/routes/samples.js:558-586`
- **卡片**：
  - 卖家端 `sampleApprovalCard`（橙色，新申样待审批）→ push 给该产品所属店铺的 `ShopContact`（需其有 `lineUserId`）

### 触发条件
- `lineConfig.isConfigured && product?.shopId`（即 LINE 凭证已配置且商品归属店铺）
- 以 `setTimeout` 异步推送，不阻塞接口响应；推送失败仅记日志，不影响申样保存。

### 注意
- **仅通知卖家**。申样由达人主动发起，已移除对达人的确认推送（`sampleConfirmedCard` 不再调用）。
- **仅「创建申样」触发**。更新申样路由 `PUT /api/samples/:id` 目前**没有** LINE 推送逻辑。

---

## 三、活动推送（Campaign Push）— 人工手动触发

### 触发位置（手动按钮）
- **前端入口**：活动列表每行「LINE 推送」按钮 → `activities/Index.vue` 调 `LinePushDialog`（`frontend/src/components/LinePushDialog.vue`）
- **后端接口**：`POST /api/line/activity/:id/push`（`routes/line.js`）→ `pushService.sendCampaign`
- **卡片**：`productFlexCard`（活动商品卡，实际发送的是商品卡）
- **收件人**：按标签/品类/粉丝筛选的已绑定达人（`audienceService.getAudience`），经 multicast / narrowcast 分批。

### 触发条件
- 由 BD 在弹窗中选择受众（达人标签 / 适用品类 / 粉丝区间）后点击「确认推送」手动发起。
- 需在弹窗内先点「预估人数」确认有匹配受众。

### 变更说明
- **已移除创建招募时的自动推送**（原 `recruitments.js` 中的自动触发代码已删除），改为完全由人工按钮触发。

---

## 四、新品推送（New Product Push）— 人工手动触发

### 触发位置（手动按钮）
- **前端入口**：产品列表每行「新品推送到 LINE」按钮 → `ProductTab.vue` 调 `LineProductPushDialog`（`frontend/src/components/LineProductPushDialog.vue`），弹窗内选受众后推送。
- **后端接口**：`POST /api/line/product/:id/push`（`routes/line.js`）→ `pushService.sendProduct`
- **卡片**：`newProductCard`（紫色带图，新品推荐卡）
- **收件人**：按标签/品类/粉丝筛选的已绑定达人，经 multicast 分批。

### 触发条件
- 由 BD 在弹窗中选择受众后点击「确认推送」手动发起。
- 需先点「预估人数」确认有匹配受众。

### 变更说明
- **已移除创建/更新商品时的自动推送**（原 `products.js` 中的自动触发代码已删除），改为完全由人工按钮触发。

---

## 五、发送记录弹层（Line Push Records）

- **入口**：活动列表顶部「发送记录」按钮 → `activities/Index.vue` 调 `LinePushRecordsDialog`（`frontend/src/components/LinePushRecordsDialog.vue`）
- **数据来源**：`GET /api/line/push-records`（`routes/line.js`）→ `LinePushRecord` 集合（新建于 `server/models/LinePushRecord.js`）
- **内容**：每次「活动推送 / 新品推送」的发送时间、类型、推送对象、操作人、受众条件（标签/品类/粉丝）、送达人数、状态（成功/失败/部分失败）。
- **筛选**：全部 / 活动推送 / 新品推送 三个标签页。

> 注：每次手动推送（成功或失败）都会写入一条 `LinePushRecord`，用于该弹层展示。

---

## 六、相邻 LINE 能力（非上述自动触发，供参考）

1. **手动活动推送弹窗**：`frontend/src/views/activities/Index.vue:648-649` → `<LinePushDialog>`（`frontend/src/components/LinePushDialog.vue`）→ `pushService` 手动推。属于人工运营推送，非自动触发。
2. **关键词自动回复**：`webhookHandler.js:67-134` 识别 `政策/policy` → `policyFlexCard`；`客服/contact` → 客服文案。
3. **Rich Menu 自动挂载**：`follow` 与绑定成功后，按角色挂 `buildSupplyRichMenu` / `buildInfluencerRichMenu`（`server/line/richMenuService`）。

---

## 七、触发点速查表

| 功能 | 触发动作 | 接口/事件 | 文件:行 | 卡片 | 收件人 |
|---|---|---|---|---|---|
| 绑定引导-欢迎 | 加好友 | LINE follow 事件 | webhookHandler.js:43 | welcomeMessage | 加友用户 |
| 绑定引导-成功 | 发绑定码 | LINE message 事件 | webhookHandler.js:79 | boundSuccessCard + onboardingGuide | 绑定用户 |
| 绑定引导-生成码 | BD 点按钮 | POST /api/line/binding-code | routes/line.js:108 | inviteCardText | （生成码供复制） |
| 申样通知 | 创建申样 | POST /api/samples | samples.js:558 | sampleApprovalCard | 卖家（仅） |
| 活动推送 | BD 点按钮 | POST /api/line/activity/:id/push | routes/line.js | productFlexCard | 按标签筛选的绑定达人 |
| 新品推送 | BD 点按钮 | POST /api/line/product/:id/push | routes/line.js | newProductCard | 按标签筛选的绑定达人 |
| 发送记录 | 活动页顶部按钮 | GET /api/line/push-records | routes/line.js | — | — |

> 注：活动推送与新品推送均为**人工手动按钮**触发（已移除自动推送）。申样通知仅推送给卖家。
