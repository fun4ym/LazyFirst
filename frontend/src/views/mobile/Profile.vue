<template>
  <div class="page-container">
    <!-- 顶部用户信息 -->
    <div class="page-header">
      <div class="user-info">
        <div class="user-avatar">
          {{ userInfo.name?.charAt(0) || userInfo.username?.charAt(0) || 'U' }}
        </div>
        <div class="user-detail">
          <div class="user-name">{{ userInfo.name || userInfo.username || 'BD' }}</div>
          <div class="user-role">{{ userInfo.role?.name || $t('common.name') }}</div>
        </div>
      </div>
      <div class="header-actions">
        <!-- 语言切换 -->
        <button class="lang-btn" @click="toggleLanguage">
          {{ isEnglish ? '中' : 'EN' }}
        </button>
        <button class="logout-btn" @click="logout">{{ $t('mobile.profile.logout') }}</button>
      </div>
    </div>

    <!-- 数据概览 -->
    <div class="stats-section" v-if="bdStats">
      <div class="section-title">
        <span class="title-text">{{ $t('mobile.profile.dataOverview') }}</span>
        <span class="stats-date">{{ $t('mobile.profile.statsDate', { date: formatDate(bdStats.statsDate) }) }}</span>
      </div>

      <!-- 统计卡片 -->
      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            📦
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ bdStats.yesterdayStats?.sampleCount || 0 }}</div>
            <div class="stat-label">{{ $t('mobile.profile.yesterdaySample') }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">
            🛒
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ bdStats.yesterdayStats?.orderCount || 0 }}</div>
            <div class="stat-label">{{ $t('mobile.profile.yesterdayOrder') }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
            💰
          </div>
          <div class="stat-content">
            <div class="stat-value">฿{{ formatMoney(bdStats.yesterdayCommission?.estimated || 0) }}</div>
            <div class="stat-label">{{ $t('mobile.profile.yesterdayCommission') }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
            📈
          </div>
          <div class="stat-content">
            <div class="stat-value">฿{{ formatMoney(bdStats.monthlyCommission?.estimated || 0) }}</div>
            <div class="stat-label">{{ $t('mobile.profile.monthCommission') }}</div>
          </div>
        </div>
      </div>

      <!-- 占比信息 -->
      <div class="percentage-section">
        <div class="percentage-card">
          <div class="percentage-title">{{ $t('mobile.profile.samplePercentage') }}</div>
          <div class="percentage-info">
            <div class="percentage-circle">
              <svg viewBox="0 0 36 36" class="circular-chart">
                <path class="circle-bg"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path class="circle"
                  :stroke-dasharray="`${bdStats.percentage?.sample || 0}, 100`"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text x="18" y="20.35" class="percentage">{{ bdStats.percentage?.sample || 0 }}%</text>
              </svg>
            </div>
            <div class="percentage-detail">
              <div class="detail-item">
                <span class="dot personal"></span>
                <span>{{ $t('mobile.profile.personal') }}: {{ bdStats.yesterdayStats?.sampleCount || 0 }} {{ isEnglish ? 'items' : '条' }}</span>
              </div>
              <div class="detail-item">
                <span class="dot team"></span>
                <span>{{ $t('mobile.profile.team') }}: {{ bdStats.teamStats?.sampleCount || 0 }} {{ isEnglish ? 'items' : '条' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="percentage-card">
          <div class="percentage-title">{{ $t('mobile.profile.orderPercentage') }}</div>
          <div class="percentage-info">
            <div class="percentage-circle">
              <svg viewBox="0 0 36 36" class="circular-chart">
                <path class="circle-bg"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path class="circle order"
                  :stroke-dasharray="`${bdStats.percentage?.order || 0}, 100`"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text x="18" y="20.35" class="percentage">{{ bdStats.percentage?.order || 0 }}%</text>
              </svg>
            </div>
            <div class="percentage-detail">
              <div class="detail-item">
                <span class="dot personal"></span>
                <span>{{ $t('mobile.profile.personal') }}: {{ bdStats.yesterdayStats?.orderCount || 0 }} {{ isEnglish ? 'orders' : '单' }}</span>
              </div>
              <div class="detail-item">
                <span class="dot team"></span>
                <span>{{ $t('mobile.profile.team') }}: {{ bdStats.teamStats?.orderCount || 0 }} {{ isEnglish ? 'orders' : '单' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 近一周成单 -->
      <div class="orders-section">
        <div class="section-title">
          <span class="title-text">{{ $t('mobile.profile.recentOrders') }}</span>
          <span class="order-count">{{ $t('mobile.profile.totalOrders', { count: bdStats.recentOrders?.total || 0 }) }}</span>
        </div>

        <div class="orders-list" v-if="bdStats.recentOrders?.list?.length">
          <div
            v-for="order in bdStats.recentOrders.list"
            :key="order.orderId"
            class="order-item"
          >
            <div class="order-main">
              <div class="order-product">{{ order.product }}</div>
              <div class="order-influencer">👤 {{ order.influencer }}</div>
            </div>
            <div class="order-info">
              <span class="order-date">{{ formatDate(order.createTime) }}</span>
              <span class="order-id">{{ order.orderId }}</span>
            </div>
          </div>
        </div>
        <div v-else class="no-orders">
          <span>{{ $t('mobile.profile.noOrders') }}</span>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-else-if="loading" class="loading-state">
      <div class="loading-icon">📊</div>
      <div>{{ $t('mobile.profile.loadingData') }}</div>
    </div>

    <!-- 非BD用户 -->
    <div v-else class="non-bd-state">
      <div class="non-bd-icon">🔒</div>
      <div>{{ $t('mobile.profile.nonBdAccess') }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import AuthManager from '@/utils/auth'

const { t, locale } = useI18n()
const router = useRouter()

const userInfo = ref({})
const bdStats = ref(null)
const loading = ref(false)

const isEnglish = computed(() => locale.value === 'en')

const toggleLanguage = () => {
  locale.value = locale.value === 'en' ? 'zh' : 'en'
}

const formatMoney = (value) => {
  if (!value) return '0'
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const formatDate = (date) => {
  if (!date) return '--'
  const d = new Date(date)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${month}/${day}`
}

const loadBDStats = async () => {
  loading.value = true
  try {
    const res = await request.get('/dashboard/bd-stats')
    bdStats.value = res
  } catch (error) {
    console.error('加载数据失败:', error)
    if (error.response?.status === 403) {
      bdStats.value = null
    }
  } finally {
    loading.value = false
  }
}

const logout = async () => {
  try {
    await ElMessageBox.confirm(
      isEnglish.value ? 'Are you sure you want to logout?' : '确定要退出登录吗？',
      isEnglish.value ? 'Confirm' : '提示',
      { type: 'warning' }
    )
    AuthManager.logout()
    router.push('/login')
  } catch (e) {
    // 用户取消
  }
}

onMounted(() => {
  const user = AuthManager.getUser()
  if (user) {
    userInfo.value = user
    // 检查是否是BD角色
    const role = user.role
    let hasBDRole = false
    if (Array.isArray(role)) {
      hasBDRole = role.some(r => {
        const roleName = typeof r === 'string' ? r : (r?.name || '')
        return roleName.toLowerCase() === 'bd'
      })
    } else if (typeof role === 'string') {
      hasBDRole = role.toLowerCase() === 'bd'
    } else if (typeof role === 'object' && role !== null) {
      hasBDRole = (role.name || '').toLowerCase() === 'bd'
    }

    if (hasBDRole) {
      loadBDStats()
    }
  }
})
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8f9fc 0%, #eef1f6 100%);
  padding-bottom: 80px;
}

/* 头部 */
.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.user-avatar {
  width: 60px;
  height: 60px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.user-detail {
  color: #fff;
}

.user-name {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 4px;
}

.user-role {
  font-size: 13px;
  opacity: 0.8;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.lang-btn {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 600;
}

.logout-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
}

/* 统计区域 */
.stats-section {
  padding: 16px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.title-text {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.stats-date {
  font-size: 12px;
  color: #999;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #333;
}

.stat-label {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

/* 占比区域 */
.percentage-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.percentage-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.percentage-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.percentage-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.percentage-circle {
  width: 70px;
  height: 70px;
  flex-shrink: 0;
}

.circular-chart {
  display: block;
  width: 100%;
  height: 100%;
}

.circle-bg {
  fill: none;
  stroke: #eee;
  stroke-width: 3;
}

.circle {
  fill: none;
  stroke: #667eea;
  stroke-width: 3;
  stroke-linecap: round;
  animation: progress 1s ease-out forwards;
}

.circle.order {
  stroke: #11998e;
}

.percentage {
  fill: #333;
  font-size: 8px;
  font-weight: 600;
  text-anchor: middle;
}

@keyframes progress {
  0% {
    stroke-dasharray: 0 100;
  }
}

.percentage-detail {
  flex: 1;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot.personal {
  background: #667eea;
}

.dot.team {
  background: #e0e0e0;
}

/* 订单区域 */
.orders-section {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.order-count {
  font-size: 12px;
  color: #667eea;
  font-weight: 500;
}

.orders-list {
  max-height: 300px;
  overflow-y: auto;
}

.order-item {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.order-item:last-child {
  border-bottom: none;
}

.order-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.order-product {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.order-influencer {
  font-size: 12px;
  color: #666;
}

.order-info {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #999;
}

.no-orders {
  text-align: center;
  padding: 30px;
  color: #999;
  font-size: 13px;
}

/* 加载状态 */
.loading-state,
.non-bd-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.loading-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.non-bd-icon {
  font-size: 48px;
  margin-bottom: 16px;
}
</style>
