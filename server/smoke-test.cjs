/* 本地全方位冒烟测试（可重复跑）
 * 用法: cd server && NODE_ENV=test node smoke-test.cjs [轮数=3]
 *
 * 机制: NODE_ENV=test 时 server.js 不会自动 listen；本脚本用 supertest 对 app 直接发请求，
 *       连接本地 MongoDB(tap_system)，每轮注册测试用户→登录→跑全量接口→清理，不触碰线上。
 * 覆盖: 健康检查 / 注册登录 / /auth/me / 全量受保护 GET 列表扫描(无500) / 公开接口(免token) /
 *       写操作闭环(POST→GET:id→PUT→DELETE) / 参数校验(400) / 鉴权(无token&错误token401) /
 *       数据落地验证(batch-videos)。
 */
const connectDB = require('./config/database')
const app = require('./server')
const request = require('supertest')
const mongoose = require('mongoose')
const User = require('./models/User')
const TiktokExtensionData = require('./models/TiktokExtensionData')
const Company = require('./models/Company')
const Shop = require('./models/Shop')
const Department = require('./models/Department')
const Role = require('./models/Role')
const ReportOrder = require('./models/ReportOrder')
const Commission = require('./models/Commission')

const API = '/api'

// 禁用 http keep-alive：supertest 为每个 app 起临时 server，superagent 默认复用 socket，
// 长序列请求下偶发 ECONNRESET(socket hang up)。关闭复用后从根上规避该测试基础设施抖动。
const http = require('http')
const https = require('https')
if (http.globalAgent) http.globalAgent.keepAlive = false
if (https.globalAgent) https.globalAgent.keepAlive = false
let pass = 0
let fail = 0
const fails = []
const infos = []
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name) }
  else { fail++; const info = extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 200) : ''; fails.push(name + info); console.log('  ✗ ' + name + info) }
}
function info(name, extra) { infos.push(name); console.log('  · ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 120) : '')) }

// 受保护资源型路由前缀（带 token 扫描根 GET）
const PROTECTED_PREFIXES = [
  'users', 'roles', 'departments', 'influencer-managements', 'products',
  'activities', 'orders', 'commissions', 'samples', 'performance',
  'report-orders', 'commission-rules', 'base-data', 'bd-daily', 'shops',
  'suppliers', 'product-stats', 'recruitments', 'videos', 'ai-models',
  'digital-humans', 'product-media', 'ai-maker', 'tiktok-extension-data',
  'system-models', 'initialization', 'init-import'
]

async function round(r) {
  console.log(`\n=== 第 ${r} 轮 ===`)
  const suffix = Date.now() + '_' + r
  const uname = 'smoke_' + suffix
  const tt = 'smoke_tt_' + suffix

  // 复用/创建真实 Company（authenticate 会 populate companyId，不存在会变为 null）
  let company = await Company.findOne().sort({ _id: 1 })
  if (!company) company = await Company.create({ name: 'smoke_co_' + suffix, status: 'active' })
  const companyId = company._id.toString()

  // ---- A. 健康检查 & 认证 ----
  let res = await request(app).get('/health')
  check('T01 /health 200', res.status === 200, res.status)

  res = await request(app).post(API + '/auth/register').send({
    username: uname, password: 'test123456', realName: 'Smoke', phone: '13800000000', companyId
  })
  check('T02 register 201', res.status === 201, res.status)

  res = await request(app).post(API + '/auth/login').send({ username: uname, password: 'test123456' })
  check('T03 login 200+token', res.status === 200 && !!res.body?.data?.token, res.status)
  const token = res.body?.data?.token
  const auth = token ? { Authorization: 'Bearer ' + token } : {}

  res = await request(app).get(API + '/auth/me').set(auth)
  check('T03b /auth/me 200', res.status === 200 && !!res.body?.data?.user, res.status)

  // ---- B. 全量受保护 GET 列表扫描（带 token，禁 500/401） ----
  for (const p of PROTECTED_PREFIXES) {
    res = await request(app).get(API + '/' + p).set(auth)
    if (res.status === 200 || res.status === 400) check(`T-B GET /${p} 200/400(接口正常)`, true)
    else if (res.status === 404) info(`T-B GET /${p} → 404(该前缀无根GET,设计如此)`)
    else check(`T-B GET /${p} 无崩溃`, res.status !== 500 && res.status !== 401, res.status)
  }
  // dashboard 仅有子路径
  res = await request(app).get(API + '/dashboard/bd-stats').set(auth)
  check('T-B2 GET /dashboard/bd-stats 200', res.status === 200, res.status)

  // ---- C. 公开接口（免 token） ----
  res = await request(app).get(API + '/public/base-data/list')
  check('T-C1 public/base-data/list 免token 200', res.status === 200, res.status)

  res = await request(app).get(API + '/public/samples')
  check('T-C2 public/samples 缺参数 400', res.status === 400, res.status)

  res = await request(app).get(API + '/public/samples?s=NONEXIST_CODE_xyz')
  check('T-C3 public/samples 无效识别码 404', res.status === 404, res.status)

  // 构造测试 Shop 验证公开样品真实链路
  const shop = await Shop.create({
    companyId, shopName: 'smoke_shop_' + suffix, shopNumber: 'smoke_no_' + suffix,
    identificationCode: 'SMOKE_' + suffix
  })
  res = await request(app).get(API + '/public/samples?s=SMOKE_' + suffix)
  check('T-C4 public/samples 有效识别码 200', res.status === 200 && res.body?.success === true, res.status)
  await Shop.deleteOne({ _id: shop._id })

  res = await request(app).get(API + '/public/products')
  check('T-C5 public/products 免token(非401)', res.status !== 401, res.status)
  res = await request(app).get(API + '/public/recruitment')
  check('T-C6 public/recruitment 免token(非401)', res.status !== 401, res.status)
  res = await request(app).get(API + '/public/videos')
  check('T-C7 public/videos 免token(非401)', res.status !== 401, res.status)

  // ---- D. 写操作闭环：departments ----
  res = await request(app).post(API + '/departments').set(auth).send({ name: 'D_' + suffix, description: 'smoke dept' })
  check('T-D1 POST /departments 201', res.status === 201 && !!res.body?.data?.department, res.status)
  const deptId = res.body?.data?.department?._id
  if (deptId) {
    res = await request(app).get(API + '/departments/' + deptId).set(auth)
    check('T-D2 GET /departments/:id 200', res.status === 200, res.status)
    res = await request(app).put(API + '/departments/' + deptId).set(auth).send({ name: 'D2_' + suffix, description: 'updated' })
    check('T-D3 PUT /departments/:id 200', res.status === 200, res.status)
    res = await request(app).delete(API + '/departments/' + deptId).set(auth)
    check('T-D4 DELETE /departments/:id 200', res.status === 200, res.status)
    res = await request(app).get(API + '/departments/' + deptId).set(auth)
    check('T-D5 GET 已删 /departments/:id 404', res.status === 404, res.status)
  }

  // ---- D2. 写操作闭环：roles ----
  res = await request(app).post(API + '/roles').set(auth).send({ name: 'R_' + suffix, description: 'smoke role', permissions: [] })
  check('T-E1 POST /roles 201', res.status === 201 && !!res.body?.data?.role, res.status)
  const roleId = res.body?.data?.role?._id
  if (roleId) {
    res = await request(app).get(API + '/roles/' + roleId).set(auth)
    check('T-E2 GET /roles/:id 200', res.status === 200, res.status)
    res = await request(app).put(API + '/roles/' + roleId).set(auth).send({ name: 'R2_' + suffix, description: 'updated' })
    check('T-E3 PUT /roles/:id 200', res.status === 200, res.status)
    res = await request(app).delete(API + '/roles/' + roleId).set(auth)
    check('T-E4 DELETE /roles/:id 200', res.status === 200, res.status)
  }

  // ---- F. 参数校验 ----
  res = await request(app).post(API + '/departments').set(auth).send({ description: '缺name' })
  check('T-F1 departments 缺name 400', res.status === 400, res.status)
  res = await request(app).post(API + '/roles').set(auth).send({ name: 'x', description: 'y' })
  check('T-F2 roles 缺permissions数组 400', res.status === 400, res.status)
  res = await request(app).post(API + '/tiktok-extension-data/batch-videos').set(auth).send({ videos: [{ id: 'x' }] })
  check('T-F3 batch-videos 缺tiktokId 400', res.status === 400, res.status)
  res = await request(app).post(API + '/tiktok-extension-data/batch-videos').set(auth).send({ tiktokId: tt })
  check('T-F4 batch-videos 缺videos 400', res.status === 400, res.status)

  // ---- G. 数据落地（重点） ----
  res = await request(app).post(API + '/tiktok-extension-data/batch-videos').set(auth).send({
    tiktokId: tt, videos: [{ id: 'v1', title: '测试视频' }, { id: 'v2', title: '视频2' }]
  })
  check('T-G1 batch-videos 201', res.status === 201 && res.body?.success === true, res.status)
  const rec = await TiktokExtensionData.findOne({ companyId, tiktokId: tt })
  check('T-G2 视频落地 rawData.videos(2)', !!rec && Array.isArray(rec.rawData?.videos) && rec.rawData.videos.length === 2, rec && rec.rawData)

  // ---- H. 鉴权：无 token & 错误 token ----
  res = await request(app).get(API + '/samples')
  check('T-H1 无token 401', res.status === 401, res.status)
  res = await request(app).get(API + '/departments').set({ Authorization: 'Bearer invalid.token.here' })
  check('T-H2 错误token 401', res.status === 401, res.status)

  // ---- I. 订单合并回归（阶段三：Order→ReportOrder 单表收敛） ----
  const orderNo = 'SMOKE_ORDER_' + suffix
  res = await request(app).post(API + '/orders').set(auth).send({
    orderNo, totalAmount: 100, commissionRate: 0.1, currency: 'USD', status: 'completed', influencerUsername: 'smoke_influencer'
  })
  check('T-I1 POST /orders 201(写入ReportOrder)', res.status === 201 && !!res.body?.data?.order, res.status)
  const createdOrderId = res.body?.data?.order?._id
  const createdSummary = res.body?.data?.order?.summaryDate
  check('T-I2 创建订单含 summaryDate(兜底今日)', !!createdSummary, createdSummary)
  if (createdOrderId) {
    res = await request(app).get(API + '/orders?orderNo=' + orderNo).set(auth)
    const found = res.body?.data?.orders?.find(o => o._id === createdOrderId)
    check('T-I3 GET /orders 查到刚创建订单(ReportOrder存储)', res.status === 200 && !!found, res.status)
    // calculate 应能从 ReportOrder 读到该订单（influencerId 为空 → 404 达人不存在，非500即链路通）
    res = await request(app).post(API + '/commissions/calculate').set(auth).send({ orderId: createdOrderId })
    check('T-I4 POST /commissions/calculate 非500(ReportOrder读取链路)', res.status !== 500 && res.status !== 401, res.status)
    await Commission.deleteMany({ orderId: createdOrderId })
  }
  await ReportOrder.deleteMany({ orderNo })

  // ---- 清理 ----
  await TiktokExtensionData.deleteMany({ companyId, tiktokId: tt })
  await User.deleteOne({ username: uname })
  console.log('  清理完成')
}

;(async () => {
  const rounds = parseInt(process.argv[2] || '3', 10)
  await connectDB()
  for (let r = 1; r <= rounds; r++) {
    try { await round(r) } catch (e) { fail++; fails.push('轮' + r + ' 异常: ' + e.message); console.error('轮' + r + ' 异常', e) }
    // 轮间留白，避免 supertest 与本地 MongoDB 长连接在高并发顺序请求下的偶发 socket hang up
    if (r < rounds) await new Promise((res) => setTimeout(res, 600))
  }
  await mongoose.disconnect()
  console.log(`\n==== 汇总 ====  通过 ${pass} / 失败 ${fail}  (info ${infos.length})`)
  if (fail) { console.log('失败项:'); fails.forEach((f) => console.log('  - ' + f)) }
  process.exit(fail ? 1 : 0)
})()
