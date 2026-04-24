<template>
  <div class="sample-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <div class="header-actions">
            <el-button type="success" @click="showCreateDialog" v-if="hasPermission('samplesBd:create')">
              <el-icon><Plus /></el-icon>
              {{ $t('sampleBD.addNew') }}
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索筛选 -->
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item :label="$t('sampleBD.tiktokId')">
          <el-input
            v-model="searchForm.influencerAccount"
            :placeholder="$t('sampleBD.tiktokIdPlaceholder')"
            clearable
            style="width: 150px"
          />
        </el-form-item>

        <el-form-item :label="$t('sampleBD.productName')">
          <el-input
            v-model="searchForm.productName"
            :placeholder="$t('sampleBD.productNamePlaceholder')"
            clearable
            style="width: 150px"
          />
        </el-form-item>

        <el-form-item :label="$t('sampleBD.applyDate')">
          <el-date-picker
            v-model="searchForm.date"
            type="date"
            :placeholder="$t('sampleBD.selectDate')"
            clearable
            style="width: 150px"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="loadSamples">{{ $t('sampleBD.search') }}</el-button>
          <el-button @click="resetSearch">{{ $t('sampleBD.reset') }}</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table
        :data="samples"
        v-loading="loading"
        stripe
        border
        class="sample-table"
        :row-class-name="getSampleRowClassName"
      >
        <el-table-column
          label="Influencer"
          width="260"
          fixed="left"
          prop="influencerAccount"
          sortable
        >
          <template #default="{ row }">
            <div class="tiktok-id-wrapper">
              <InfluencerCell :influencer="{
                tiktokId: row.influencerAccount,
                latestFollowers: row.followerCount,
                latestGmv: row.gmv,
                avgVideoViews: row.avgVideoViews,
                monthlySalesCount: row.monthlySalesCount
              }" :showGmv="false" :showAvgViews="false" :showMonthlySales="false" />
              <el-popover
                v-if="row.duplicateCount > 0"
                placement="right"
                :width="400"
                trigger="hover"
              >
                <template #reference>
                  <div class="duplicate-badge" @click.stop>
                    <span class="badge-count">{{ row.duplicateCount }}</span>
                  </div>
                </template>
                <div class="previous-submissions-popover">
                  <div class="popover-header">
                    <h4>{{ $t('sampleBD.historyRecords', { count: row.duplicateCount }) }}</h4>
                  </div>
                  <div class="popover-content">
                    <!-- 商品和达人信息只展示一次 -->
                    <div class="summary-info" v-if="row.previousSubmissions && row.previousSubmissions.length > 0">
                      <div class="summary-item">
                        <span class="summary-label">{{ $t('sampleBD.productNameDetail') }}</span>
                        <span class="summary-value">{{ row.previousSubmissions[0].productName || '-' }}</span>
                      </div>
                      <div class="summary-item">
                        <span class="summary-label">{{ $t('sampleBD.tiktokIdDetail') }}</span>
                        <span class="summary-value">{{ row.previousSubmissions[0].influencerAccount || '-' }}</span>
                      </div>
                    </div>
                    
                    <!-- 申请记录列表 -->
                    <div class="submissions-list" style="max-height: 280px; overflow-y: auto; margin-top: 16px;">
                      <div 
                        v-for="(sub, index) in row.previousSubmissions" 
                        :key="index"
                        class="submission-item"
                        @click="openSubmissionDetail(sub)"
                        style="cursor: pointer; padding: 12px; border-bottom: 1px solid #f0f0f0;"
                      >
                        <div class="submission-row">
                          <div class="submission-cell">
                            <span class="cell-label">{{ $t('sampleBD.applyDateDetail') }}</span>
                            <span class="cell-value">{{ formatDate(sub.date) }}</span>
                          </div>
                          <div class="submission-cell">
                            <span class="cell-label">{{ $t('sampleBD.approvalStatus') }}</span>
                            <span class="cell-value">
                              <el-tag :type="getSampleStatusType(sub.sampleStatus)" size="small" class="status-tag">
                                {{ getSampleStatusText(sub.sampleStatus) }}
                              </el-tag>
                              <span class="salesman-text" v-if="sub.salesman">{{ sub.salesman }}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </el-popover>
              <el-tag v-if="row.isBlacklistedInfluencer" type="danger" size="small" style="margin-left: 4px">{{ $t('sampleBD.blacklist') }}</el-tag>
            </div>
          </template>
        </el-table-column>

        <!-- 寄样状态 - 锁定左边 -->
        <el-table-column
          :label="$t('sampleBD.shippingStatus')"
          width="160"
          fixed="left"
        >
          <template #default="{ row }">
            <div class="sample-status">
              <el-tag :type="getSampleStatusType(row.sampleStatus)" size="small">
                {{ getSampleStatusText(row.sampleStatus) }}
              </el-tag>
              <!-- 已寄样时显示物流信息 -->
              <div v-if="row.sampleStatus === 'sent'" class="sent-info">
                <span v-if="row.logisticsCompany" class="logistics-company-small">
                  {{ getLogisticsCompanyText(row.logisticsCompany) }}
                </span>
                <span v-if="row.logisticsCompany && row.trackingNumber"> - </span>
                <span v-if="row.trackingNumber" class="tracking-no">{{ row.trackingNumber }}</span>
              </div>
              <div v-if="row.sampleStatus === 'refused' && row.refusalReason" class="refusal-reason">
                {{ $t('sampleBD.refusalReasonDetail') }}: {{ row.refusalReason }}
              </div>
              <div v-if="row.shippingDate" class="shipping-date">
                {{ formatDate(row.shippingDate) }}
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 履约情况 -->
        <el-table-column
          :label="$t('sampleBD.fulfillment')"
          width="240"
        >
          <template #default="{ row }">
            <div class="fulfillment-info">
              <span
                class="clickable-link"
                :class="{ 'has-orders': row.orderCount > 0 }"
                @click="goToOrders(row)"
              >
                <el-tag
                  :type="row.isOrderGenerated ? 'success' : 'warning'"
                  size="small"
                >
                  {{ row.isOrderGenerated ? $t('sampleBD.orderGenerated') : $t('sampleBD.noOrder') }}
                </el-tag>
                <span v-if="row.isOrderGenerated && row.orderCount" class="order-count-badge">
                  {{ row.orderCount > 99 ? '...' : row.orderCount }}
                </span>
              </span>
            </div>
          </template>
        </el-table-column>

        <!-- 履约视频 - 带编辑功能 -->
        <el-table-column
          :label="$t('sampleBD.fulfillmentVideo')"
          width="320"
        >
          <template #default="{ row }">
            <FulfillmentVideoCell
              :videos="row.videos"
              :editable="true"
              @edit="(video, idx) => openVideoEditDialog(row, video, idx)"
              @delete="(video, idx) => handleDeleteVideo(row, video, idx)"
              @add="openVideoAddDialog(row)"
            />
          </template>
        </el-table-column>

        <!-- 申请日期 - 不再锁定 -->
        <el-table-column
          :label="$t('sampleBD.applicationDate')"
          width="120"
          prop="date"
          sortable
        >
          <template #default="{ row }">
            <div class="column-text">{{ row.date ? formatDate(row.date) : '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column
          :label="$t('sampleBD.productInfo')"
          width="300"
          prop="productName"
          sortable
        >
          <template #default="{ row }">
            <ProductCell :product="{
              image: row.productImage,
              id: row.productId_display || row.productId,
              productId: row.productId,
              tiktokProductId: row.productId,
              name: row.productName,
              shopName: row.shopName
            }" />
          </template>
        </el-table-column>



        <el-table-column
          :label="$t('sampleBD.addressInfo')"
          width="200"
        >
          <template #default="{ row }">
            <div class="shipping-info">
              <el-tooltip :content="row.shippingInfo" placement="top">
                <div class="truncate-text">{{ row.shippingInfo || '--' }}</div>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          :label="$t('sampleBD.receiveDate')"
          width="120"
          prop="receivedDate"
          sortable
        >
          <template #default="{ row }">
            <div class="column-text">{{ row.receivedDate ? formatDate(row.receivedDate) : '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column
          :label="$t('sampleBD.operation')"
          width="120"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button link type="primary" @click="viewDetail(row)">{{ $t('sampleBD.detail') }}</el-button>
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

    <!-- 详情对话框 - 参照达人详情弹层重新设计 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="currentSample?.isBlacklistedInfluencer ? $t('sampleBD.influencerBlacklisted') : $t('sampleBD.sampleDetail')"
      width="900px"
      :class="currentSample?.isBlacklistedInfluencer ? 'detail-dialog-blacklist' : ''"
      class="business-detail-dialog"
    >
      <div v-if="currentSample" :class="currentSample.isBlacklistedInfluencer ? 'detail-content-blacklist' : 'detail-content'">
        <!-- 黑名单警告 -->
        <el-alert
          v-if="currentSample.isBlacklistedInfluencer"
          :title="$t('sampleBD.blacklistWarning')"
          type="error"
          :closable="false"
          show-icon
          style="margin-bottom: 24px"
        />

        <!-- 头部区域 -->
        <div class="detail-header">
          <div class="detail-avatar">
            <el-image 
              v-if="currentSample.sampleImage" 
              :src="currentSample.sampleImage" 
              style="width: 64px; height: 64px; border-radius: 12px;" 
              fit="cover" 
              :preview-src-list="[currentSample.sampleImage]" 
            />
            <el-icon v-else :size="48"><Box /></el-icon>
          </div>
          <div class="detail-title">
            <div class="detail-id-row">
              <span class="detail-tiktok-id">{{ currentSample.influencerAccount || '-' }}</span>
              <el-tag :type="getSampleStatusType(currentSample.sampleStatus)" size="small">
                {{ getSampleStatusText(currentSample.sampleStatus) }}
              </el-tag>
              <el-tag v-if="currentSample.isAdPromotion" type="success" size="small">{{ $t('sampleBD.adPromoted') }}</el-tag>
              <el-tag v-if="currentSample.isOrderGenerated" type="warning" size="small">{{ $t('sampleBD.orderGenerated') }}</el-tag>
            </div>
            <div class="detail-name">{{ currentSample.productName || '-' }}</div>
            <div class="detail-bd">
              <span class="bd-label">商品ID:</span>
              <span>{{ currentSample.productId || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- 核心指标卡片 -->
        <div class="detail-stats">
          <div class="stat-card">
            <div class="stat-label">
              <el-tooltip :content="$t('sampleBD.followerCountLabel')" placement="top" :show-after="300">
                <span>FV</span>
              </el-tooltip>
            </div>
            <div class="stat-value">{{ formatNumber(currentSample.followerCount || 0) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">
              <el-tooltip :content="$t('sampleBD.gmvLabel')" placement="top" :show-after="300">
                <span>GMV</span>
              </el-tooltip>
            </div>
            <div class="stat-value">{{ currentDefaultCurrencySymbol }}{{ formatNumber(currentSample.gmv || 0) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">
              <el-tooltip :content="$t('sampleBD.monthlySalesLabel')" placement="top" :show-after="300">
                <span>MSS</span>
              </el-tooltip>
            </div>
            <div class="stat-value">{{ formatNumber(currentSample.monthlySalesCount || 0) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">
              <el-tooltip :content="$t('sampleBD.avgViewsLabel')" placement="top" :show-after="300">
                <span>APV</span>
              </el-tooltip>
            </div>
            <div class="stat-value">{{ formatNumber(currentSample.avgVideoViews || 0) }}</div>
          </div>
        </div>

        <!-- 双卡片布局 -->
        <div class="detail-info-grid">
          <!-- 达人信息卡片 -->
          <div class="info-section">
            <div class="section-title">{{ $t('sampleBD.influencerInfo') }}</div>
            <div class="info-row">
              <span class="info-label">{{ $t('sampleBD.tiktokIdLabel') }}</span>
              <span class="info-value">{{ currentSample.influencerAccount || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">BD</span>
              <span class="info-value">{{ currentSample.bd || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('sampleBD.shippingInfoSection') }}</span>
              <span class="info-value">{{ currentSample.shippingInfo || '-' }}</span>
            </div>
          </div>
          
          <!-- 申样结果卡片 -->
          <div class="info-section">
            <div class="section-title">{{ $t('sampleBD.sampleResult') }}</div>
            <div class="info-row">
              <span class="info-label">{{ $t('sampleBD.applyDateLabel') }}</span>
              <span class="info-value">{{ currentSample.date ? formatDate(currentSample.date) : '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('sampleBD.sampleStatusLabel') }}</span>
              <span class="info-value">
                <el-tag :type="getSampleStatusType(currentSample.sampleStatus)" size="small">
                  {{ getSampleStatusText(currentSample.sampleStatus) }}
                </el-tag>
              </span>
            </div>
            <div class="info-row" v-if="currentSample.videoLink">
              <span class="info-label">{{ $t('sampleBD.videoLink') }}</span>
              <span class="info-value">
                <el-link :href="currentSample.videoLink" target="_blank" type="primary" underline="hover">
                  {{ $t('sampleBD.viewVideo') }}
                </el-link>
              </span>
            </div>
            <div class="info-row" v-if="currentSample.videoStreamCode">
              <span class="info-label">{{ $t('sampleBD.streamCodeLabel') }}</span>
              <span class="info-value">{{ currentSample.videoStreamCode }}</span>
            </div>
          </div>
        </div>
        
        <!-- 创建时间信息 -->
        <div class="created-info">
          <span class="created-label">{{ $t('sampleBD.createTime') }}</span>
          <span class="created-value">{{ currentSample.createdAt ? formatDate(currentSample.createdAt) : '-' }}</span>
        </div>
      </div>
    </el-dialog>

    <!-- 新增对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      :title="$t('sampleBD.addNewTitle')"
      width="700px"
    >
      <el-form
        :model="createForm"
        :rules="createRules"
        ref="createFormRef"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="$t('sampleBD.applyDateField')" prop="date">
              <el-date-picker
                v-model="createForm.date"
                type="date"
                :placeholder="$t('sampleBD.selectDate')"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item :label="$t('sampleBD.productInfoField')" required>
          <el-select
            v-model="createForm.productId"
            filterable
            remote
            :placeholder="$t('sampleBD.selectProductPlaceholder')"
            :remote-method="searchProducts"
            :loading="productLoading"
            style="width: 100%"
            @change="handleProductSelect"
          >
            <el-option
              v-for="product in cooperationProducts"
              :key="product._id"
              :label="`${product.name || product.productName} (${product.tiktokProductId || product.productId || product._id})`"
              :value="product._id"
            >
              <span>{{ product.name || product.productName }}</span>
              <span style="color: #6DAD19; font-size: 12px;"> - {{ product.tiktokProductId || product.productId || product._id }}</span>
            </el-option>
          </el-select>
          <el-input v-model="createForm.productName" type="hidden" />
        </el-form-item>

        <el-form-item :label="$t('sampleBD.tiktokIdField')" prop="influencerId" class="tiktok-label">
          <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
            <el-select
              v-model="createForm.influencerId"
              filterable
              remote
              :placeholder="$t('sampleBD.tiktokIdPlaceholder')"
              :remote-method="searchInfluencers"
              :loading="influencerLoading"
              style="flex: 1;"
            >
              <el-option
                v-for="inf in influencerOptions"
                :key="inf._id"
                :label="`${inf.tiktokId} (${inf.tiktokName || '-'})`"
                :value="inf._id"
              >
                <span>{{ inf.tiktokId }}</span>
                <span style="color: #999; font-size: 12px; margin-left: 8px;">{{ inf.tiktokName || '' }}</span>
              </el-option>
            </el-select>
            <span v-if="selectedInfluencer" style="font-size: 12px; white-space: nowrap;">
              <span :style="{ color: isCurrentUserMaintainer(selectedInfluencer) ? '#67c23a' : '#e6a23c' }">
                {{ selectedInfluencer.latestMaintainerId?.realName || selectedInfluencer.latestMaintainerId?.username || '无' }}
              </span>
              <span style="color: #666;"> ({{ selectedInfluencer.poolType === 'public' ? 'public' : 'private' }})</span>
            </span>
          </div>
        </el-form-item>

        <!-- 移除了粉丝数/GMV/月销量/均播等冗余字段，数据从达人表populate自动获取 -->

        <el-form-item :label="$t('sampleBD.addressInfoField')" prop="shippingInfo">
          <el-input
            v-model="createForm.shippingInfo"
            type="textarea"
            :rows="2"
            :placeholder="$t('sampleBD.addressPlaceholder')"
          />
        </el-form-item>

        <!-- 移除了样品图片字段，现在从Product表populate自动获取 -->
      </el-form>

      <template #footer>
        <el-button @click="createDialogVisible = false">{{ $t('sampleBD.cancelBtn') }}</el-button>
        <el-button type="primary" @click="handleCreate" :loading="creating">{{ $t('sampleBD.confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- 履约内容编辑对话框（新增/编辑视频） -->
    <el-dialog
      v-model="videoEditDialogVisible"
      :title="videoEditForm.videoId ? $t('sampleBD.editVideo') : $t('sampleBD.addVideo')"
      width="450px"
    >
      <el-form :model="videoEditForm" label-width="100px" :rules="videoEditRules" ref="videoEditFormRef">
        <el-form-item :label="$t('sampleBD.videoAddress')" prop="videoLink">
          <el-input v-model="videoEditForm.videoLink" :placeholder="$t('sampleBD.videoLinkPlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('sampleBD.streamCodeField')">
          <el-input v-model="videoEditForm.videoStreamCode" :placeholder="$t('sampleBD.streamCodePlaceholder')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="videoEditDialogVisible = false">{{ $t('sampleBD.cancelBtn') }}</el-button>
        <el-button type="primary" @click="handleVideoEditSave" :loading="videoEditLoading">{{ $t('sampleBD.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
import request from '@/utils/request'
import { Plus, Loading, InfoFilled, Box, TrendCharts, User, Edit, Delete } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import AuthManager from '@/utils/auth'
import InfluencerCell from '@/components/InfluencerCell.vue'
import FulfillmentVideoCell from '@/components/FulfillmentVideoCell.vue'

const userStore = useUserStore()

// 权限检查
const hasPermission = (perm) => AuthManager.hasPermission(perm)

const loading = ref(false)
const creating = ref(false)
const createDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const detailActiveTab = ref('basic')  // 详情弹层当前标签页
// 履约内容（视频）编辑弹层
const videoEditDialogVisible = ref(false)
const videoEditFormRef = ref(null)
const videoEditForm = reactive({
  sampleId: '',
  videoId: null, // null表示新增，字符串表示编辑视频的_id
  videoLink: '',
  videoStreamCode: ''
})
const videoEditLoading = ref(false)

const videoEditRules = {
  videoLink: [{ required: true, message: () => t('sampleBD.videoLinkRequired'), trigger: 'blur' }]
}

const samples = ref([])
const currentSample = ref(null)
const influencerDetail = ref(null)
const popoverInfluencer = ref(null)
const popoverLoading = ref(false)
const createFormRef = ref(null)
const cooperationProducts = ref([])
const productLoading = ref(false)

const searchForm = reactive({
  date: '',
  productName: '',
  influencerAccount: '',
  isSampleSent: null,
  isOrderGenerated: null
})

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

const createForm = reactive({
  date: '',
  productId: '',           // ★ ObjectId (ref Product)
  influencerId: '',         // ★ ObjectId (ref Influencer)
  shippingInfo: '',
  isSampleSent: false,
  trackingNumber: '',
  shippingDate: '',
  logisticsCompany: '',
  isOrderGenerated: false,
  currency: ''              // 货币单位
})

// 达人搜索相关（重构后用远程搜索选择器替代手动输入）
const influencerLoading = ref(false)
const influencerOptions = ref([])
const currencyList = ref([])

const loadCurrencies = async () => {
  try {
    const res = await request.get('/base-data', {
      params: { type: 'priceUnit', limit: 100 }
    })
    currencyList.value = res.data || []
    // 设置默认货币
    const defaultCurrency = currencyList.value.find(c => c.isDefault)
    if (defaultCurrency) {
      createForm.currency = defaultCurrency.code
    }
  } catch (error) {
    console.error('Load currencies error:', error)
  }
}

// 获取当前默认货币符号
const currentDefaultCurrencySymbol = computed(() => {
  const defaultCurrency = currencyList.value.find(c => c.isDefault)
  return defaultCurrency?.symbol || '฿'
})

const createRules = {
  date: [{ required: true, message: t('common.select') + t('sampleBD.applyDate'), trigger: 'change' }],
  productId: [{ required: true, message: t('sampleBD.selectProductPlaceholder'), trigger: 'change' }],
  influencerId: [{ required: true, message: t('sampleBD.selectInfluencer'), trigger: 'change' }]
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

const getTodayDate = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatNumber = (num) => {
  if (!num) return '0'
  return num.toLocaleString()
}

const truncateText = (text, maxLength) => {
  if (!text) return '--'
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const getSampleRowClassName = ({ row }) => {
  return row.isBlacklistedInfluencer ? 'blacklist-row' : ''
}

// 获取寄样状态类型
const getSampleStatusType = (status) => {
  const typeMap = {
    pending: 'warning',    // 待审核 - 黄色
    shipping: 'primary',   // 寄样中 - 蓝色
    sent: 'success',       // 已寄样 - 绿色
    refused: 'danger'      // 不合作 - 红色
  }
  return typeMap[status] || 'info'
}

// 获取寄样状态文本
const getSampleStatusText = (status) => {
  const textMap = {
    pending: t('sampleBD.pending'),
    shipping: t('sampleBD.shipping'),
    sent: t('sampleBD.sent'),
    refused: t('sampleBD.refused')
  }
  return textMap[status] || t('sampleBD.pending')
}

// 获取物流公司显示文本
const getLogisticsCompanyText = (company) => {
  if (company === 'default') {
    return t('videos.defaultLogistics')
  } else if (company === 'other') {
    return t('videos.otherLogistics')
  } else {
    return company || ''
  }
}

const loadSamples = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      companyId: userStore.companyId,
      ...searchForm
      // salesmanId 由后端数据权限中间件自动设置
    }
    const res = await request.get('/samples', { params })
    samples.value = res.samples
    pagination.total = res.pagination.total
  } catch (error) {
    console.error('Load samples error:', error)
    ElMessage.error(t('sampleBD.loadFailed'))
  } finally {
    loading.value = false
  }
}

const resetSearch = () => {
  Object.assign(searchForm, {
    date: '',
    productName: '',
    influencerAccount: '',
    isSampleSent: null,
    isOrderGenerated: null
  })
  pagination.page = 1
  loadSamples()
}

// 加载产品列表
const loadCooperationProducts = async () => {
  try {
    const res = await request.get('/products', { params: { companyId: userStore.companyId, status: 'active', limit: 100 } })
    cooperationProducts.value = res.data || res.products || []
  } catch (error) {
    console.error('加载产品失败:', error)
  }
}

const searchProducts = async (query) => {
  if (!query) {
    loadCooperationProducts()
    return
  }
  productLoading.value = true
  try {
    const res = await request.get('/products', {
      params: {
        companyId: userStore.companyId,
        status: 'active',
        keyword: query,
        limit: 20
      }
    })
    cooperationProducts.value = res.data || res.products || []
  } catch (error) {
    console.error('搜索商品失败:', error)
  } finally {
    productLoading.value = false
  }
}

const handleProductSelect = (productId) => {
  const product = cooperationProducts.value.find(p => p._id === productId)
  if (product) {
    createForm.productId = product._id
  }
}

// 选中的达人信息
const selectedInfluencer = computed(() => {
  if (!createForm.influencerId) return null
  return influencerOptions.value.find(inf => inf._id === createForm.influencerId) || null
})

// ★ 搜索达人（重构后：远程搜索选择器）
let searchTimeout = null
const searchInfluencers = async (query) => {
  // 清除之前的定时器
  if (searchTimeout) {
    clearTimeout(searchTimeout)
    searchTimeout = null
  }

  // 空查询时清空选项
  if (!query) {
    influencerOptions.value = []
    return
  }

  // 最小长度验证（至少2个字符）
  if (query.length < 2) {
    influencerOptions.value = []
    return
  }

  // 防抖：延迟300ms执行搜索
  searchTimeout = setTimeout(async () => {
    influencerLoading.value = true
    try {
      const res = await request.get('/influencer-managements', {
        params: {
          companyId: userStore.companyId,
          keyword: query,
          limit: 20,
          ignoreDataScope: true  // 放开maintainerId限制，允许查看所有达人
        }
      })
      influencerOptions.value = res.influencers || []
    } catch (error) {
      console.error('搜索达人失败:', error)
    } finally {
      influencerLoading.value = false
    }
  }, 300)
}

const showCreateDialog = () => {
  // BD页面默认salesmanId由后端数据权限自动填充，前端不传或传当前用户_id
  Object.assign(createForm, {
    date: getTodayDate(),
    productId: '',
    influencerId: '',
    shippingInfo: '',
    isSampleSent: false,
    trackingNumber: '',
    shippingDate: '',
    logisticsCompany: '',
    isOrderGenerated: false
  })
  createDialogVisible.value = true
  loadCooperationProducts()
}

const handleCreate = async () => {
  if (!createFormRef.value) return

  await createFormRef.value.validate(async (valid) => {
    if (!valid) return

    // ★ 先检查黑名单达人（通过选中的influencerId查找）
    try {
      const selectedInf = influencerOptions.value.find(i => i._id === createForm.influencerId)
      if (selectedInf && selectedInf.isBlacklisted) {
        ElMessage.error(t('sampleBD.blacklistInfluencerWarning'))
        return
      }
      if (selectedInf) {
        const blacklistRes = await request.get(`/influencer-managements/blacklist/check/${selectedInf.tiktokId}`, {
          params: { companyId: userStore.companyId }
        })
        if (blacklistRes.isBlacklisted) {
          ElMessage.error(t('sampleBD.blacklistInfluencerWarning'))
          return
        }
      }
    } catch (blError) {
      console.error('检查黑名单失败:', blError)
    }

    creating.value = true
    try {
      // ★ 构造新的请求体（只包含重构后需要的字段）
      const submitPayload = {
        date: createForm.date,
        productId: createForm.productId,       // ObjectId
        influencerId: createForm.influencerId, // ObjectId
        shippingInfo: createForm.shippingInfo,
        isSampleSent: createForm.isSampleSent,
        trackingNumber: createForm.trackingNumber,
        shippingDate: createForm.shippingDate,
        logisticsCompany: createForm.logisticsCompany,
        isOrderGenerated: createForm.isOrderGenerated
      }

      await request.post('/samples', submitPayload)
      ElMessage.success(t('sampleBD.createSuccess'))
      createDialogVisible.value = false
      loadSamples()
    } catch (error) {
      console.error('Create sample error:', error)
      ElMessage.error(error.response?.data?.message || t('sampleBD.createFailed'))
    } finally {
      creating.value = false
    }
  })
}

const viewSampleDetail = async (sample) => {
  currentSample.value = sample
  detailDialogVisible.value = true

  if (sample.influencerAccount) {
    try {
      const res = await request.get('/influencer-managements', {
        params: {
          companyId: userStore.companyId,
          keyword: sample.influencerAccount,
          limit: 1
        }
      })
      const influencers = res.influencers || []
      const matched = influencers.find(i => i.tiktokId === sample.influencerAccount)
      if (matched) {
        influencerDetail.value = matched
      } else {
        influencerDetail.value = null
      }
    } catch (error) {
      console.error('获取达人信息失败:', error)
      influencerDetail.value = null
    }
  } else {
    influencerDetail.value = null
  }
}

const loadInfluencerPopover = async (row) => {
  popoverInfluencer.value = null
  if (!row.influencerAccount) return

  popoverLoading.value = true
  try {
    const res = await request.get('/influencer-managements', {
      params: {
        companyId: userStore.companyId,
        keyword: row.influencerAccount,
        limit: 10
      }
    })
    const influencers = res.influencers || res.data || []
    const matched = influencers.find(i => i.tiktokId === row.influencerAccount)
    popoverInfluencer.value = matched || null
  } catch (error) {
    console.error('获取达人信息失败:', error)
    popoverInfluencer.value = null
  } finally {
    popoverLoading.value = false
  }
}

const viewDetail = (sample) => {
  viewSampleDetail(sample)
}

// 复制视频链接到剪贴板
const copyVideoLink = async (videoLink) => {
  if (!videoLink) {
    ElMessage.warning(t('sampleBD.noVideoLinkToCopy'))
    return
  }
  try {
    await navigator.clipboard.writeText(videoLink)
    ElMessage.success(t('sampleBD.copySuccess'))
  } catch (error) {
    console.error('Copy video link error:', error)
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = videoLink
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      ElMessage.success(t('sampleBD.copySuccess'))
    } catch (e) {
      ElMessage.error(t('sampleBD.copyFailed'))
    }
    document.body.removeChild(textarea)
  }
}

// 复制投流码到剪贴板
const copyStreamCode = async (streamCode) => {
  if (!streamCode) {
    ElMessage.warning(t('sampleBD.noStreamCodeToCopy'))
    return
  }
  try {
    await navigator.clipboard.writeText(streamCode)
    ElMessage.success(t('sampleBD.copyStreamCodeSuccess'))
  } catch (error) {
    console.error('Copy stream code error:', error)
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = streamCode
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      ElMessage.success(t('sampleBD.copyStreamCodeSuccess'))
    } catch (e) {
      ElMessage.error(t('sampleBD.copyStreamCodeFailed'))
    }
    document.body.removeChild(textarea)
  }
}

// 打开视频编辑弹窗（编辑已有视频）
const openVideoEditDialog = (sample, video, index) => {
  Object.assign(videoEditForm, {
    sampleId: sample._id,
    videoId: video._id || null,
    videoLink: video.videoLink || '',
    videoStreamCode: video.videoStreamCode || ''
  })
  videoEditDialogVisible.value = true
}

// 打开视频新增弹窗
const openVideoAddDialog = (sample) => {
  Object.assign(videoEditForm, {
    sampleId: sample._id,
    videoId: null,
    videoLink: '',
    videoStreamCode: ''
  })
  videoEditDialogVisible.value = true
}

// ★ 保存视频信息（新增或编辑）
const handleVideoEditSave = async () => {
  if (!videoEditFormRef.value) return

  await videoEditFormRef.value.validate(async (valid) => {
    if (!valid) return

    videoEditLoading.value = true
    try {
      const payload = {
        videoLink: videoEditForm.videoLink,
        videoStreamCode: videoEditForm.videoStreamCode || ''
      }

      if (videoEditForm.videoId) {
        // 编辑模式 - 更新指定视频
        await request.put(`/videos/${videoEditForm.videoId}`, payload)
      } else {
        // 新增模式 - 添加新视频
        await request.post(`/samples/${videoEditForm.sampleId}/videos`, payload)
      }

      ElMessage.success(t('sampleBD.saveSuccess'))
      videoEditDialogVisible.value = false
      loadSamples()
    } catch (error) {
      console.error('Save video error:', error)
      ElMessage.error(error.response?.data?.message || t('sampleBD.saveFailed'))
    } finally {
      videoEditLoading.value = false
    }
  })
}

// ★ 删除视频
const handleDeleteVideo = async (sample, video, index) => {
  try {
    await ElMessageBox.confirm(t('sampleBD.confirmDeleteVideo'), t('sampleBD.confirmDeleteVideo'), {
      type: 'warning'
    })
    await request.delete(`/videos/${video._id}`)
    ElMessage.success(t('sampleBD.deleteSuccess'))
    loadSamples()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete video error:', error)
      ElMessage.error(t('sampleBD.deleteFailed'))
    }
  }
}

// 跳转到TikTok订单页面
const goToOrders = async (sample) => {
  if (!sample.isOrderGenerated) return
  
  router.push({
    path: '/report-orders',
    query: {
      influencerAccount: sample.influencerAccount,
      productId: sample.productId
    }
  })
}

const openSubmissionDetail = (submission) => {
  // 找到对应的完整sample记录
  const sample = samples.value.find(s => s._id === submission.sampleId)
  if (sample) {
    viewSampleDetail(sample)
  } else {
    // 如果找不到，尝试通过ID获取
    ElMessage.info(t('videos.loadingDetail'))
    // 这里可以添加通过ID获取sample详情的逻辑
  }
}

// 判断维护者是否为当前用户
const isCurrentUserMaintainer = (influencer) => {
  if (!influencer || !userStore.user) return false
  const maintainerId = influencer.latestMaintainerId?._id || influencer.latestMaintainerId
  const currentUserId = userStore.user._id
  return maintainerId === currentUserId
}

onMounted(() => {
  loadSamples()
  loadCurrencies()
})
</script>

<style scoped>
.sample-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.search-form {
  margin-bottom: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.sample-table {
  border-radius: 8px;
  overflow: hidden;
}

.sample-table :deep(.el-table__header-wrapper) {
  background: #f5f7fa;
}

.sample-table :deep(.el-table__header th) {
  background: #f5f7fa !important;
  color: #606266;
  font-weight: 600;
  font-size: 14px;
  border-bottom: 1px solid #ebeef5;
}

.sample-table :deep(.el-table__body tr:hover > td) {
  background: #f5f7fa !important;
}

.tiktok-id-text {
  color: #6DAD19;
  font-weight: 500;
}

.tiktok-id-cell {
  color: #6DAD19;
  font-weight: 500;
}

.tiktok-id-cell.clickable {
  cursor: pointer;
}

.tiktok-id-cell.clickable:hover {
  text-decoration: underline;
}

.tiktok-id-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tiktok-label :deep(.el-form-item__label) {
  color: #6DAD19;
  font-weight: 500;
}

.column-text {
  font-size: 13px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.product-id {
  font-size: 11px;
  color: #9e9e9e;
  font-weight: 500;
}

.product-name {
  color: #595959;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.product-name:hover {
  color: #7b1fa2;
}

.influencer-data {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.follower-count {
  font-weight: 600;
  color: #6a1b9a;
  font-size: 13px;
}

.shipping-info,
.fulfillment-info,
.promotion-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.truncate-text {
  font-size: 12px;
  color: #757575;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sample-status {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.refusal-reason {
  font-size: 10px;
  color: #f56c6c;
  margin-top: 2px;
}

.refusal-reason-detail {
  color: #f56c6c;
  font-weight: 500;
}

.tracking-no {
  font-size: 11px;
  color: #757575;
}

.shipping-date {
  font-size: 11px;
  color: #9e9e9e;
}

.fulfillment-time {
  font-size: 12px;
  color: #757575;
}

:deep(.video-item) {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  flex-wrap: nowrap !important;
  white-space: nowrap !important;
  overflow: visible !important;
  margin-bottom: 4px !important;
  min-height: 28px;
  width: 100%;
}

:deep(.video-info) {
  display: inline-flex !important;
  align-items: center !important;
  flex-wrap: nowrap !important;
  white-space: nowrap !important;
  flex-shrink: 0;
  gap: 4px;
}

:deep(.switch-wrap) {
  display: inline-flex !important;
  align-items: center !important;
  flex-wrap: nowrap !important;
  white-space: nowrap !important;
  flex-shrink: 0;
  margin-left: 8px;
  vertical-align: middle;
}

.video-link-inline {
  color: #409eff;
  text-decoration: none;
  white-space: nowrap;
}

.video-link-inline:hover {
  text-decoration: underline;
}

.stream-code-inline {
  color: #909399;
  white-space: nowrap;
}

.empty-text {
  color: #909399;
  white-space: nowrap;
}

.add-video-row {
  display: flex;
  align-items: center;
  margin-top: 4px;
  min-height: 28px;
}

.add-icon {
  cursor: pointer;
  color: #67c23a;
  font-size: 16px;
  padding: 4px;
  border-radius: 4px;
  border: 1px dashed #c2e7b0;
}

.add-icon:hover {
  background-color: #f0f9eb;
  color: #85ce61;
}

.update-info {
  font-size: 10px;
  color: #909399;
  margin-top: 2px;
}

.update-info-detail {
  font-size: 12px;
  color: #909399;
}

.edit-icon {
  cursor: pointer;
  color: #409eff;
  font-size: 14px;
  padding: 2px;
  border-radius: 4px;
}

.edit-icon:hover {
  background-color: #ecf5ff;
  color: #66b1ff;
}

.delete-icon {
  cursor: pointer;
  color: #f56c6c;
  font-size: 14px;
  padding: 2px;
  border-radius: 4px;
}

.delete-icon:hover {
  background-color: #fef0f0;
  color: #f78989;
}

.fulfillment-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.clickable-link {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.clickable-link:hover {
  text-decoration: none;
}

.clickable-link.has-orders .el-tag {
  text-decoration: underline;
}

.order-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background-color: #f56c6c;
  color: white;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 600;
}

.promotion-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.el-button + .el-button {
  margin-left: 8px;
}

/* 对话框样式 */
.business-detail-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 20px 24px;
  margin: 0;
}

.business-detail-dialog :deep(.el-dialog__title) {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
}

.business-detail-dialog :deep(.el-dialog__body) {
  padding: 24px;
  background: #f8f9fc;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ========================================
   样品申请详情弹层新样式 - 商务高级版
   ======================================== */

/* 头部区域 */
.detail-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 16px;
}

.detail-avatar {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #7b1fa2 0%, #9c4dcc 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.detail-title {
  flex: 1;
}

.detail-id-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.detail-tiktok-id {
  font-size: 18px;
  font-weight: 600;
  color: #6DAD19;
}

.detail-name {
  font-size: 16px;
  color: #303133;
  margin-bottom: 4px;
}

.detail-bd {
  font-size: 13px;
  color: #606266;
}

.bd-label {
  font-weight: 500;
  margin-right: 4px;
}

/* 核心指标卡片 */
.detail-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px;
  padding: 12px 16px;
  text-align: center;
  border: 1px solid #e8e8e8;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

/* 标签页样式 */
.detail-tabs {
  margin-top: 16px;
}

.detail-tabs :deep(.el-tabs__header) {
  margin: 0 0 16px 0;
}

.detail-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: #ebeef5;
}

.detail-tabs :deep(.el-tabs__item) {
  font-weight: 500;
  padding: 0 20px;
  height: 40px;
  line-height: 40px;
}

.detail-tabs :deep(.el-tabs__item.is-active) {
  color: #6DAD19;
}

.detail-tabs :deep(.el-tabs__active-bar) {
  background-color: #6DAD19;
}

/* 信息网格布局 */
.detail-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8e8e8;
  margin-bottom: 4px;
}

.detail-info-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.detail-info-label {
  color: #909399;
  flex-shrink: 0;
  min-width: 70px;
}

.detail-info-value {
  color: #303133;
  word-break: break-all;
}

/* 商务风格信息行样式 */
.info-section .info-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
  margin-bottom: 8px;
}

.info-section .info-label {
  color: #909399;
  flex-shrink: 0;
  min-width: 70px;
  font-size: 12px;
  font-weight: 500;
}

.info-section .info-value {
  color: #303133;
  word-break: break-all;
  font-size: 13px;
  font-weight: 500;
}

/* 拒绝原因样式 */
.refusal-reason {
  font-size: 13px;
  color: #f56c6c;
  background: #fef0f0;
  padding: 12px;
  border-radius: 6px;
  border-left: 3px solid #f56c6c;
  margin-top: 8px;
}

/* 创建时间信息 */
.created-info {
  text-align: right;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
  color: #909399;
  font-size: 12px;
  margin-top: 16px;
}

.created-label {
  margin-right: 8px;
}

.created-value {
  font-weight: 500;
}

.info-card {
  border: 1px solid #e8ebf0;
  border-radius: 12px;
  overflow: hidden;
}

.info-card :deep(.el-card__header) {
  padding: 14px 20px;
  background: linear-gradient(135deg, #f8f9fc 0%, #eef1f6 100%);
  border-bottom: 1px solid #e8ebf0;
}

.info-card :deep(.el-card__body) {
  padding: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
}

.card-header .el-icon {
  font-size: 18px;
  color: #4a5568;
}

.info-item {
  margin-bottom: 8px;
}

.info-label {
  font-size: 12px;
  color: #8c92a4;
  margin-bottom: 6px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 14px;
  color: #2d3748;
  font-weight: 500;
}

.highlight-value {
  color: #6DAD19;
  font-size: 16px;
  font-weight: 600;
}

.product-name {
  color: #5a67d8;
  font-weight: 600;
}

.shipping-value {
  color: #4a5568;
}

.stream-label {
  color: #8c92a4;
}

.stream-value {
  color: #4a5568;
  font-family: 'Monaco', 'Menlo', monospace;
  background: #edf2f7;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.bottom-info {
  text-align: right;
  padding-top: 12px;
  border-top: 1px solid #e8ebf0;
  color: #a0aec0;
  font-size: 12px;
}

.blacklist-row {
  background-color: #f5f5f5 !important;
  border: 2px solid #333 !important;
}

.blacklist-row td {
  background-color: #f5f5f5 !important;
  color: #666;
}

.popover-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #909399;
}

.popover-loading .is-loading {
  animation: rotating 1s linear infinite;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.popover-empty {
  padding: 20px;
  text-align: center;
  color: #909399;
}

.el-input-number {
  width: 100%;
}

.el-input-number :deep(.el-input__wrapper) {
  width: 100%;
  min-width: unset;
}

.duplicate-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  background-color: #f56c6c;
  border-radius: 50%;
  margin-left: 3px;
  vertical-align: middle;
  cursor: pointer;
  font-size: 9px;
}

.badge-count {
  color: white;
  font-size: 9px;
  font-weight: bold;
}

.previous-submissions-popover h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #333;
  font-size: 14px;
}

.salesman-text {
  margin-left: 8px;
  color: #666;
  font-size: 12px;
  vertical-align: middle;
}

.submission-item:hover {
  background-color: #f5f7fa;
}

/* 履约视频列样式 */
.fulfillment-video-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.video-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
}

.icon {
  flex-shrink: 0;
  cursor: pointer;
  transition: opacity 0.2s;
}

.icon:hover {
  opacity: 0.8;
}

.icon-placeholder {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.copy-icon {
  color: #4D4D4D;
}

.copy-icon:hover {
  color: #409eff;
}

.fire-icon {
  flex-shrink: 0;
}

.fire-icon.heated {
  /* 加热状态 - 橙色火焰 */
}

.fire-icon.unheated {
  /* 待加热状态 - 灰色火焰 */
}

.stream-code-text {
  font-size: 12px;
  color: #67c23a;
  cursor: pointer;
  margin-left: 4px;
  white-space: nowrap;
}

.stream-code-text:hover {
  color: #85ce61;
}

.stream-code-text.empty {
  color: #909399;
  cursor: default;
}

.video-link-text {
  color: #409eff;
  text-decoration: none;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.video-link-text:hover {
  text-decoration: underline;
}

.video-link-empty {
  color: #909399;
  font-size: 13px;
}

.add-video-row {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 2px 0;
  margin-top: 2px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.add-video-row:hover {
  background-color: #f5f7fa;
}

.add-video-icon {
  flex-shrink: 0;
}

.add-video-text {
  font-size: 12px;
  color: #8a8a8a;
}

.add-video-row:hover .add-video-text {
  color: #409eff;
}
</style>
