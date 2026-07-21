<template>
  <div class="record-page" :class="{ 'mobile-shell': isMobile }">
    <div class="record-header">
      <button class="back-btn" @click="goBack">← {{ $t('samplePublic.backToList') }}</button>
      <h1 class="record-title">{{ $t('samplePublic.recordTitle') }}</h1>
    </div>

    <div v-if="loading" class="record-loading">{{ $t('samplePublic.loading') }}</div>
    <div v-else-if="error" class="record-error">
      <p>{{ error }}</p>
      <button class="retry-btn" @click="loadRecord">↻</button>
    </div>

    <div v-else-if="sample" class="record-body">
      <!-- 商品信息 -->
      <div class="card">
        <div class="product-row">
          <img v-if="sample.productImage" :src="sample.productImage" class="product-img" alt="product" />
          <div class="product-meta">
            <div class="product-name">{{ sample.productName || '-' }}</div>
            <div class="product-id" v-if="sample.productId">{{ $t('samplePublic.productId') }}{{ sample.productId }}</div>
          </div>
        </div>
      </div>

      <!-- 达人 / 基础信息 -->
      <div class="card">
        <div class="info-row">
          <span class="info-label">{{ $t('samplePublic.influencerAccountLabel') }}</span>
          <span class="info-value">{{ sample.influencerAccount || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ $t('samplePublic.followerLabel') }}</span>
          <span class="info-value">{{ formatK(sample.followerCount) }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ $t('samplePublic.gmvLabel') }}</span>
          <span class="info-value">{{ sample.gmv || 0 }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ $t('samplePublic.dateLabel') }}</span>
          <span class="info-value">{{ formatDate(sample.date) }}</span>
        </div>
        <div class="info-row" v-if="sample.salesman">
          <span class="info-label">{{ $t('samplePublic.bd') }}</span>
          <span class="info-value">{{ sample.salesman }}</span>
        </div>
      </div>

      <!-- 状态 -->
      <div class="card">
        <div class="info-row">
          <span class="info-label">{{ $t('samplePublic.statusLabel') }}</span>
          <span class="status-badge" :class="'st-' + sample.sampleStatus">{{ sampleStatusLabel(sample.sampleStatus) }}</span>
        </div>
        <div class="info-row" v-if="sample.trackingNumber">
          <span class="info-label">{{ $t('samplePublic.trackingLabel') }}</span>
          <span class="info-value">{{ sample.trackingNumber }}</span>
        </div>
        <div class="info-row" v-if="sample.shippingDate">
          <span class="info-label">{{ $t('samplePublic.shippingDate') }}</span>
          <span class="info-value">{{ formatDate(sample.shippingDate) }}</span>
        </div>
        <div class="info-row" v-if="sample.sampleStatus === 'refused' && sample.refusalReason">
          <span class="info-label">{{ $t('samplePublic.refusalReason') }}</span>
          <span class="info-value">{{ sample.refusalReason }}</span>
        </div>
        <div class="info-row" v-if="sample.isOrderGenerated !== undefined">
          <span class="info-label">{{ $t('samplePublic.orderGenerated') }}</span>
          <span class="info-value">{{ sample.isOrderGenerated ? $t('samplePublic.yes') : $t('samplePublic.no') }}</span>
        </div>
        <div class="info-row" v-if="sample.orderCount">
          <span class="info-label">{{ $t('samplePublic.orderCountLabel') }}</span>
          <span class="info-value">{{ sample.orderCount }}</span>
        </div>
      </div>

      <!-- 履约视频 -->
      <div class="card" v-if="sample.videoLink">
        <div class="info-row">
          <span class="info-label">{{ $t('samplePublic.videoLabel') }}</span>
          <a class="video-link" :href="sample.videoLink" target="_blank">{{ $t('samplePublic.viewVideo') }}</a>
        </div>
        <div class="info-row" v-if="sample.isAdPromotion">
          <span class="info-label">{{ $t('samplePublic.adPromotionLabel') }}</span>
          <span class="info-value">{{ sample.isAdPromotion ? $t('samplePublic.adPromoted') : $t('samplePublic.noAdPromoted') }}</span>
        </div>
      </div>

      <!-- 修改寄养状态 -->
      <div class="card">
        <div class="edit-title">{{ $t('samplePublic.editStatus') }}</div>
        <div class="edit-form">
          <select v-model="editForm.sampleStatus" class="edit-select">
            <option value="pending">{{ $t('samplePublic.pending') }}</option>
            <option value="sent">{{ $t('samplePublic.sent') }}</option>
            <option value="refused">{{ $t('samplePublic.refused') }}</option>
          </select>

          <template v-if="editForm.sampleStatus === 'sent'">
            <input v-model="editForm.logisticsCompany" class="edit-input" :placeholder="$t('samplePublic.logisticsCompany')" />
            <input v-model="editForm.trackingNumber" class="edit-input" :placeholder="$t('samplePublic.trackingLabel')" />
          </template>

          <template v-if="editForm.sampleStatus === 'refused'">
            <textarea v-model="editForm.refusalReason" class="edit-textarea" :placeholder="$t('samplePublic.refusalReasonPlaceholder')"></textarea>
          </template>

          <button class="save-btn" :disabled="saving" @click="saveStatus">
            {{ saving ? $t('samplePublic.loading') : $t('samplePublic.saveStatus') }}
          </button>
        </div>
      </div>

      <!-- 历史申样记录 -->
      <div class="card" v-if="sample.previousSubmissions && sample.previousSubmissions.length">
        <div class="edit-title">{{ $t('samplePublic.historyLabel', { count: sample.previousSubmissions.length }) }}</div>
        <div v-for="(ps, i) in sample.previousSubmissions" :key="i" class="history-item">
          <span class="status-badge" :class="'st-' + ps.sampleStatus">{{ sampleStatusLabel(ps.sampleStatus) }}</span>
          <span class="history-date">{{ formatDate(ps.date) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const API_BASE = '/api'

const isMobile = computed(() => window.matchMedia && window.matchMedia('(max-width: 768px)').matches)

const loading = ref(false)
const error = ref(null)
const sample = ref(null)
const shopCode = route.query.s || ''
const recordId = route.params.id

const saving = ref(false)
const editForm = reactive({ sampleStatus: '', logisticsCompany: '', trackingNumber: '', refusalReason: '' })

function sampleStatusLabel(status) {
  return t('samplePublic.' + (status || 'pending'))
}
function formatK(v) {
  const n = Number(v) || 0
  return (n / 1000).toFixed(1) + 'K'
}
function formatDate(v) {
  if (!v) return '-'
  const d = new Date(v)
  if (isNaN(d.getTime())) return '-'
  const p = x => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

async function loadRecord() {
  loading.value = true
  error.value = null
  try {
    const res = await axios.get(`${API_BASE}/public/samples/record/${recordId}`, { params: { s: shopCode } })
    if (res.data && res.data.success) {
      sample.value = res.data.data.sample
      editForm.sampleStatus = sample.value.sampleStatus || 'pending'
      editForm.logisticsCompany = sample.value.logisticsCompany || ''
      editForm.trackingNumber = sample.value.trackingNumber || ''
      editForm.refusalReason = sample.value.refusalReason || ''
    } else {
      error.value = res.data?.message || t('samplePublic.recordNotFound')
    }
  } catch (e) {
    error.value = e.response?.data?.message || t('samplePublic.recordNotFound')
  } finally {
    loading.value = false
  }
}

async function saveStatus() {
  if (!shopCode) return
  saving.value = true
  try {
    const params = {
      s: shopCode,
      sampleIds: recordId,
      sampleStatus: editForm.sampleStatus
    }
    if (editForm.sampleStatus === 'sent') {
      if (editForm.logisticsCompany) params.logisticsCompany = editForm.logisticsCompany
      if (editForm.trackingNumber) params.trackingNumber = editForm.trackingNumber
    }
    if (editForm.sampleStatus === 'refused' && editForm.refusalReason) {
      params.refusalReason = editForm.refusalReason
    }
    const res = await axios.put(`${API_BASE}/public/samples/batch`, null, { params })
    if (res.data && res.data.success) {
      ElMessage.success(t('samplePublic.statusUpdated'))
      await loadRecord()
    } else {
      ElMessage.error(res.data?.message || t('samplePublic.updateFailed'))
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || t('samplePublic.updateFailed'))
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push({ path: '/samples/public', query: shopCode ? { s: shopCode } : {} })
}

onMounted(loadRecord)
</script>

<style scoped>
.record-page { max-width: 720px; margin: 0 auto; padding: 16px; background: #F5F5F7; min-height: 100vh; }
.record-page.mobile-shell { max-width: 100%; }
.record-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.back-btn { border: none; background: transparent; color: #6DAD19; font-size: 14px; cursor: pointer; padding: 4px 0; }
.record-title { font-size: 18px; font-weight: 700; color: #1F1F1F; margin: 0; }
.record-loading, .record-error { text-align: center; color: #999; padding: 48px 0; }
.retry-btn { margin-top: 12px; border: 1px solid #DDD; background: #FFF; border-radius: 8px; padding: 6px 14px; cursor: pointer; }
.card { background: #FFF; border-radius: 12px; padding: 14px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.product-row { display: flex; gap: 12px; align-items: center; }
.product-img { width: 64px; height: 64px; border-radius: 8px; object-fit: cover; background: #EEE; }
.product-name { font-size: 15px; font-weight: 600; color: #1F1F1F; }
.product-id { font-size: 12px; color: #999; margin-top: 4px; }
.info-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid #F2F2F2; font-size: 14px; }
.info-row:last-child { border-bottom: none; }
.info-label { color: #888; }
.info-value { color: #1F1F1F; font-weight: 500; text-align: right; }
.video-link { color: #6DAD19; font-weight: 600; }
.status-badge { padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; }
.st-pending { color: #EF6C00; background: #FFF3E0; }
.st-received { color: #1565C0; background: #E3F2FD; }
.st-sent { color: #2E7D32; background: #E6F4EA; }
.st-refused { color: #C62828; background: #FFEBEE; }
.edit-title { font-size: 14px; font-weight: 700; color: #1F1F1F; margin-bottom: 10px; }
.edit-form { display: flex; flex-direction: column; gap: 10px; }
.edit-select, .edit-input, .edit-textarea { width: 100%; border: 1px solid #DDD; border-radius: 8px; padding: 10px; font-size: 14px; box-sizing: border-box; }
.edit-textarea { min-height: 70px; resize: vertical; }
.save-btn { background: #6DAD19; color: #FFF; border: none; border-radius: 8px; padding: 11px; font-size: 15px; font-weight: 600; cursor: pointer; }
.save-btn:disabled { opacity: 0.6; }
.history-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #F2F2F2; }
.history-date { font-size: 12px; color: #999; }
</style>
