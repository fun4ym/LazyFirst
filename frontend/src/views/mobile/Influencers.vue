<template>
  <div class="page-container">
    <div class="page-header">
      <h1>达人列表</h1>
    </div>
    
    <!-- 搜索栏 -->
    <div class="search-bar">
      <input 
        v-model="searchKeyword" 
        type="text" 
        placeholder="搜索达人名称/ TikTok号"
        @input="handleSearch"
      />
    </div>

    <!-- 筛选 -->
    <div class="filter-bar">
      <select v-model="filterStatus" @change="loadInfluencers">
        <option value="">全部状态</option>
        <option value="enabled">已启用</option>
        <option value="disabled">已禁用</option>
      </select>
      <select v-model="filterPool" @change="loadInfluencers">
        <option value="">全部池</option>
        <option value="public">公域</option>
        <option value="private">私域</option>
      </select>
    </div>

    <!-- 达人列表 -->
    <div class="influencer-list" v-loading="loading">
      <div 
        v-for="item in influencers" 
        :key="item._id" 
        class="influencer-card"
        @click="showDetail(item)"
      >
        <div class="influencer-info">
          <div class="influencer-avatar">
            {{ item.tiktokName?.charAt(0) || '?' }}
          </div>
          <div class="influencer-detail">
            <div class="influencer-name">{{ item.tiktokName || item.tiktokId }}</div>
            <div class="influencer-id">@{{ item.tiktokId }}</div>
            <div class="influencer-tags">
              <span class="tag" :class="item.poolType">{{ item.poolType === 'private' ? '私域' : '公域' }}</span>
              <span class="tag status" :class="item.status">{{ item.status === 'enabled' ? '启用' : '禁用' }}</span>
            </div>
          </div>
        </div>
        <div class="influencer-stats">
          <div class="stat">
            <span class="stat-value">{{ formatNumber(item.latestFollowers) }}</span>
            <span class="stat-label">粉丝</span>
          </div>
          <div class="stat">
            <span class="stat-value">¥{{ formatNumber(item.latestGmv) }}</span>
            <span class="stat-label">月GMV</span>
          </div>
        </div>
        <div class="influencer-actions">
          <button class="btn-primary" @click.stop="buildConnection(item)">
            建联
          </button>
        </div>
      </div>
      
      <div v-if="!loading && influencers.length === 0" class="empty">
        暂无达人数据
      </div>
    </div>

    <!-- 加载更多 -->
    <div v-if="hasMore" class="load-more" @click="loadMore">
      {{ loadingMore ? '加载中...' : '点击加载更多' }}
    </div>

    <!-- 达人详情弹窗 -->
    <div v-if="showDetailModal" class="modal-mask" @click="showDetailModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>达人详情</h2>
          <span class="close" @click="showDetailModal = false">×</span>
        </div>
        <div class="modal-body">
          <div class="detail-row">
            <span class="label">TikTok号：</span>
            <span class="value">@{{ currentInfluencer.tiktokId }}</span>
          </div>
          <div class="detail-row">
            <span class="label">昵称：</span>
            <span class="value">{{ currentInfluencer.tiktokName || '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="label">状态：</span>
            <span class="value">{{ currentInfluencer.status === 'enabled' ? '启用' : '禁用' }}</span>
          </div>
          <div class="detail-row">
            <span class="label">池类型：</span>
            <span class="value">{{ currentInfluencer.poolType === 'private' ? '私域' : '公域' }}</span>
          </div>
          <div class="detail-row">
            <span class="label">粉丝数：</span>
            <span class="value">{{ formatNumber(currentInfluencer.latestFollowers) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">月GMV：</span>
            <span class="value">¥{{ formatNumber(currentInfluencer.latestGmv) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">最近维护：</span>
            <span class="value">{{ currentInfluencer.latestMaintainerName || '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="label">维护时间：</span>
            <span class="value">{{ formatDate(currentInfluencer.latestMaintenanceTime) }}</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" @click="buildConnection(currentInfluencer)">建联</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const loading = ref(false)
const loadingMore = ref(false)
const influencers = ref([])
const searchKeyword = ref('')
const filterStatus = ref('')
const filterPool = ref('')
const page = ref(1)
const limit = ref(20)
const hasMore = ref(true)
const showDetailModal = ref(false)
const currentInfluencer = ref({})

const formatNumber = (num) => {
  if (!num) return '0'
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

const loadInfluencers = async () => {
  loading.value = true
  page.value = 1
  try {
    const params = {
      page: 1,
      limit: limit.value,
      keyword: searchKeyword.value,
      status: filterStatus.value,
      poolType: filterPool.value
    }
    const res = await request.get('/influencers', { params })
    influencers.value = res.data.data || []
    hasMore.value = res.data.data?.length === limit.value
  } catch (error) {
    console.error('加载达人失败:', error)
    ElMessage.error('加载达人失败')
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  if (loadingMore.value) return
  loadingMore.value = true
  try {
    page.value++
    const params = {
      page: page.value,
      limit: limit.value,
      keyword: searchKeyword.value,
      status: filterStatus.value,
      poolType: filterPool.value
    }
    const res = await request.get('/influencers', { params })
    influencers.value.push(...(res.data.data || []))
    hasMore.value = res.data.data?.length === limit.value
  } catch (error) {
    page.value--
  } finally {
    loadingMore.value = false
  }
}

const handleSearch = () => {
  loadInfluencers()
}

const showDetail = (item) => {
  currentInfluencer.value = item
  showDetailModal.value = true
}

const buildConnection = async (item) => {
  try {
    await request.post('/influencer-managements', {
      influencerId: item._id,
      action: 'build_connection',
      remark: '移动端建联'
    })
    ElMessage.success('建联成功！')
  } catch (error) {
    console.error('建联失败:', error)
    ElMessage.error(error.response?.data?.message || '建联失败')
  }
}

onMounted(() => {
  loadInfluencers()
})
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.page-header {
  background: #4a148c;
  color: #fff;
  padding: 16px;
  text-align: center;
}

.page-header h1 {
  margin: 0;
  font-size: 18px;
}

.search-bar {
  padding: 12px;
  background: #fff;
}

.search-bar input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.filter-bar {
  display: flex;
  gap: 10px;
  padding: 0 12px 12px;
  background: #fff;
}

.filter-bar select {
  flex: 1;
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
}

.influencer-list {
  padding: 12px;
}

.influencer-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.influencer-info {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.influencer-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a148c 0%, #7b1fa2 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
  flex-shrink: 0;
}

.influencer-detail {
  flex: 1;
}

.influencer-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.influencer-id {
  font-size: 13px;
  color: #999;
  margin: 2px 0;
}

.influencer-tags {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: #f0f0f0;
  color: #666;
}

.tag.private {
  background: #e8f5e9;
  color: #2e7d32;
}

.tag.status.enabled {
  background: #e3f2fd;
  color: #1565c0;
}

.tag.status.disabled {
  background: #ffebee;
  color: #c62828;
}

.influencer-stats {
  display: flex;
  gap: 20px;
  padding: 12px 0;
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
}

.stat {
  flex: 1;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #4a148c;
}

.stat-label {
  font-size: 12px;
  color: #999;
}

.influencer-actions {
  margin-top: 12px;
}

.btn-primary {
  width: 100%;
  padding: 10px;
  background: #4a148c;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.empty {
  text-align: center;
  padding: 40px;
  color: #999;
}

.load-more {
  text-align: center;
  padding: 16px;
  color: #4a148c;
  cursor: pointer;
}

/* 弹窗样式 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  width: 100%;
  max-height: 80vh;
  border-radius: 16px 16px 0 0;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
}

.close {
  font-size: 28px;
  color: #999;
  cursor: pointer;
}

.modal-body {
  padding: 16px;
  max-height: 60vh;
  overflow-y: auto;
}

.detail-row {
  display: flex;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.detail-row .label {
  width: 100px;
  color: #999;
  flex-shrink: 0;
}

.detail-row .value {
  flex: 1;
  color: #333;
}

.modal-footer {
  padding: 16px;
  border-top: 1px solid #f0f0f0;
}

.modal-footer .btn-primary {
  width: 100%;
}
</style>
