<template>
  <div class="public-sample-page">
    <!-- 错误提示 -->
    <div v-if="error" class="error-container">
      <el-result
        icon="error"
        :title="$t('samplePublic.accessFailed')"
        :sub-title="error"
      >
        <template #extra>
          <el-button type="primary" @click="retryLoad">{{ $t('samplePublic.retry') }}</el-button>
        </template>
      </el-result>
    </div>

    <!-- 正常内容 -->
    <div v-else class="content-container">
      <!-- 公司/店铺信息头部 -->
      <div class="shop-header" v-if="shopInfo">
        <div class="header-left">
          <!-- 店铺信息 -->
          <div class="shop-info" v-if="shopInfo">
            <h2>{{ shopInfo.shopName }}</h2>
            <div class="shop-meta">
              <span class="header-subtitle">{{ $t('samplePublic.forLazyFirst') }}</span>
            </div>
          </div>
        </div>
        <div class="header-right">
          <img src="/logo.png" alt="Logo" class="header-logo" />
        </div>
      </div>

      <!-- 搜索筛选 -->
      <el-card class="search-card">
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item :label="$t('samplePublic.sampleStatus')">
            <el-select
              v-model="searchForm.sampleStatus"
              :placeholder="$t('samplePublic.selectAll')"
              clearable
              style="width: 120px"
              @change="loadSamples"
            >
              <el-option :label="$t('samplePublic.pending')" value="pending" />
              <el-option :label="$t('samplePublic.shipping')" value="shipping" />
              <el-option :label="$t('samplePublic.sent')" value="sent" />
              <el-option :label="$t('samplePublic.refused')" value="refused" />
            </el-select>
          </el-form-item>

          <el-form-item :label="$t('samplePublic.isOrderGenerated')">
            <el-select
              v-model="searchForm.isOrderGenerated"
              :placeholder="$t('samplePublic.selectAll')"
              clearable
              style="width: 100px"
              @change="loadSamples"
            >
              <el-option :label="$t('samplePublic.yes')" :value="true" />
              <el-option :label="$t('samplePublic.no')" :value="false" />
            </el-select>
          </el-form-item>

          <el-form-item :label="$t('samplePublic.applyDate')">
            <el-date-picker
              v-model="searchForm.date"
              type="date"
              :placeholder="$t('samplePublic.selectDate')"
              clearable
              style="width: 150px"
              value-format="YYYY-MM-DD"
              @change="loadSamples"
            />
          </el-form-item>

          <el-form-item :label="$t('samplePublic.productName')">
            <el-input
              v-model="searchForm.productName"
              :placeholder="$t('samplePublic.productNamePlaceholder')"
              clearable
              style="width: 150px"
              @keyup.enter="loadSamples"
            />
          </el-form-item>

          <el-form-item label="达人ID">
            <el-input
              v-model="searchForm.influencerAccount"
              placeholder="达人ID"
              clearable
              style="width: 150px"
              @keyup.enter="loadSamples"
            />
          </el-form-item>

          <el-form-item label="商品ID">
            <el-input
              v-model="searchForm.productId"
              placeholder="商品ID"
              clearable
              style="width: 150px"
              @keyup.enter="loadSamples"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="loadSamples">{{ $t('samplePublic.search') }}</el-button>
            <el-button @click="resetSearch">{{ $t('samplePublic.reset') }}</el-button>
          </el-form-item>
        </el-form>

        <!-- 批量操作栏 -->
        <div class="batch-actions" v-if="selectedSamples.length > 0">
          <div class="batch-left">
            <span class="selected-count">
              <el-icon><Check /></el-icon>
              {{ $t('samplePublic.selectedItems', { count: selectedSamples.length }) }}
            </span>
            <el-button text type="danger" @click="selectedSamples = []">{{ $t('samplePublic.cancelSelection') }}</el-button>
          </div>
          <div class="batch-right">
            <span class="batch-label">{{ $t('samplePublic.batchOperation') }}</span>
            <el-dropdown @command="handleBatchStatusCommand" trigger="click">
              <el-button type="primary" size="small">
                {{ $t('samplePublic.modifyStatus') }} <el-icon><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="pending">{{ $t('samplePublic.pending') }}</el-dropdown-item>
                  <el-dropdown-item command="shipping">{{ $t('samplePublic.shipping') }}</el-dropdown-item>
                  <el-dropdown-item command="sent">{{ $t('samplePublic.sent') }}</el-dropdown-item>
                  <el-dropdown-item command="refused">{{ $t('samplePublic.refused') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-dropdown @command="handleBatchAdCommand" trigger="click">
              <el-button type="success" size="small">
                {{ $t('samplePublic.adToggle') }} <el-icon><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="true">{{ $t('samplePublic.openAd') }}{{ $t('samplePublic.adPromotion') }}</el-dropdown-item>
                  <el-dropdown-item :command="false">{{ $t('samplePublic.closeAd') }}{{ $t('samplePublic.adPromotion') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </el-card>

      <!-- 表格 -->
      <el-card class="table-card">
        <el-table
          :data="samples"
          v-loading="loading"
          stripe
          border
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="50" />

          <!-- 寄样状态 -->
          <el-table-column :label="$t('samplePublic.shippingStatus')" width="160">
            <template #default="{ row }">
              <div class="sample-status" @click="openStatusEdit(row)">
                <el-tag 
                  :type="getSampleStatusType(row.sampleStatus)" 
                  size="default"
                  class="status-tag clickable"
                >
                  {{ getSampleStatusText(row.sampleStatus) }}
                </el-tag>
                <el-icon class="edit-icon"><Edit /></el-icon>
              </div>
              <div v-if="row.sampleStatus === 'refused' && row.refusalReason" class="refusal-reason">
                {{ $t('samplePublic.reason') }}{{ row.refusalReason }}
              </div>
              <!-- 已寄样时显示物流信息 -->
              <div v-if="row.sampleStatus === 'sent'" class="sent-info">
                <span v-if="row.logisticsCompany">{{ row.logisticsCompany }}</span>
                <span v-if="row.logisticsCompany && row.trackingNumber"> - </span>
                <span v-if="row.trackingNumber" class="tracking-no">{{ row.trackingNumber }}</span>
              </div>
              <div v-if="row.shippingDate" class="shipping-date">
                {{ $t('samplePublic.shipping') }}{{ formatDate(row.shippingDate) }}
              </div>
            </template>
          </el-table-column>

          <!-- 投流开关 -->
          <el-table-column :label="$t('samplePublic.adPromotion')" width="100">
            <template #default="{ row }">
              <el-switch
                v-model="row.isAdPromotion"
                @change="handleAdPromotionChange(row)"
              />
            </template>
          </el-table-column>

          <!-- 投流码 -->
          <el-table-column :label="$t('samplePublic.streamCode')" width="100">
            <template #default="{ row }">
              <span class="stream-code">{{ row.videoStreamCode || '--' }}</span>
            </template>
          </el-table-column>

          <!-- 申请日期 -->
          <el-table-column :label="$t('samplePublic.applicationDate')" width="120" prop="date" sortable>
            <template #default="{ row }">
              {{ row.date ? formatDate(row.date) : '--' }}
            </template>
          </el-table-column>

          <!-- 商品图片 -->
          <el-table-column :label="$t('samplePublic.productImage')" width="60" align="center">
            <template #default="{ row }">
              <img 
                v-if="row.productImage" 
                :src="row.productImage" 
                class="product-thumb"
                @error="(e) => e.target.style.display = 'none'"
              />
              <span v-else>--</span>
            </template>
          </el-table-column>

          <!-- 商品信息 -->
          <el-table-column :label="$t('samplePublic.productInfo')" min-width="200">
            <template #default="{ row }">
              <div class="product-info">
                <div class="product-name">{{ row.productName || '--' }}</div>
                <div class="product-id">{{ $t('samplePublic.productId') }}{{ row.productId || '--' }}</div>
              </div>
            </template>
          </el-table-column>

          <!-- 达人信息 -->
          <el-table-column :label="$t('samplePublic.influencerInfo')" min-width="260">
            <template #default="{ row }">
              <div class="influencer-info">
                <div class="influencer-account">
                  <span class="tiktok-id">{{ row.influencerAccount || '--' }}</span>
                </div>
                <div class="influencer-stats">
                  <el-tooltip :content="$t('samplePublic.followers')" placement="top">
                    <span class="stat-item" v-if="row.followerCount">
                      <el-icon><User /></el-icon>
                      {{ row.followerCount }}
                    </span>
                  </el-tooltip>
                  <el-tooltip :content="$t('samplePublic.gmv')" placement="top">
                    <span class="stat-item gmv" v-if="row.gmv">
                      <el-icon><Money /></el-icon>
                      ฿{{ formatNumber(row.gmv) }}
                    </span>
                  </el-tooltip>
                </div>
                <!-- 收货信息 -->
                <div class="influencer-address" v-if="row.shippingInfo">
                  <el-icon><Location /></el-icon>
                  <span class="address-text">{{ row.shippingInfo }}</span>
                  <el-icon class="copy-icon" @click.stop="copyAddress(row.shippingInfo)"><CopyDocument /></el-icon>
                </div>
              </div>
            </template>
          </el-table-column>

          <!-- 视频信息 -->
          <el-table-column :label="$t('samplePublic.video')" width="140">
            <template #default="{ row }">
              <div class="video-info" v-if="row.videoLink || row.sampleImage">
                <a v-if="row.videoLink" :href="row.videoLink" target="_blank" class="video-link">
                  <el-icon><VideoCamera /></el-icon>
                  {{ $t('samplePublic.viewVideo') }}
                </a>
                <el-image 
                  v-if="row.sampleImage" 
                  :src="row.sampleImage" 
                  :preview-src-list="[row.sampleImage]"
                  fit="cover"
                  class="sample-thumb"
                >
                  <template #error>
                    <div class="image-error"><el-icon><Picture /></el-icon></div>
                  </template>
                </el-image>
              </div>
              <span v-else class="no-video">--</span>
            </template>
          </el-table-column>

          <!-- 是否出单 -->
          <el-table-column :label="$t('samplePublic.orderGenerated')" width="100">
            <template #default="{ row }">
              <el-tag :type="row.isOrderGenerated ? 'success' : 'info'" size="small">
                {{ row.isOrderGenerated ? $t('samplePublic.yes') : $t('samplePublic.no') }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadSamples"
          @current-change="loadSamples"
          style="margin-top: 20px"
        />
      </el-card>
    </div>

    <!-- 单条记录编辑寄样状态弹窗 -->
    <el-dialog
      v-model="statusDialogVisible"
      :title="$t('samplePublic.modifyShippingStatus')"
      width="400px"
      :close-on-click-modal="false"
    >
      <div class="status-edit-form">
        <div class="edit-row">
          <span class="label">{{ $t('samplePublic.influencer') }}</span>
          <span class="value">{{ currentEditRow?.influencerAccount }}</span>
        </div>
        <div class="edit-row">
          <span class="label">{{ $t('samplePublic.product') }}</span>
          <span class="value">{{ currentEditRow?.productName }}</span>
        </div>
        <div class="edit-row">
          <span class="label">{{ $t('samplePublic.shippingStatusLabel') }}</span>
          <el-select v-model="currentSampleStatus" style="width: 200px" @change="handleStatusChange">
            <el-option :label="$t('samplePublic.pending')" value="pending" />
            <el-option :label="$t('samplePublic.shipping')" value="shipping" />
            <el-option :label="$t('samplePublic.sent')" value="sent" />
            <el-option :label="$t('samplePublic.refused')" value="refused" />
          </el-select>
        </div>
        <!-- 已寄样时显示物流信息 -->
        <template v-if="currentSampleStatus === 'sent'">
          <div class="edit-row">
            <span class="label">物流公司</span>
            <el-select v-model="currentLogisticsCompany" placeholder="Select logistics company" style="width: 200px">
              <el-option
                v-for="opt in logisticsCompanyOptions"
                :key="opt._id"
                :label="opt.name"
                :value="opt.code"
              />
            </el-select>
          </div>
          <div class="edit-row">
            <span class="label">快递单号</span>
            <el-input 
              v-model="currentTrackingNumber" 
              placeholder="Enter tracking number" 
              style="width: 200px"
              :required="currentLogisticsCompany !== 'default'"
            />
          </div>
        </template>
      </div>
      <template #footer>
        <el-button @click="statusDialogVisible = false">{{ $t('samplePublic.cancel') }}</el-button>
        <el-button type="primary" @click="confirmStatusUpdate" :loading="statusUpdateLoading">
          {{ $t('samplePublic.confirm') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Edit, ArrowDown, User, VideoCamera, Picture, Money, Location, CopyDocument } from '@element-plus/icons-vue'
import axios from 'axios'

const { t } = useI18n()
const route = useRoute()
const API_BASE = '/api'

// 状态
const loading = ref(false)
const error = ref(null)
const companyInfo = ref(null)
const shopInfo = ref(null)
const logoLoadError = ref(false)
const samples = ref([])
const selectedSamples = ref([])

// 搜索表单
const searchForm = reactive({
  sampleStatus: 'pending', // 默认待审核
  isOrderGenerated: null,
  date: '',
  productName: '',
  influencerAccount: '',  // 达人ID
  productId: ''           // 商品ID
})

// 分页
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 单条编辑弹窗
const statusDialogVisible = ref(false)
const currentEditRow = ref(null)
const currentSampleStatus = ref('')
const currentLogisticsCompany = ref('')  // 存储 code 值
const currentTrackingNumber = ref('')
const statusUpdateLoading = ref(false)
const logisticsCompanyOptions = ref([])  // 物流公司选项列表

// 加载物流公司列表
const loadLogisticsCompanies = async () => {
  try {
    const res = await axios.get(`${API_BASE}/base-data`, { params: { type: 'trackingUrl', limit: 100 } })
    logisticsCompanyOptions.value = res.data.data || []
  } catch (error) {
    console.error('Load logistics companies error:', error)
    logisticsCompanyOptions.value = []
  }
}

// 状态变化时处理
const handleStatusChange = () => {
  // 如果选择已寄样且没有选择物流公司，默认选择 default
  if (currentSampleStatus.value === 'sent' && !currentLogisticsCompany.value && logisticsCompanyOptions.value.length > 0) {
    const defaultOption = logisticsCompanyOptions.value.find(opt => opt.code === 'default')
    if (defaultOption) {
      currentLogisticsCompany.value = 'default'
    }
  }
}

// 工具函数
const formatNumber = (num) => {
  if (!num && num !== 0) return '0'
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatDateTime = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const getSampleStatusType = (status) => {
  const typeMap = {
    pending: 'warning',
    shipping: 'primary',
    sent: 'success',
    refused: 'danger'
  }
  return typeMap[status] || 'info'
}

const getSampleStatusText = (status) => {
  const textMap = {
    pending: t('samplePublic.pending'),
    shipping: t('samplePublic.shipping'),
    sent: t('samplePublic.sent'),
    refused: t('samplePublic.refused')
  }
  return textMap[status] || t('samplePublic.pending')
}

// 复制地址
const copyAddress = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('地址已复制')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
}

// 获取识别码
const getIdentificationCode = () => {
  return route.query.s
}

// 加载样品数据
const loadSamples = async () => {
  const identificationCode = getIdentificationCode()
  if (!identificationCode) {
    error.value = t('samplePublic.missingCode')
    return
  }

  loading.value = true
  try {
    const params = {
      s: identificationCode,
      page: pagination.page,
      limit: pagination.limit,
      sampleStatus: searchForm.sampleStatus || undefined,
      isOrderGenerated: searchForm.isOrderGenerated ?? undefined,
      date: searchForm.date || undefined,
      productName: searchForm.productName || undefined,
      influencerAccount: searchForm.influencerAccount || undefined,
      productId: searchForm.productId || undefined
    }

    // 移除空值参数
    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === '') {
        delete params[key]
      }
    })

    const res = await axios.get(`${API_BASE}/public/samples`, { params })

    if (res.data.success) {
      companyInfo.value = res.data.data.company
      shopInfo.value = res.data.data.shop
      samples.value = res.data.data.samples
      pagination.total = res.data.data.pagination.total
      error.value = null
    } else {
      error.value = res.data.message || '加载失败'
    }
  } catch (err) {
    console.error('Load samples error:', err)
    error.value = err.response?.data?.message || t('samplePublic.networkError')
  } finally {
    loading.value = false
  }
}

// 重置搜索
const resetSearch = () => {
  searchForm.sampleStatus = 'pending'
  searchForm.isOrderGenerated = null
  searchForm.date = ''
  searchForm.productName = ''
  searchForm.influencerAccount = ''
  searchForm.productId = ''
  pagination.page = 1
  loadSamples()
}

// 重新加载
const retryLoad = () => {
  error.value = null
  loadSamples()
}

// 选择变化
const handleSelectionChange = (selection) => {
  selectedSamples.value = selection
}

// 打开单条状态编辑
const openStatusEdit = async (row) => {
  currentEditRow.value = row
  currentSampleStatus.value = row.sampleStatus || 'pending'
  // 加载物流公司列表
  await loadLogisticsCompanies()
  // 设置默认值：如果是新建或没有选择物流公司，选中 default
  let defaultLogistics = row.logisticsCompany || ''
  if (!defaultLogistics && logisticsCompanyOptions.value.length > 0) {
    const defaultOption = logisticsCompanyOptions.value.find(opt => opt.code === 'default')
    if (defaultOption) {
      defaultLogistics = 'default'
    }
  }
  currentLogisticsCompany.value = defaultLogistics
  currentTrackingNumber.value = row.trackingNumber || ''
  statusDialogVisible.value = true
}

// 确认单条状态更新
const confirmStatusUpdate = async () => {
  if (!currentEditRow.value) return

  // 已寄样时：选择非default时快递单号必填
  if (currentSampleStatus.value === 'sent' && currentLogisticsCompany.value !== 'default' && !currentTrackingNumber.value) {
    ElMessage.error('快递单号不能为空')
    return
  }

  statusUpdateLoading.value = true
  try {
    const identificationCode = getIdentificationCode()
    const params = {
      s: identificationCode,
      sampleStatus: currentSampleStatus.value,
      sampleIds: currentEditRow.value._id
    }
    // 已寄样时发送物流信息
    if (currentSampleStatus.value === 'sent') {
      params.logisticsCompany = currentLogisticsCompany.value
      params.trackingNumber = currentTrackingNumber.value
    }
    const res = await axios.put(`${API_BASE}/public/samples/batch`, null, { params })

    if (res.data.success) {
      ElMessage.success(t('samplePublic.updateSuccess'))
      currentEditRow.value.sampleStatus = currentSampleStatus.value
      // 更新 isSampleSent
      currentEditRow.value.isSampleSent = currentSampleStatus.value === 'sent'
      // 更新物流信息
      if (currentSampleStatus.value === 'sent') {
        currentEditRow.value.logisticsCompany = currentLogisticsCompany.value
        currentEditRow.value.trackingNumber = currentTrackingNumber.value
      }
      statusDialogVisible.value = false
    } else {
      ElMessage.error(res.data.message)
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || t('samplePublic.updateFailed'))
  } finally {
    statusUpdateLoading.value = false
  }
}

// 批量更新寄样状态
const handleBatchStatusCommand = async (status) => {
  if (selectedSamples.value.length === 0) {
    ElMessage.warning(t('samplePublic.selectItemsFirst'))
    return
  }

  try {
    await ElMessageBox.confirm(
      t('samplePublic.confirmUpdate', { count: selectedSamples.value.length, status: getSampleStatusText(status) }),
      t('samplePublic.batchUpdate'),
      { type: 'warning' }
    )

    const identificationCode = getIdentificationCode()
    const sampleIds = selectedSamples.value.map(s => s._id)

    const res = await axios.put(`${API_BASE}/public/samples/batch`, null, {
      params: {
        s: identificationCode,
        sampleStatus: status,
        sampleIds: sampleIds.join(',')
      }
    })

    if (res.data.success) {
      ElMessage.success(res.data.message)
      selectedSamples.value = []
      loadSamples()
    } else {
      ElMessage.error(res.data.message)
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.response?.data?.message || '更新失败')
    }
  }
}

// 批量更新投流开关
const handleBatchAdCommand = async (isAdPromotion) => {
  if (selectedSamples.value.length === 0) {
    ElMessage.warning(t('samplePublic.selectItemsFirst'))
    return
  }

  try {
    await ElMessageBox.confirm(
      t('samplePublic.confirmAdUpdate', { count: selectedSamples.value.length, status: isAdPromotion ? t('samplePublic.openAd') : t('samplePublic.closeAd') }),
      t('samplePublic.batchUpdate'),
      { type: 'warning' }
    )

    const identificationCode = getIdentificationCode()
    const sampleIds = selectedSamples.value.map(s => s._id)

    const res = await axios.put(`${API_BASE}/public/samples/batch`, null, {
      params: {
        s: identificationCode,
        isAdPromotion: isAdPromotion,
        sampleIds: sampleIds.join(',')
      }
    })

    if (res.data.success) {
      ElMessage.success(res.data.message)
      selectedSamples.value = []
      loadSamples()
    } else {
      ElMessage.error(res.data.message)
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.response?.data?.message || t('samplePublic.updateFailed'))
    }
  }
}

// 单个投流开关变化
const handleAdPromotionChange = async (row) => {
  try {
    const identificationCode = getIdentificationCode()

    const res = await axios.put(`${API_BASE}/public/samples/batch`, null, {
      params: {
        s: identificationCode,
        isAdPromotion: row.isAdPromotion,
        sampleIds: row._id
      }
    })

    if (res.data.success) {
      ElMessage.success(t('samplePublic.updateSuccess'))
    } else {
      ElMessage.error(res.data.message)
      // 回滚状态
      row.isAdPromotion = !row.isAdPromotion
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || t('samplePublic.updateFailed'))
    // 回滚状态
    row.isAdPromotion = !row.isAdPromotion
  }
}

onMounted(() => {
  loadSamples()
})
</script>

<style scoped>
.public-sample-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

.error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.content-container {
  max-width: 1400px;
  margin: 0 auto;
}

.shop-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 32px;
  border-radius: 12px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.header-right {
  display: flex;
  align-items: center;
}

.header-logo {
  width: 100px;
  height: auto;
  object-fit: contain;
}

.company-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.company-logo {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
  border: 2px solid rgba(255,255,255,0.3);
}

.company-logo-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
}

.company-name {
  font-size: 20px;
  font-weight: 600;
}

.divider {
  width: 1px;
  height: 40px;
  background: rgba(255,255,255,0.3);
}

.shop-info h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
}

.header-subtitle {
  font-size: 14px;
  opacity: 0.9;
}

.shop-meta {
  display: flex;
  align-items: center;
  gap: 16px;
}

.shop-meta .el-tag {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
}

.gen-time {
  font-size: 14px;
  opacity: 0.9;
}

.search-card,
.table-card {
  margin-bottom: 20px;
}

.search-form {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

/* 批量操作栏 */
.batch-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(90deg, #e6f7ff 0%, #f6ffed 100%);
  border-radius: 8px;
  margin-top: 16px;
  border: 1px solid #91d5ff;
}

.batch-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: #1890ff;
  font-size: 14px;
}

.batch-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.batch-label {
  color: #666;
  font-size: 14px;
}

/* 表格样式 */
.sample-status {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.status-tag.clickable:hover {
  opacity: 0.8;
}

.edit-icon {
  font-size: 14px;
  color: #909399;
  opacity: 0;
  transition: opacity 0.2s;
}

.sample-status:hover .edit-icon {
  opacity: 1;
}

.refusal-reason {
  font-size: 11px;
  color: #f56c6c;
  margin-top: 4px;
}

.tracking-no,
.shipping-date {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}

.stream-code {
  font-family: monospace;
  color: #e6a23c;
  font-weight: 500;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.product-thumb {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}

.product-name {
  font-weight: 500;
  color: #303133;
}

.product-id {
  font-size: 11px;
  color: #909399;
}

.influencer-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.influencer-account .tiktok-id {
  color: #6DAD19;
  font-weight: 600;
  font-size: 14px;
}

.influencer-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
  cursor: help;
}

.stat-item:hover {
  color: #409eff;
}

.stat-item.gmv {
  color: #e6a23c;
  font-weight: 500;
}

.influencer-address {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 11px;
  color: #909399;
}

.influencer-address .el-icon {
  color: #67c23a;
}

.address-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
}

.copy-icon {
  cursor: pointer;
  color: #409eff;
  font-size: 14px;
  margin-left: 4px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.copy-icon:hover {
  opacity: 1;
}

.video-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.video-link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #409eff;
  font-size: 12px;
  text-decoration: none;
}

.video-link:hover {
  text-decoration: underline;
}

.sample-thumb {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #eee;
}

.image-error {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  color: #909399;
}

.no-video {
  color: #909399;
}

/* 单条编辑弹窗 */
.status-edit-form {
  padding: 20px;
}

.edit-row {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.edit-row .label {
  width: 80px;
  color: #666;
  font-size: 14px;
}

.edit-row .value {
  flex: 1;
  color: #333;
  font-size: 14px;
}
</style>
