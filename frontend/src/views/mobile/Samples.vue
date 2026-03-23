<template>
  <div class="page-container">
    <div class="page-header">
      <h1>样品管理</h1>
    </div>

    <!-- 标签切换 -->
    <div class="tabs">
      <div 
        class="tab" 
        :class="{ active: activeTab === 'apply' }"
        @click="activeTab = 'apply'"
      >
        申请样品
      </div>
      <div 
        class="tab" 
        :class="{ active: activeTab === 'records' }"
        @click="activeTab = 'records'; loadRecords()"
      >
        申请记录
      </div>
    </div>

    <!-- 申请样品 -->
    <div v-if="activeTab === 'apply'" class="tab-content">
      <div class="form-card">
        <div class="form-item">
          <label>选择达人</label>
          <div class="influencer-select" @click="showInfluencerPicker = true">
            <span v-if="selectedInfluencer">{{ selectedInfluencer.tiktokName || selectedInfluencer.tiktokId }}</span>
            <span v-else class="placeholder">请选择达人</span>
            <span class="arrow">›</span>
          </div>
        </div>

        <div class="form-item">
          <label>样品名称</label>
          <input v-model="form.productName" type="text" placeholder="请输入样品名称" />
        </div>

        <div class="form-item">
          <label>样品规格</label>
          <input v-model="form.specification" type="text" placeholder="请输入规格" />
        </div>

        <div class="form-item">
          <label>申请数量</label>
          <input v-model="form.quantity" type="number" placeholder="请输入数量" />
        </div>

        <div class="form-item">
          <label>样品单价(¥)</label>
          <input v-model="form.unitPrice" type="number" placeholder="请输入单价" />
        </div>

        <div class="form-item">
          <label>备注</label>
          <textarea v-model="form.remark" placeholder="请输入备注" rows="3"></textarea>
        </div>

        <button class="btn-submit" @click="submitApplication" :disabled="submitting">
          {{ submitting ? '提交中...' : '提交申请' }}
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
            <span class="record-title">{{ item.productName }}</span>
            <span class="record-status" :class="item.status">{{ getStatusText(item.status) }}</span>
          </div>
          <div class="record-info">
            <div class="info-row">
              <span>达人：</span>
              <span>{{ item.influencerName || '-' }}</span>
            </div>
            <div class="info-row">
              <span>数量：</span>
              <span>{{ item.quantity }}件</span>
            </div>
            <div class="info-row">
              <span>金额：</span>
              <span>¥{{ item.totalPrice || item.unitPrice * item.quantity }}</span>
            </div>
            <div class="info-row">
              <span>申请时间：</span>
              <span>{{ formatDate(item.createdAt) }}</span>
            </div>
          </div>
        </div>
        
        <div v-if="!recordsLoading && records.length === 0" class="empty">
          暂无申请记录
        </div>
      </div>
    </div>

    <!-- 达人选择器 -->
    <div v-if="showInfluencerPicker" class="modal-mask" @click="showInfluencerPicker = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>选择达人</h2>
          <span class="close" @click="showInfluencerPicker = false">×</span>
        </div>
        <div class="modal-body">
          <input 
            v-model="influencerKeyword" 
            type="text" 
            placeholder="搜索达人..."
            class="search-input"
            @input="searchInfluencer"
          />
          <div class="influencer-list">
            <div 
              v-for="item in influencerOptions" 
              :key="item._id"
              class="influencer-option"
              @click="selectInfluencer(item)"
            >
              <span class="name">{{ item.tiktokName || item.tiktokId }}</span>
              <span class="id">@{{ item.tiktokId }}</span>
            </div>
            <div v-if="influencerOptions.length === 0" class="empty">
              未找到达人
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const activeTab = ref('apply')
const recordsLoading = ref(false)
const records = ref([])
const showInfluencerPicker = ref(false)
const influencerKeyword = ref('')
const influencerOptions = ref([])
const selectedInfluencer = ref(null)
const submitting = ref(false)

const form = reactive({
  productName: '',
  specification: '',
  quantity: 1,
  unitPrice: 0,
  remark: ''
})

const getStatusText = (status) => {
  const map = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    shipped: '已发货',
    received: '已收货',
    completed: '已完成'
  }
  return map[status] || status
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

const loadRecords = async () => {
  recordsLoading.value = true
  try {
    const res = await request.get('/samples/my')
    records.value = res.data.data || []
  } catch (error) {
    console.error('加载记录失败:', error)
    ElMessage.error('加载记录失败')
  } finally {
    recordsLoading.value = false
  }
}

const searchInfluencer = async () => {
  if (!influencerKeyword.value) {
    influencerOptions.value = []
    return
  }
  try {
    const res = await request.get('/influencers', { 
      params: { keyword: influencerKeyword.value, limit: 20 } 
    })
    influencerOptions.value = res.data.data || []
  } catch (error) {
    console.error('搜索达人失败:', error)
  }
}

const selectInfluencer = (item) => {
  selectedInfluencer.value = item
  showInfluencerPicker.value = false
}

const submitApplication = async () => {
  if (!selectedInfluencer.value) {
    ElMessage.warning('请选择达人')
    return
  }
  if (!form.productName) {
    ElMessage.warning('请输入样品名称')
    return
  }
  if (form.quantity < 1) {
    ElMessage.warning('请输入正确的数量')
    return
  }

  submitting.value = true
  try {
    await request.post('/samples', {
      influencerId: selectedInfluencer.value._id,
      influencerName: selectedInfluencer.value.tiktokName || selectedInfluencer.value.tiktokId,
      productName: form.productName,
      specification: form.specification,
      quantity: form.quantity,
      unitPrice: form.unitPrice,
      remark: form.remark
    })
    ElMessage.success('申请提交成功！')
    // 重置表单
    selectedInfluencer.value = null
    form.productName = ''
    form.specification = ''
    form.quantity = 1
    form.unitPrice = 0
    form.remark = ''
    activeTab.value = 'records'
    loadRecords()
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error(error.response?.data?.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadRecords()
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

.tabs {
  display: flex;
  background: #fff;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 14px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.tab.active {
  color: #4a148c;
  border-bottom-color: #4a148c;
}

.tab-content {
  padding: 12px;
}

.form-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
}

.form-item {
  margin-bottom: 16px;
}

.form-item label {
  display: block;
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
}

.form-item input,
.form-item textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}

.influencer-select {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
}

.influencer-select .placeholder {
  color: #999;
}

.influencer-select .arrow {
  font-size: 20px;
  color: #999;
}

.btn-submit {
  width: 100%;
  padding: 14px;
  background: #4a148c;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 10px;
}

.btn-submit:disabled {
  background: #ccc;
}

.record-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 12px;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.record-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.record-status {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
}

.record-status.pending {
  background: #fff3e0;
  color: #f57c00;
}

.record-status.approved,
.record-status.shipped {
  background: #e3f2fd;
  color: #1976d2;
}

.record-status.rejected {
  background: #ffebee;
  color: #c62828;
}

.record-status.completed {
  background: #e8f5e9;
  color: #2e7d32;
}

.record-info .info-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
  color: #666;
}

.empty {
  text-align: center;
  padding: 40px;
  color: #999;
}

/* 弹窗 */
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

.search-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  font-size: 14px;
  margin-bottom: 12px;
}

.influencer-option {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}

.influencer-option:hover {
  background: #f9f9f9;
}

.influencer-option .name {
  font-size: 15px;
  color: #333;
}

.influencer-option .id {
  font-size: 13px;
  color: #999;
}
</style>
