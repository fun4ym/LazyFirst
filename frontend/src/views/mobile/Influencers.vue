<template>
  <div class="page-container">
    <!-- 顶部搜索 -->
    <div class="page-header">
      <h1>达人</h1>
      <div class="search-box">
        <input 
          v-model="searchKeyword" 
          type="text" 
          placeholder="搜索达人名称/TikTok号（公海+私域）"
          @input="debounceSearch"
        />
        <span class="search-icon">🔍</span>
      </div>
    </div>

    <!-- 达人列表 -->
    <div class="influencer-list" v-loading="loading">
      <div 
        v-for="item in influencers" 
        :key="item._id" 
        class="influencer-card"
      >
        <!-- 卡片头部：交易标识 + 状态 -->
        <div class="card-header">
          <div class="trade-badges">
            <!-- 7天内成单标识 -->
            <span v-if="hasOrderIn7Days(item._id)" class="badge success">
              <span class="badge-icon">✓</span> 7天成单
            </span>
            <!-- 30天订单超过10个 -->
            <span v-if="orderCount30Days(item._id) > 10" class="badge warning">
              <span class="badge-icon">📦</span> {{ orderCount30Days(item._id) }}单
            </span>
          </div>
          <div class="card-actions">
            <!-- 拉黑状态 -->
            <span v-if="item.isBlacklisted" class="blacklist-tag">
              <span class="blacklist-icon">🚫</span> 黑名单
            </span>
            <!-- 编辑按钮 -->
            <button class="edit-btn" @click.stop="editInfluencer(item)">
              ✏️ 编辑
            </button>
          </div>
        </div>

        <!-- 卡片中部：昵称和ID -->
        <div class="card-body" @click="showDetail(item)">
          <div class="influencer-avatar">
            {{ item.tiktokName?.charAt(0) || '?' }}
          </div>
          <div class="influencer-info">
            <div class="influencer-name">{{ item.tiktokName || '-' }}</div>
            <div class="influencer-id-row" @click.stop="copyId(item.tiktokId)">
              <span class="influencer-id">@{{ item.tiktokId }}</span>
              <span class="copy-icon">📋</span>
            </div>
          </div>
        </div>

        <!-- 卡片底部：数据和维护 -->
        <div class="card-footer">
          <div class="data-stats">
            <div class="stat-item">
              <span class="stat-value">¥{{ formatNumber(item.latestGmv) }}</span>
              <span class="stat-label">月GMV</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-value">{{ formatNumber(item.latestFollowers) }}</span>
              <span class="stat-label">粉丝</span>
            </div>
          </div>
          <div class="maintenance-info">
            <span class="remark-text" v-if="item.latestRemark">
              备注：{{ item.latestRemark }}
            </span>
            <span class="remark-empty" v-else>暂无备注</span>
            <button class="detail-btn" @click.stop="showDetail(item)">
              详情/维护 →
            </button>
          </div>
        </div>
      </div>
      
      <div v-if="!loading && influencers.length === 0" class="empty">
        <div class="empty-icon">📭</div>
        <div class="empty-text">暂无自己的达人</div>
        <div class="empty-hint">去公域认领达人吧</div>
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
          <div class="detail-section">
            <div class="detail-row">
              <span class="label">TikTok号：</span>
              <span class="value copy-value" @click="copyId(currentInfluencer.tiktokId)">
                @{{ currentInfluencer.tiktokId }} 📋
              </span>
            </div>
            <div class="detail-row">
              <span class="label">昵称：</span>
              <span class="value">{{ currentInfluencer.tiktokName || '-' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">状态：</span>
              <span class="value">
                <span :class="['status-tag', currentInfluencer.status]">
                  {{ currentInfluencer.status === 'enabled' ? '启用' : '禁用' }}
                </span>
              </span>
            </div>
            <div class="detail-row">
              <span class="label">归属：</span>
              <span class="value">私域</span>
            </div>
            <div class="detail-row">
              <span class="label">粉丝数：</span>
              <span class="value">{{ formatNumber(currentInfluencer.latestFollowers) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">月GMV：</span>
              <span class="value">¥{{ formatNumber(currentInfluencer.latestGmv) }}</span>
            </div>
          </div>

          <!-- 维护记录 -->
          <div class="maintenance-section">
            <div class="section-title">
              <span>维护记录</span>
              <button class="add-btn" @click="showAddMaintenance = true">+ 添加维护</button>
            </div>
            <div class="maintenance-list">
              <div v-if="!maintenances.length" class="no-maintenance">
                暂无维护记录
              </div>
              <div v-for="m in maintenances" :key="m._id" class="maintenance-item">
                <div class="m-header">
                  <span class="m-name">{{ m.maintainerName }}</span>
                  <span class="m-date">{{ formatDate(m.createdAt) }}</span>
                </div>
                <div class="m-stats">
                  <span>粉丝: {{ formatNumber(m.followers) }}</span>
                  <span>GMV: ¥{{ formatNumber(m.gmv) }}</span>
                </div>
                <div class="m-remark" v-if="m.remark">{{ m.remark }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加维护弹窗 -->
    <div v-if="showAddMaintenance" class="modal-mask" @click="showAddMaintenance = false">
      <div class="modal-content small" @click.stop>
        <div class="modal-header">
          <h2>添加维护</h2>
          <span class="close" @click="showAddMaintenance = false">×</span>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <label>当前粉丝数</label>
            <input v-model="maintenanceForm.followers" type="number" placeholder="请输入粉丝数" />
          </div>
          <div class="form-item">
            <label>月GMV(¥)</label>
            <input v-model="maintenanceForm.gmv" type="number" placeholder="请输入月GMV" />
          </div>
          <div class="form-item">
            <label>备注</label>
            <textarea v-model="maintenanceForm.remark" placeholder="请输入备注" rows="3"></textarea>
          </div>
          <button class="btn-submit" @click="submitMaintenance" :disabled="submitting">
            {{ submitting ? '提交中...' : '提交' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 编辑达人弹窗 -->
    <div v-if="showEditModal" class="modal-mask" @click="showEditModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>编辑达人</h2>
          <span class="close" @click="showEditModal = false">×</span>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <label>TikTok号</label>
            <input v-model="editForm.tiktokId" type="text" placeholder="TikTok号" />
          </div>
          <div class="form-item">
            <label>昵称</label>
            <input v-model="editForm.tiktokName" type="text" placeholder="昵称" />
          </div>
          <div class="form-item">
            <label>黑名单</label>
            <div class="blacklist-toggle">
              <span :class="['toggle-status', editForm.isBlacklisted ? 'on' : 'off']">
                {{ editForm.isBlacklisted ? '已拉黑' : '正常' }}
              </span>
              <button 
                v-if="!editForm.isBlacklisted" 
                class="btn-blacklist" 
                @click="confirmBlacklist"
              >
                拉黑
              </button>
              <button 
                v-else 
                class="btn-unblacklist" 
                @click="confirmUnblacklist"
              >
                取消拉黑
              </button>
            </div>
          </div>
          <button class="btn-submit" @click="saveEdit" :disabled="submitting">
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 复制提示 -->
    <div v-if="showCopyTip" class="copy-toast">
      已复制到剪贴板
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const loading = ref(false)
const loadingMore = ref(false)
const influencers = ref([])
const searchKeyword = ref('')
const page = ref(1)
const limit = ref(20)
const hasMore = ref(true)
const showDetailModal = ref(false)
const showAddMaintenance = ref(false)
const showEditModal = ref(false)
const showCopyTip = ref(false)
const currentInfluencer = ref({})
const maintenances = ref([])
const submitting = ref(false)

const maintenanceForm = ref({
  followers: '',
  gmv: '',
  remark: ''
})

const editForm = ref({
  tiktokId: '',
  tiktokName: '',
  isBlacklisted: false
})

let searchTimer = null

const debounceSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    loadInfluencers()
  }, 300)
}

const formatNumber = (num) => {
  if (!num && num !== 0) return '0'
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
      companyId: userStore.companyId
      // 公海 + 自己私域所有达人（后端默认逻辑）
    }
    const res = await request.get('/influencer-managements', { params })
    influencers.value = res.influencers || []
    hasMore.value = res.influencers?.length === limit.value
    
    // 加载订单统计
    if (influencers.value.length > 0) {
      loadOrderStats()
    }
  } catch (error) {
    console.error('加载达人失败:', error)
    ElMessage.error('加载达人失败')
  } finally {
    loading.value = false
  }
}

// 订单统计数据
const orderStats = ref({})

// 加载达人订单统计
const loadOrderStats = async () => {
  try {
    const influencerIds = influencers.value.map(i => i._id).join(',')
    if (!influencerIds) return
    
    const res = await request.get('/product-stats/influencer-order-stats', {
      params: { 
        influencerIds,
        companyId: userStore.companyId
      }
    })
    
    const data = res.data || res
    if (Array.isArray(data)) {
      const statsMap = {}
      data.forEach(item => {
        statsMap[item.influencerId] = item.stats
      })
      orderStats.value = statsMap
    }
  } catch (error) {
    console.error('加载订单统计失败:', error)
  }
}

// 计算属性：判断7天内是否有成单
const hasOrderIn7Days = (influencerId) => {
  const stats = orderStats.value[influencerId]
  return stats?.lastWeekCount > 0
}

// 计算属性：30天订单数
const orderCount30Days = (influencerId) => {
  const stats = orderStats.value[influencerId]
  return stats?.lastMonthCount || 0
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
      companyId: userStore.companyId
    }
    const res = await request.get('/influencer-managements', { params })
    influencers.value.push(...(res.influencers || []))
    hasMore.value = res.influencers?.length === limit.value
  } catch (error) {
    page.value--
  } finally {
    loadingMore.value = false
  }
}

const showDetail = async (item) => {
  currentInfluencer.value = item
  showDetailModal.value = true
  // 加载维护记录
  try {
    const res = await request.get(`/influencer-managements/${item._id}`)
    maintenances.value = res.maintenances || []
  } catch (error) {
    console.error('加载维护记录失败:', error)
  }
}

const editInfluencer = (item) => {
  currentInfluencer.value = item
  editForm.value = {
    tiktokId: item.tiktokId,
    tiktokName: item.tiktokName,
    isBlacklisted: item.isBlacklisted || false
  }
  showEditModal.value = true
}

// 确认拉黑
const confirmBlacklist = async () => {
  if (!confirm('确定要将该达人拉入黑名单吗？')) return
  submitting.value = true
  try {
    await request.post(`/influencer-managements/${currentInfluencer.value._id}/blacklist`, {
      reason: '移动端拉黑'
    })
    ElMessage.success('已拉黑')
    editForm.value.isBlacklisted = true
    loadInfluencers()
  } catch (error) {
    console.error('拉黑失败:', error)
    ElMessage.error(error.response?.data?.message || '拉黑失败')
  } finally {
    submitting.value = false
  }
}

// 确认取消拉黑
const confirmUnblacklist = async () => {
  if (!confirm('确定要取消拉黑该达人吗？')) return
  submitting.value = true
  try {
    await request.delete(`/influencer-managements/${currentInfluencer.value._id}/blacklist`)
    ElMessage.success('已取消拉黑')
    editForm.value.isBlacklisted = false
    loadInfluencers()
  } catch (error) {
    console.error('取消拉黑失败:', error)
    ElMessage.error(error.response?.data?.message || '取消拉黑失败')
  } finally {
    submitting.value = false
  }
}

const saveEdit = async () => {
  if (!editForm.value.tiktokId) {
    ElMessage.warning('请输入TikTok号')
    return
  }
  submitting.value = true
  try {
    await request.put(`/influencer-managements/${currentInfluencer.value._id}`, {
      tiktokId: editForm.value.tiktokId,
      tiktokName: editForm.value.tiktokName
    })
    ElMessage.success('保存成功')
    showEditModal.value = false
    loadInfluencers()
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error(error.response?.data?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

const submitMaintenance = async () => {
  if (!maintenanceForm.value.followers && !maintenanceForm.value.gmv) {
    ElMessage.warning('请填写粉丝数或GMV')
    return
  }
  submitting.value = true
  try {
    await request.post(`/influencer-managements/${currentInfluencer.value._id}/maintenance`, {
      followers: Number(maintenanceForm.value.followers) || 0,
      gmv: Number(maintenanceForm.value.gmv) || 0,
      remark: maintenanceForm.value.remark
    })
    ElMessage.success('添加成功')
    showAddMaintenance.value = false
    maintenanceForm.value = { followers: '', gmv: '', remark: '' }
    // 刷新详情
    showDetail(currentInfluencer.value)
    loadInfluencers()
  } catch (error) {
    console.error('添加维护失败:', error)
    ElMessage.error(error.response?.data?.message || '添加维护失败')
  } finally {
    submitting.value = false
  }
}

const copyId = (id) => {
  navigator.clipboard.writeText(id).then(() => {
    showCopyTip.value = true
    setTimeout(() => {
      showCopyTip.value = false
    }, 2000)
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

onMounted(() => {
  loadInfluencers()
})
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8f9fc 0%, #eef1f6 100%);
}

/* 头部搜索 */
.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px 16px 24px;
  color: #fff;
}

.page-header h1 {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 600;
}

.search-box {
  position: relative;
}

.search-box input {
  width: 100%;
  padding: 12px 40px 12px 16px;
  border: none;
  border-radius: 24px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.95);
  color: #333;
  box-sizing: border-box;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.search-box input::placeholder {
  color: #999;
}

.search-icon {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
}

/* 达人列表 */
.influencer-list {
  padding: 16px;
  padding-bottom: 80px;
}

/* 卡片样式 */
.influencer-card {
  background: #fff;
  border-radius: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.influencer-card:active {
  transform: scale(0.98);
}

/* 卡片头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(90deg, #f8f9fc 0%, #fff 100%);
  border-bottom: 1px solid #f0f2f5;
}

.trade-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.badge.success {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  color: #2e7d32;
}

.badge.warning {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  color: #e65100;
}

.badge-icon {
  font-size: 10px;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.blacklist-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
  color: #c62828;
  border-radius: 8px;
  font-size: 11px;
}

.blacklist-icon {
  font-size: 10px;
}

.edit-btn {
  padding: 4px 10px;
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  color: #1565c0;
  border: none;
  border-radius: 8px;
  font-size: 11px;
  cursor: pointer;
}

/* 卡片中部 */
.card-body {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  cursor: pointer;
}

.influencer-avatar {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 600;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.influencer-info {
  flex: 1;
  min-width: 0;
}

.influencer-name {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.influencer-id-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.influencer-id {
  font-size: 13px;
  color: #666;
}

.copy-icon {
  font-size: 12px;
  opacity: 0.6;
}

/* 卡片底部 */
.card-footer {
  padding: 0 16px 16px;
}

.data-stats {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #f8f9fc 0%, #f0f2f5 100%);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.stat-label {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.stat-divider {
  width: 1px;
  height: 30px;
  background: #e0e0e0;
}

.maintenance-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.remark-text {
  font-size: 12px;
  color: #666;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
}

.remark-empty {
  font-size: 12px;
  color: #bbb;
  font-style: italic;
}

.detail-btn {
  padding: 6px 12px;
  background: transparent;
  color: #667eea;
  border: 1px solid #667eea;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
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
  font-size: 16px;
  color: #333;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 13px;
  color: #999;
}

.load-more {
  text-align: center;
  padding: 16px;
  color: #667eea;
  cursor: pointer;
  font-size: 14px;
}

/* 弹窗样式 */
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

.modal-content.small {
  max-height: 60vh;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  padding: 20px;
  max-height: 65vh;
  overflow-y: auto;
}

/* 详情样式 */
.detail-section {
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  padding: 12px 0;
  border-bottom: 1px solid #f0f2f5;
}

.detail-row .label {
  width: 90px;
  color: #999;
  flex-shrink: 0;
  font-size: 14px;
}

.detail-row .value {
  flex: 1;
  color: #333;
  font-size: 14px;
}

.copy-value {
  cursor: pointer;
}

.status-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status-tag.enabled {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-tag.disabled {
  background: #ffebee;
  color: #c62828;
}

/* 维护记录 */
.maintenance-section {
  margin-top: 20px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.add-btn {
  padding: 6px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
}

.maintenance-list {
  max-height: 200px;
  overflow-y: auto;
}

.no-maintenance {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 13px;
}

.maintenance-item {
  padding: 12px;
  background: #f8f9fc;
  border-radius: 10px;
  margin-bottom: 10px;
}

.m-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.m-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.m-date {
  font-size: 11px;
  color: #999;
}

.m-stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.m-remark {
  font-size: 12px;
  color: #666;
  background: #fff;
  padding: 6px 10px;
  border-radius: 6px;
  margin-top: 6px;
}

/* 表单样式 */
.form-item {
  margin-bottom: 16px;
}

.form-item label {
  display: block;
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.form-item input,
.form-item textarea,
.blacklist-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toggle-status {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
}

.toggle-status.on {
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
  color: #c62828;
}

.toggle-status.off {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  color: #2e7d32;
}

.btn-blacklist {
  padding: 8px 16px;
  background: linear-gradient(135deg, #f44336 0%, #e53935 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn-unblacklist {
  padding: 8px 16px;
  background: linear-gradient(135deg, #4caf50 0%, #43a047 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.form-item select {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 14px;
  background: #fafafa;
  color: #333;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-item input:focus,
.form-item textarea:focus,
.form-item select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.btn-submit {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 10px;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 复制提示 */
.copy-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 2000;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
</style>
