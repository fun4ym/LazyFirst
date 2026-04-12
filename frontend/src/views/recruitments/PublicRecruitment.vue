<template>
  <div class="public-recruitment-page">
    <!-- 加载中 -->
    <div v-if="loading" class="loading-container">
      <el-icon class="loading-spin" :size="40"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <!-- 错误提示 -->
    <div v-else-if="error" class="error-container">
      <el-result icon="error" title="访问失败" :sub-title="error">
        <template #extra>
          <el-button type="primary" @click="loadData">重试</el-button>
        </template>
      </el-result>
    </div>

    <!-- 正常内容 -->
    <div v-else-if="recruitment" class="content-container">
      <!-- 1. 顶部色块 -->
      <div class="hero-section" :style="{ backgroundColor: themeColor }">
        <div class="hero-text">
          <div class="hero-line1">LazyFirst Co., Ltd.</div>
          <div class="hero-line2">บริษัท TAP ในประเทศไทยที่ได้รับการรับรองจาก TikTok</div>
        </div>
        <img src="/logo.png" alt="Logo" class="hero-logo" />
      </div>

      <!-- 2. 招募信息卡片（主题色描边，白底黑字） -->
      <div class="info-card" :style="{ borderColor: themeColor }">
        <h1 class="info-name">{{ recruitment.name }}</h1>
        <p v-if="recruitment.description" class="info-desc">{{ recruitment.description }}</p>
      </div>

      <!-- 3. 达人要求卡片（主题色底，无标题文字） -->
      <div class="req-card" :style="{ backgroundColor: themeColor }">
        <div class="req-grid">
          <div class="req-item">
            <div class="req-label" :style="{ color: themeColor }">GMV</div>
            <div class="req-value">{{ recruitment.requirementGmv > 0 ? recruitment.requirementGmv.toLocaleString() : '-' }}</div>
          </div>
          <div class="req-item">
            <div class="req-label" :style="{ color: themeColor }">ผู้ติดตาม</div>
            <div class="req-value">{{ recruitment.requirementFollowers > 0 ? recruitment.requirementFollowers + 'K' : '-' }}</div>
          </div>
          <div class="req-item">
            <div class="req-label" :style="{ color: themeColor }">ยอดขาย/เดือน</div>
            <div class="req-value">{{ recruitment.requirementMonthlySales > 0 ? recruitment.requirementMonthlySales.toLocaleString() : '-' }}</div>
          </div>
          <div class="req-item">
            <div class="req-label" :style="{ color: themeColor }">วิวเฉลี่ย</div>
            <div class="req-value">{{ recruitment.requirementAvgViews > 0 ? recruitment.requirementAvgViews.toLocaleString() : '-' }}</div>
          </div>
        </div>
      </div>

      <!-- 4. 产品卡片（无标题文字，主题色边框） -->
      <div class="products-card" :style="{ borderColor: themeColor }">
        <div v-if="recruitment.products && recruitment.products.length > 0" class="product-list">
          <div v-for="prod in recruitment.products" :key="prod._id" class="product-card">
            <!-- 顶部：第一张图 + 名称/ID -->
            <div class="prod-top-row">
              <div v-if="prod.images && prod.images.length > 0" class="prod-main-img-wrap">
                <img :src="prod.images[0]" class="prod-main-img" />
              </div>
              <div class="prod-info">
                <a v-if="getDefaultActivityLink(prod)" :href="getDefaultActivityLink(prod)" target="_blank" class="prod-name prod-name-link">{{ prod.name }}</a>
                <div v-else class="prod-name">{{ prod.name }}</div>
                <div class="prod-id" :style="{ color: themeColor }">{{ prod.tiktokProductId || prod.sku || '-' }}</div>
              </div>
            </div>
            <!-- 更多图片（第2张起） -->
            <div v-if="prod.images && prod.images.length > 1" class="prod-images-scroll">
              <img v-for="(img, idx) in prod.images.slice(1)" :key="idx" :src="img" class="prod-img-thumb" />
            </div>
            <div class="prod-rates">
              <div class="rate-item">
                <span class="rate-label">คอมมิชชันหน้าร้าน</span>
                <span class="rate-value rate-line">{{ formatRate(getProductSquareRate(prod)) }}</span>
              </div>
              <div class="rate-item">
                <span class="rate-label">รายได้โปรโมท</span>
                <span class="rate-value rate-promo">{{ formatRate(getProductPromoRate(prod)) }}</span>
              </div>
              <div v-if="calcExtra(prod) > 0" class="rate-item rate-extra-item">
                <span class="extra-badge">+{{ calcExtra(prod) }}%</span>
                <span class="extra-label">โปรโมทพิเศษ</span>
              </div>
            </div>
            <!-- TikTok链接（右下角） -->
            <div class="prod-footer">
              <a v-if="getDefaultActivityLink(prod)" :href="getDefaultActivityLink(prod)" target="_blank" class="tiktok-btn">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#fff"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.3 0 .59.05.86.12V9.01a6.33 6.33 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.77 1.52V6.84a4.84 4.84 0 0 1-1.01-.15z"/></svg>
                <span>เข้า TikTok ขาย</span>
              </a>
            </div>
          </div>
        </div>
        <div v-else class="empty-text">ไม่มีสินค้า</div>
      </div>

      <!-- 5. 底部色块 -->
      <div class="footer-section" :style="{ backgroundColor: themeColor }">
        <router-link to="/products/public" class="footer-link">Get more info. &gt;&gt;</router-link>
        <div class="footer-copyright">
          Copyright &copy; 2026 LazyFirst. All Rights Reserved.<br/>
          Encrypted Digital System&ensp;&middot;&ensp;TAP Ecosystem Certified
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import axios from 'axios'

const route = useRoute()

const loading = ref(true)
const error = ref('')
const recruitment = ref(null)
const identificationCode = ref('')
const themeColor = ref('#775999')

// 获取API基础URL
const getApiBase = () => {
  return window.location.origin
}

// 加载数据
const loadData = async () => {
  const y = route.query.y
  if (!y) {
    error.value = '缺少识别码参数'
    loading.value = false
    return
  }

  identificationCode.value = y
  loading.value = true
  error.value = ''

  try {
    const res = await axios.get(`${getApiBase()}/api/public/recruitment?y=${y}`)
    if (res.data?.success) {
      recruitment.value = res.data.data
      // 从数据库加载主题色
      if (res.data.data.pageStyle?.themeColor) {
        themeColor.value = res.data.data.pageStyle.themeColor
      }
    } else {
      error.value = res.data?.message || '获取数据失败'
    }
  } catch (err) {
    if (err.response?.status === 403) {
      error.value = '该招募已停用'
    } else if (err.response?.status === 404) {
      error.value = '招募不存在或识别码无效'
    } else {
      error.value = '网络错误，请稍后重试'
    }
  } finally {
    loading.value = false
  }
}

// 格式化佣金率
const formatRate = (rate) => {
  if (!rate && rate !== 0) return '-'
  return (rate * 100).toFixed(1) + '%'
}

// 获取默认活动配置
const getDefaultActivityConfig = (prod) => {
  if (prod.activityConfigs && prod.activityConfigs.length > 0) {
    const defaultConfig = prod.activityConfigs.find(ac => ac.isDefault)
    return defaultConfig || prod.activityConfigs[0]
  }
  return null
}

// 获取默认活动的activityLink
const getDefaultActivityLink = (prod) => {
  const config = getDefaultActivityConfig(prod)
  return config?.activityLink || ''
}

// 获取推广佣金率
const getProductPromoRate = (prod) => {
  const config = getDefaultActivityConfig(prod)
  if (config && config.promotionInfluencerRate) return config.promotionInfluencerRate
  return prod.promotionInfluencerRate || 0
}

// 获取广场佣金率
const getProductSquareRate = (prod) => {
  const config = getDefaultActivityConfig(prod)
  if (config && config.squareCommissionRate !== undefined) return config.squareCommissionRate
  return prod.squareCommissionRate || 0
}

// 计算额外推广
const calcExtra = (prod) => {
  const promo = getProductPromoRate(prod)
  const square = getProductSquareRate(prod)
  const diff = (promo - square) * 100
  return diff > 0 ? diff.toFixed(1) : 0
}

// 获取产品图片
const getProductImage = (prod) => {
  if (prod.images && prod.images.length > 0) return prod.images[0]
  return ''
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.public-recruitment-page {
  min-height: 100vh;
  background: #f5f5f5;
  max-width: 480px;
  margin: 0 auto;
  padding: 0;
  box-sizing: border-box;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: #909399;
}

.loading-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 错误状态 */
.error-container {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.content-container {
  padding: 0;
}

/* 1. 顶部色块 */
.hero-section {
  position: relative;
  padding: 24px 20px 20px;
  border-radius: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  min-height: 100px;
}

.hero-text {
  flex: 1;
}

.hero-line1 {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 6px;
}

.hero-line2 {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.5;
}

.hero-logo {
  width: 64px;
  height: 64px;
  object-fit: contain;
  flex-shrink: 0;
  margin-left: 12px;
  margin-top: 0;
}

/* 2. 招募信息卡片（主题色描边） */
.info-card {
  background: #fff;
  border: 2px solid #775999;
  border-radius: 0;
  padding: 16px 20px;
}

.info-name {
  font-size: 18px;
  font-weight: 700;
  color: #000;
  margin: 0 0 8px;
}

.info-desc {
  font-size: 13px;
  color: #333;
  line-height: 1.6;
  margin: 0;
}

/* 3. 达人要求卡片（主题色底） */
.req-card {
  padding: 16px 20px;
}

.req-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.req-item {
  text-align: center;
  background: #fff;
  border-radius: 8px;
  padding: 10px 6px;
}

.req-label {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
}

.req-value {
  font-size: 16px;
  font-weight: 700;
  color: #000;
}

/* 4. 产品卡片 */
.products-card {
  background: #fff;
  padding: 16px 20px;
  border: 2px solid #775999;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.product-card {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 12px;
  position: relative;
}

.prod-top-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.prod-main-img-wrap {
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
}

.prod-main-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.prod-images-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin-bottom: 10px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.prod-images-scroll::-webkit-scrollbar {
  display: none;
}

.prod-img-thumb {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.prod-info {
  flex: 1;
  min-width: 0;
}

.prod-name {
  font-size: 14px;
  font-weight: 500;
  color: #000;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.prod-name-link {
  color: var(--el-color-primary);
  text-decoration: none;
}

.prod-name-link:hover {
  text-decoration: underline;
}

.prod-id {
  font-size: 12px;
  margin-top: 8px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.prod-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.tiktok-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #000;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  padding: 5px 12px;
  border-radius: 6px;
  text-decoration: none;
  transition: opacity 0.2s;
}

.tiktok-btn:hover {
  opacity: 0.8;
}

.tiktok-btn svg {
  fill: #fff;
  flex-shrink: 0;
}

.prod-rates {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.rate-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.rate-label {
  font-size: 11px;
  color: #909399;
}

.rate-value {
  font-weight: 600;
  font-size: 14px;
}

.rate-line {
  color: #c0c4cc;
  text-decoration: line-through;
}

.rate-promo {
  color: #e6a23c;
  font-size: 16px;
}

.rate-extra-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.extra-badge {
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  color: white;
  font-weight: 700;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
}

.extra-label {
  font-size: 10px;
  color: #ff6b6b;
  margin-top: 2px;
}

.empty-text {
  font-size: 13px;
  color: #c0c4cc;
  text-align: center;
  padding: 20px 0;
}

/* 5. 底部色块 */
.footer-section {
  padding: 20px;
  text-align: center;
}

.footer-link {
  display: inline-block;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  text-decoration: none;
  margin-bottom: 12px;
  letter-spacing: 0.5px;
}

.footer-link:hover {
  text-decoration: underline;
}

.footer-copyright {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
}
</style>
