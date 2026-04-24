<template>
  <div class="page-container">
    <!-- 顶部 -->
    <div class="page-header">
      <div class="header-title">
        <h1>{{ t2('title') }}</h1>
        <button class="lang-btn" @click="toggleLanguage">
          {{ isEnglish ? '中' : 'EN' }}
        </button>
      </div>
    </div>

    <!-- 标签切换 -->
    <div class="tabs">
      <div
        class="tab"
        :class="{ active: activeTab === 'apply' }"
        @click="activeTab = 'apply'"
      >
        <span class="tab-icon">➕</span>
        {{ isEnglish ? 'Apply Sample' : '申请样品' }}
      </div>
      <div
        class="tab"
        :class="{ active: activeTab === 'records' }"
        @click="activeTab = 'records'; loadRecords()"
      >
        <span class="tab-icon">📋</span>
        {{ isEnglish ? 'Records' : '申请记录' }}
      </div>
    </div>

    <!-- 申请样品 -->
    <div v-if="activeTab === 'apply'" class="tab-content">
      <div class="form-card">
        <!-- 选择达人 -->
        <div class="form-item">
          <label>{{ isEnglish ? 'Select Influencer' : '选择达人' }} <span class="required">*</span></label>
          <div class="influencer-select" @click="showInfluencerPicker = true">
            <span v-if="selectedInfluencer" class="selected-value">
              {{ selectedInfluencer.tiktokName || selectedInfluencer.tiktokId }}
            </span>
            <span v-else class="placeholder">{{ isEnglish ? 'Select influencer' : '请选择达人' }}</span>
            <span class="arrow">›</span>
          </div>
        </div>

        <!-- 选择商品 -->
        <div class="form-item">
          <label>{{ isEnglish ? 'Select Product' : '选择商品' }} <span class="required">*</span></label>
          <div class="product-select" @click="showProductPicker = true">
            <span v-if="selectedProduct" class="selected-value">
              {{ selectedProduct.name }}
            </span>
            <span v-else class="placeholder">{{ isEnglish ? 'Select product' : '请选择商品' }}</span>
            <span class="arrow">›</span>
          </div>
        </div>

        <!-- 申请日期 -->
        <div class="form-item">
          <label>{{ isEnglish ? 'Apply Date' : '申请日期' }} <span class="required">*</span></label>
          <input
            v-model="form.date"
            type="date"
            class="date-input"
          />
        </div>

        <!-- 达人粉丝数 -->
        <div class="form-item">
          <label>{{ isEnglish ? 'Followers (K)' : '粉丝数(K)' }}</label>
          <input
            v-model="displayFollowerCount"
            type="number"
            :placeholder="isEnglish ? 'Enter followers in K' : '请输入粉丝数(K)'"
          />
        </div>

        <!-- 样品数量 -->
        <div class="form-item">
          <label>{{ isEnglish ? 'Quantity' : '样品数量' }}</label>
          <input
            v-model="form.quantity"
            type="number"
            :placeholder="isEnglish ? 'Enter quantity' : '请输入数量'"
          />
        </div>

        <!-- 备注 -->
        <div class="form-item">
          <label>{{ isEnglish ? 'Remark' : '备注' }}</label>
          <textarea
            v-model="form.remark"
            :placeholder="isEnglish ? 'Enter remark' : '请输入备注信息'"
            rows="3"
          ></textarea>
        </div>

        <button class="btn-submit" @click="submitApplication" :disabled="submitting">
          {{ submitting ? (isEnglish ? 'Submitting...' : '提交中...') : (isEnglish ? 'Submit' : '提交申请') }}
        </button>
      </div>
    </div>

    <!-- 申请记录 -->
    <div v-if="activeTab === 'records'" class="tab-content">
      <div class="records-list" v-loading="recordsLoading">
        <div
          v-for="item in records"
          :key="item._id"
          class="record-card"
        >
          <div class="record-header">
            <div class="record-title">{{ item.productName }}</div>
            <div class="record-status" :class="getSampleStatusClass(item.sampleStatus)">
              {{ getSampleStatusText(item.sampleStatus) }}
            </div>
          </div>

          <div class="record-body">
            <div class="record-row">
              <span class="label">{{ isEnglish ? 'Influencer:' : '达人：' }}</span>
              <span class="value">@{{ item.influencerAccount }}</span>
              <span v-if="item.isBlacklistedInfluencer" class="blacklist-badge">{{ isEnglish ? 'Blocked' : '黑名单' }}</span>
            </div>
            <div class="record-row">
              <span class="label">{{ isEnglish ? 'Date:' : '日期：' }}</span>
              <span class="value">{{ formatDate(item.date) }}</span>
            </div>
            <div class="record-row" v-if="item.trackingNumber">
              <span class="label">{{ isEnglish ? 'Tracking:' : '快递：' }}</span>
              <span class="value">{{ item.trackingNumber }}</span>
            </div>
            <div class="record-row">
              <span class="label">{{ isEnglish ? 'Order:' : '出单：' }}</span>
              <span class="value">
                <span :class="item.isOrderGenerated ? 'status-success' : 'status-pending'">
                  {{ item.isOrderGenerated ? (isEnglish ? 'Ordered' : '已出单') : (isEnglish ? 'No order' : '未出单') }}
                </span>
              </span>
            </div>
          </div>

          <div class="record-footer">
            <button class="action-btn" @click="viewDetail(item)">
              {{ t2('viewDetail') }}
            </button>
          </div>
        </div>

        <div v-if="!recordsLoading && records.length === 0" class="empty">
          <div class="empty-icon">📭</div>
          <div class="empty-text">{{ t2('noData') }}</div>
        </div>
      </div>
    </div>

    <!-- 达人选择器 -->
    <div v-if="showInfluencerPicker" class="modal-mask" @click="showInfluencerPicker = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ isEnglish ? 'Select Influencer' : '选择达人' }}</h2>
          <span class="close" @click="showInfluencerPicker = false">×</span>
        </div>
        <div class="modal-body">
          <div class="search-box">
            <input
              v-model="influencerKeyword"
              type="text"
              :placeholder="isEnglish ? 'Search name/ID' : '搜索达人名称/TikTok号'"
              @input="searchInfluencer"
            />
          </div>
          <div class="picker-list">
            <div
              v-for="item in influencerOptions"
              :key="item._id"
              class="picker-item"
              @click="selectInfluencer(item)"
            >
              <div class="item-avatar">{{ item.tiktokName?.charAt(0) || '?' }}</div>
              <div class="item-info">
                <div class="item-name">{{ item.tiktokName || '-' }}</div>
                <div class="item-id">@{{ item.tiktokId }}</div>
              </div>
            </div>
            <div v-if="!influencerOptions.length" class="empty-picker">
              {{ isEnglish ? 'Search influencer...' : '搜索达人...' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 商品选择器 -->
    <div v-if="showProductPicker" class="modal-mask" @click="showProductPicker = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ isEnglish ? 'Select Product' : '选择商品' }}</h2>
          <span class="close" @click="showProductPicker = false">×</span>
        </div>
        <div class="modal-body">
          <div class="picker-list">
            <div 
              v-for="item in productOptions" 
              :key="item._id" 
              class="picker-item"
              @click="selectProduct(item)"
            >
              <div class="item-avatar product">
                <span v-if="item.imageUrl">
                  <img :src="item.imageUrl" alt="" />
                </span>
                <span v-else>📦</span>
              </div>
              <div class="item-info">
                <div class="item-name">{{ item.name }}</div>
                <div class="item-id">{{ item.sku || '无SKU' }}</div>
              </div>
            </div>
            <div v-if="!productOptions.length" class="empty-picker">
              {{ isEnglish ? 'No products' : '暂无商品数据' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="showDetailModal" class="modal-mask" @click="showDetailModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ t2('sampleDetail') }}</h2>
          <span class="close" @click="showDetailModal = false">×</span>
        </div>
        <div class="modal-body">
          <!-- 状态进度 -->
          <div class="status-progress">
            <div class="progress-step" :class="{ active: getStatusStep(currentRecord.sampleStatus) >= 0 }">
              <div class="step-dot">1</div>
              <div class="step-label">{{ isEnglish ? 'Pending' : '待审核' }}</div>
            </div>
            <div class="progress-line" :class="{ active: getStatusStep(currentRecord.sampleStatus) >= 1 }"></div>
            <div class="progress-step" :class="{ active: getStatusStep(currentRecord.sampleStatus) >= 1 }">
              <div class="step-dot">2</div>
              <div class="step-label">{{ isEnglish ? 'Approved' : '已通过' }}</div>
            </div>
            <div class="progress-line" :class="{ active: getStatusStep(currentRecord.sampleStatus) >= 2 }"></div>
            <div class="progress-step" :class="{ active: getStatusStep(currentRecord.sampleStatus) >= 2 }">
              <div class="step-dot">3</div>
              <div class="step-label">{{ isEnglish ? 'Shipped' : '已寄样' }}</div>
            </div>
            <div class="progress-line" :class="{ active: getStatusStep(currentRecord.sampleStatus) >= 3 }"></div>
            <div class="progress-step" :class="{ active: getStatusStep(currentRecord.sampleStatus) >= 3 }">
              <div class="step-dot">4</div>
              <div class="step-label">{{ isEnglish ? 'Received' : '已收货' }}</div>
            </div>
            <div class="progress-line" :class="{ active: getStatusStep(currentRecord.sampleStatus) >= 4 }"></div>
            <div class="progress-step" :class="{ active: getStatusStep(currentRecord.sampleStatus) >= 4 }">
              <div class="step-dot">5</div>
              <div class="step-label">{{ isEnglish ? 'Completed' : '已完成' }}</div>
            </div>
          </div>

          <!-- 基本信息 -->
          <div class="detail-section">
            <div class="section-title">{{ t2('sampleInfo') }}</div>
            <div class="detail-row">
              <span class="label">{{ t2('status') }}</span>
              <span class="value" :class="getSampleStatusClass(currentRecord.sampleStatus)">
                {{ getSampleStatusText(currentRecord.sampleStatus) }}
              </span>
            </div>
            <div class="detail-row">
              <span class="label">{{ t2('productName') }}</span>
              <span class="value">{{ currentRecord.productName || '-' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">{{ t2('tiktokId') }}</span>
              <span class="value">@{{ currentRecord.influencerAccount }}</span>
            </div>
            <div class="detail-row">
              <span class="label">{{ isEnglish ? 'Followers' : '达人粉丝' }}</span>
              <span class="value">{{ formatFollowers(currentRecord.followerCount) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">{{ t2('applyDate') }}</span>
              <span class="value">{{ formatDate(currentRecord.date) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">{{ isEnglish ? 'Quantity' : '样品数量' }}</span>
              <span class="value">{{ currentRecord.quantity || 1 }}</span>
            </div>
            <div class="detail-row" v-if="currentRecord.applicantName">
              <span class="label">{{ isEnglish ? 'Applicant' : '申请人' }}</span>
              <span class="value">{{ currentRecord.applicantName }}</span>
            </div>
            <div class="detail-row" v-if="currentRecord.trackingNumber">
              <span class="label">{{ t2('trackingNo') }}</span>
              <span class="value copy-value" @click="copyText(currentRecord.trackingNumber)">
                {{ currentRecord.trackingNumber }} 📋
              </span>
            </div>
            <div class="detail-row" v-if="currentRecord.remark">
              <span class="label">备注</span>
              <span class="value">{{ currentRecord.remark }}</span>
            </div>
          </div>

          <!-- 出单信息 -->
          <div class="detail-section">
            <div class="section-title">{{ t2('orderInfo') }}</div>
            <div class="detail-row">
              <span class="label">{{ isEnglish ? 'Order Status' : '是否出单' }}</span>
              <span class="value">
                <span :class="currentRecord.isOrderGenerated ? 'status-success' : 'status-pending'">
                  {{ currentRecord.isOrderGenerated ? (isEnglish ? 'Ordered' : '已出单') : (isEnglish ? 'No order' : '未出单') }}
                </span>
              </span>
            </div>
            <div class="detail-row" v-if="currentRecord.orderCount">
              <span class="label">{{ t2('orderCount') }}</span>
              <span class="value">{{ currentRecord.orderCount }}</span>
            </div>
            <div class="detail-row" v-if="currentRecord.orderAmount">
              <span class="label">{{ t2('orderAmount') }}</span>
              <span class="value">{{ currentDefaultCurrencySymbol }}{{ currentRecord.orderAmount }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'

const { t, locale } = useI18n()
const router = useRouter()
const userStore = useUserStore()

const isEnglish = computed(() => locale.value === 'en')

const toggleLanguage = () => {
  locale.value = locale.value === 'en' ? 'zh' : 'en'
}

const t2 = (key) => t('mobile.samples.' + key)

const activeTab = ref('apply')
const recordsLoading = ref(false)
const records = ref([])
const submitting = ref(false)
const showInfluencerPicker = ref(false)
const showProductPicker = ref(false)

const influencerKeyword = ref('')
const influencerOptions = ref([])
const selectedInfluencer = ref(null)
const selectedProduct = ref(null)
const productOptions = ref([])

const form = ref({
  date: new Date().toISOString().split('T')[0],
  followerCount: '',
  quantity: 1,
  remark: ''
})

// 粉丝数输入显示（K为单位）
const displayFollowerCount = ref('')

const getSampleStatusText = (status) => {
  const map = {
    pending: isEnglish.value ? 'Pending' : '待审核',
    approved: isEnglish.value ? 'Approved' : '已通过',
    refused: isEnglish.value ? 'Rejected' : '已拒绝',
    sample_sent: isEnglish.value ? 'Shipped' : '已寄样',
    received: isEnglish.value ? 'Received' : '已收货',
    completed: isEnglish.value ? 'Completed' : '已完成'
  }
  return map[status] || (isEnglish.value ? 'Pending' : '待审核')
}

const getSampleStatusClass = (status) => {
  const map = {
    pending: 'status-pending',
    approved: 'status-approved',
    refused: 'status-refused',
    sample_sent: 'status-sent',
    received: 'status-received',
    completed: 'status-completed'
  }
  return map[status] || 'status-pending'
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

// 粉丝数格式化：展示时除1000，加K后缀
const formatFollowers = (value) => {
  if (!value && value !== 0) return '-'
  const k = value / 1000
  if (k >= 1) {
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`
  }
  return value.toString()
}

// 粉丝数反向转换：输入值乘1000存入数据库
const parseFollowersToDb = (value) => {
  if (!value && value !== 0) return 0
  return Math.round(value * 1000)
}

const searchInfluencer = async () => {
  if (!influencerKeyword.value) {
    influencerOptions.value = []
    return
  }
  try {
    const res = await request.get('/influencer-managements', { 
      params: { 
        keyword: influencerKeyword.value, 
        limit: 20,
        poolType: '' 
      } 
    })
    influencerOptions.value = res.influencers || []
  } catch (error) {
    console.error('搜索达人失败:', error)
  }
}

const selectInfluencer = (item) => {
  selectedInfluencer.value = item
  form.value.followerCount = item.latestFollowers || ''
    // 粉丝数显示为K单位
    displayFollowerCount.value = item.latestFollowers ? item.latestFollowers / 1000 : ''
  showInfluencerPicker.value = false
}

const loadProducts = async () => {
  try {
    const res = await request.get('/products', { params: { limit: 100 } })
    productOptions.value = res.data || res.products || []
  } catch (error) {
    console.error('加载商品失败:', error)
    // 尝试其他返回格式
    try {
      const res = await request.get('/products')
      productOptions.value = res.data || res.products || []
    } catch (e) {
      console.error('加载商品失败:', e)
    }
  }
}

const selectProduct = (item) => {
  selectedProduct.value = item
  showProductPicker.value = false
}

const submitApplication = async () => {
  if (!selectedInfluencer.value) {
    ElMessage.warning('请选择达人')
    return
  }
  if (!selectedProduct.value) {
    ElMessage.warning('请选择商品')
    return
  }
  if (!form.value.date) {
    ElMessage.warning('请选择申请日期')
    return
  }

  submitting.value = true
  try {
    // ★ 重构后：发送 ObjectId 引用字段（不再传冗余的字符串）
    await request.post('/samples', {
      date: form.value.date,
      productId: selectedProduct.value._id,           // ObjectId
      influencerId: selectedInfluencer.value._id,       // ObjectId
      shippingInfo: `Mobile申请 - ${form.value.remark || ''}`,
      isOrderGenerated: false
    })
    ElMessage.success('申请提交成功')
    // 重置表单
    selectedInfluencer.value = null
    selectedProduct.value = null
    displayFollowerCount.value = ''
    form.value = {
      date: new Date().toISOString().split('T')[0],
      followerCount: '',
      quantity: 1,
      remark: ''
    }
    // 切换到记录页面
    activeTab.value = 'records'
    loadRecords()
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error(error.response?.data?.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

const loadRecords = async () => {
  recordsLoading.value = true
  try {
    const res = await request.get('/samples', { 
      params: { 
        limit: 100 
      } 
    })
    // 处理不同的返回格式
    records.value = res.data?.samples || res.samples || []
  } catch (error) {
    console.error('加载记录失败:', error)
    ElMessage.error('加载记录失败')
  } finally {
    recordsLoading.value = false
  }
}

const viewDetail = (item) => {
  currentRecord.value = item
  showDetailModal.value = true
}

const showDetailModal = ref(false)
const currentRecord = ref({})

const getStatusStep = (status) => {
  const steps = {
    pending: 0,
    approved: 1,
    sample_sent: 2,
    received: 3,
    completed: 4
  }
  return steps[status] || 0
}

const copyText = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

// 货币单位列表
const currencyList = ref([])

// 加载货币单位列表
const loadCurrencies = async () => {
  try {
    const res = await request.get('/base-data/list', { params: { type: 'priceUnit', limit: 100 } })
    currencyList.value = res.data || []
  } catch (error) {
    console.error('Load currencies error:', error)
    currencyList.value = []
  }
}

// 获取当前默认货币符号
const currentDefaultCurrencySymbol = computed(() => {
  const defaultCurrency = currencyList.value.find(c => c.isDefault)
  return defaultCurrency?.symbol || '¥'
})

onMounted(() => {
  loadProducts()
  loadCurrencies()
})
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8f9fc 0%, #eef1f6 100%);
}

/* 头部 */
.page-header {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  padding: 20px 16px;
  color: #fff;
}

.header-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.lang-btn {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 600;
}

/* 标签 */
.tabs {
  display: flex;
  background: #fff;
  padding: 0 16px;
  border-bottom: 1px solid #f0f0f0;
}

.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 0;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab.active {
  color: #11998e;
  border-bottom-color: #11998e;
  font-weight: 600;
}

.tab-icon {
  font-size: 16px;
}

/* 内容区 */
.tab-content {
  padding: 16px;
}

/* 表单卡片 */
.form-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.form-item {
  margin-bottom: 18px;
}

.form-item label {
  display: block;
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
  font-weight: 500;
}

.required {
  color: #f56c6c;
}

.form-item input,
.form-item textarea,
.form-item select {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 14px;
  background: #fafafa;
  color: #333;
  box-sizing: border-box;
  transition: all 0.2s;
}

.form-item input:focus,
.form-item textarea:focus {
  outline: none;
  border-color: #11998e;
  box-shadow: 0 0 0 3px rgba(17, 153, 142, 0.1);
}

.date-input {
  color: #333;
}

.influencer-select,
.product-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.2s;
}

.influencer-select:active,
.product-select:active {
  border-color: #11998e;
}

.selected-value {
  color: #333;
  font-size: 14px;
}

.placeholder {
  color: #999;
  font-size: 14px;
}

.arrow {
  color: #ccc;
  font-size: 18px;
}

.btn-submit {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 10px;
  box-shadow: 0 4px 12px rgba(17, 153, 142, 0.3);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 记录列表 */
.records-list {
  padding-bottom: 80px;
}

.record-card {
  background: #fff;
  border-radius: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: linear-gradient(90deg, #f8f9fc 0%, #fff 100%);
  border-bottom: 1px solid #f0f2f5;
}

.record-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.record-status {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-pending {
  background: #fff3e0;
  color: #e65100;
}

.status-approved {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-refused {
  background: #ffebee;
  color: #c62828;
}

.status-sent {
  background: #e3f2fd;
  color: #1565c0;
}

.status-received {
  background: #f3e5f5;
  color: #7b1fa2;
}

.status-completed {
  background: #e8f5e9;
  color: #2e7d32;
}

.record-body {
  padding: 14px 16px;
}

.record-row {
  display: flex;
  align-items: center;
  padding: 6px 0;
  font-size: 13px;
}

.record-row .label {
  color: #999;
  width: 60px;
  flex-shrink: 0;
}

.record-row .value {
  color: #333;
}

.blacklist-badge {
  margin-left: 8px;
  padding: 2px 6px;
  background: #ffebee;
  color: #c62828;
  border-radius: 4px;
  font-size: 10px;
}

.status-success {
  color: #2e7d32;
  font-weight: 500;
}

.status-pending-color {
  color: #e65100;
}

.record-footer {
  padding: 12px 16px;
  border-top: 1px solid #f0f2f5;
}

.action-btn {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #f8f9fc 0%, #eef1f6 100%);
  color: #11998e;
  border: 1px solid #11998e;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
}

/* 空状态 */
.empty {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 14px;
  color: #999;
}

/* 弹窗 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: #fff;
  width: 100%;
  max-height: 85vh;
  border-radius: 20px 20px 0 0;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: #fff;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
}

.close {
  font-size: 28px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  line-height: 1;
}

.modal-body {
  padding: 16px;
  max-height: 70vh;
  overflow-y: auto;
}

/* 选择器 */
.search-box {
  margin-bottom: 12px;
}

.search-box input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 14px;
  box-sizing: border-box;
}

.picker-list {
  max-height: 50vh;
  overflow-y: auto;
}

.picker-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}

.picker-item:active {
  background: #f5f5f5;
}

.item-avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  flex-shrink: 0;
}

.item-avatar.product {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  overflow: hidden;
}

.item-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-id {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.empty-picker {
  text-align: center;
  padding: 30px;
  color: #999;
  font-size: 13px;
}

/* 详情弹窗样式 */
.status-progress {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 10px;
  background: linear-gradient(135deg, #f8f9fc 0%, #eef1f6 100%);
  border-radius: 12px;
  margin-bottom: 20px;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.step-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ddd;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.progress-step.active .step-dot {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: #fff;
}

.step-label {
  font-size: 10px;
  color: #999;
}

.progress-step.active .step-label {
  color: #11998e;
  font-weight: 500;
}

.progress-line {
  flex: 1;
  height: 2px;
  background: #ddd;
  margin-top: 11px;
  margin: 11px 4px 0;
}

.progress-line.active {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section .section-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f2f5;
}

.detail-row {
  display: flex;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.detail-row .label {
  width: 90px;
  color: #999;
  font-size: 13px;
  flex-shrink: 0;
}

.detail-row .value {
  flex: 1;
  color: #333;
  font-size: 13px;
}

.copy-value {
  cursor: pointer;
}
</style>
