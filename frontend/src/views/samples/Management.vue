<template>
  <div class="sample-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>样品申请</h3>
          <div class="header-actions">
            <el-button type="success" @click="showCreateDialog">
              <el-icon><Plus /></el-icon>
              新增
            </el-button>
            <el-upload
              :auto-upload="false"
              :on-change="handleImportFile"
              :show-file-list="false"
              accept=".xlsx,.xls"
              style="display: inline-block"
            >
              <el-button type="primary">
                <el-icon><Upload /></el-icon>
                导入Excel
              </el-button>
            </el-upload>
          </div>
        </div>
      </template>

      <!-- 搜索筛选 -->
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item label="TikTok ID">
          <el-input
            v-model="searchForm.influencerAccount"
            placeholder="TikTok ID"
            clearable
            style="width: 150px"
          />
        </el-form-item>

        <el-form-item label="商品名称">
          <el-input
            v-model="searchForm.productName"
            placeholder="商品名称"
            clearable
            style="width: 150px"
          />
        </el-form-item>

        <el-form-item label="归属BD">
          <el-input
            v-model="searchForm.salesman"
            placeholder="业务员"
            clearable
            style="width: 120px"
          />
        </el-form-item>

        <el-form-item label="申请日期">
          <el-date-picker
            v-model="searchForm.date"
            type="date"
            placeholder="选择日期"
            clearable
            style="width: 150px"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item label="是否寄样">
          <el-select
            v-model="searchForm.isSampleSent"
            placeholder="全部"
            clearable
            style="width: 100px"
          >
            <el-option label="是" :value="true" />
            <el-option label="否" :value="false" />
          </el-select>
        </el-form-item>

        <el-form-item label="是否出单">
          <el-select
            v-model="searchForm.isOrderGenerated"
            placeholder="全部"
            clearable
            style="width: 100px"
          >
            <el-option label="是" :value="true" />
            <el-option label="否" :value="false" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="loadSamples">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
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
          label="TikTok ID"
          width="160"
          fixed="left"
          prop="influencerAccount"
          sortable
        >
          <template #default="{ row }">
            <el-popover
              placement="right"
              :width="300"
              trigger="hover"
              @show="loadInfluencerPopover(row)"
            >
              <template #reference>
                <div class="tiktok-id-wrapper">
                  <span class="tiktok-id-cell clickable" @click="viewSampleDetail(row)">{{ row.influencerAccount || '--' }}</span>
                  <el-tag v-if="row.isBlacklistedInfluencer" type="danger" size="small" style="margin-left: 4px">黑名单</el-tag>
                </div>
              </template>
              <div v-if="popoverLoading" class="popover-loading">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>加载中...</span>
              </div>
              <div v-else-if="popoverInfluencer" class="influencer-popover">
                <el-descriptions :column="1" size="small">
                  <el-descriptions-item label="TikTok ID">
                    <span class="tiktok-id-text">{{ popoverInfluencer.tiktokId }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="名称">{{ popoverInfluencer.tiktokName || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="最新粉丝">{{ formatNumber(popoverInfluencer.latestFollowers) }}</el-descriptions-item>
                  <el-descriptions-item label="最新GMV">{{ popoverInfluencer.latestGmv || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="状态">
                    <el-tag :type="popoverInfluencer.status === 'enabled' ? 'success' : 'info'" size="small">
                      {{ popoverInfluencer.status === 'enabled' ? '启用' : '禁用' }}
                    </el-tag>
                    <el-tag v-if="popoverInfluencer.isBlacklisted" type="danger" size="small" style="margin-left: 4px">黑名单</el-tag>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
              <div v-else class="popover-empty">
                <span>未找到达人信息</span>
              </div>
            </el-popover>
          </template>
        </el-table-column>

        <el-table-column
          label="申请日期"
          width="120"
          fixed="left"
          prop="date"
          sortable
        >
          <template #default="{ row }">
            <div class="column-text">{{ row.date ? formatDate(row.date) : '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column
          label="商品信息"
          width="300"
          prop="productName"
          sortable
        >
          <template #default="{ row }">
            <div class="product-info">
              <div class="product-id">{{ row.productId || '--' }}</div>
              <el-tooltip :content="row.productName" placement="top">
                <div class="product-name">
                  {{ truncateText(row.productName, 60) }}
                </div>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          label="达人数据"
          width="120"
        >
          <template #default="{ row }">
            <div class="influencer-data">
              <el-tag type="info" size="small">粉丝</el-tag>
              <span class="follower-count">{{ formatNumber(row.followerCount) }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          label="归属BD"
          width="100"
          prop="salesman"
        >
          <template #default="{ row }">
            <div class="column-text">{{ row.salesman || '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column
          label="收货信息"
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
          label="寄样状态"
          width="140"
        >
          <template #default="{ row }">
            <div class="sample-status">
              <el-tag :type="row.isSampleSent ? 'success' : 'info'" size="small">
                {{ row.isSampleSent ? '已寄样' : '未寄样' }}
              </el-tag>
              <div v-if="row.trackingNumber" class="tracking-no">
                {{ row.trackingNumber }}
              </div>
              <div v-if="row.shippingDate" class="shipping-date">
                {{ formatDate(row.shippingDate) }}
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          label="收样日期"
          width="120"
          prop="receivedDate"
          sortable
        >
          <template #default="{ row }">
            <div class="column-text">{{ row.receivedDate ? formatDate(row.receivedDate) : '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column
          label="履约情况"
          width="200"
        >
          <template #default="{ row }">
            <div class="fulfillment-info">
              <div class="fulfillment-time">{{ row.fulfillmentTime || '--' }}</div>
              <el-tag
                :type="row.isOrderGenerated ? 'success' : 'warning'"
                size="small"
              >
                {{ row.isOrderGenerated ? '已出单' : '未出单' }}
              </el-tag>
              <div v-if="row.videoLink" class="video-link">
                <el-link :href="row.videoLink" target="_blank" type="primary">
                  视频链接
                </el-link>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          label="投流信息"
          width="180"
        >
          <template #default="{ row }">
            <div class="promotion-info">
              <div class="stream-code">{{ row.videoStreamCode || '--' }}</div>
              <div class="promotion-status">
                <el-tag :type="row.isAdPromotion ? 'success' : 'info'" size="small">
                  {{ row.isAdPromotion ? '已投流' : '未投流' }}
                </el-tag>
                <span v-if="row.adPromotionTime">{{ formatDate(row.adPromotionTime) }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          label="操作"
          width="120"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button link type="primary" @click="viewDetail(row)">详情</el-button>
            <el-button link type="danger" @click="deleteSample(row)">删除</el-button>
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

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="currentSample?.isBlacklistedInfluencer ? '样品申请详情（黑名单达人）' : '样品申请详情'"
      width="800px"
      :class="currentSample?.isBlacklistedInfluencer ? 'detail-dialog-blacklist' : ''"
    >
      <div v-if="currentSample" :class="currentSample.isBlacklistedInfluencer ? 'detail-content-blacklist' : ''">
        <!-- 黑名单警告 -->
        <el-alert
          v-if="currentSample.isBlacklistedInfluencer"
          title="该样品申请关联的达人已被列入黑名单"
          type="error"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
        />
        <el-descriptions :column="2" border>
          <el-descriptions-item label="TikTok ID">
            <span class="tiktok-id-text">{{ currentSample.influencerAccount || '-' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="申请日期">{{ currentSample.date ? formatDate(currentSample.date) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="商品名称">{{ currentSample.productName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="商品ID">{{ currentSample.productId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="粉丝数">{{ formatNumber(currentSample.followerCount) }}</el-descriptions-item>
          <el-descriptions-item label="GMV">{{ currentSample.gmv || '-' }}</el-descriptions-item>
          <el-descriptions-item label="归属BD">{{ currentSample.salesman || '-' }}</el-descriptions-item>
          <el-descriptions-item label="收货信息">{{ currentSample.shippingInfo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="样品图片" :span="2">
            <el-image v-if="currentSample.sampleImage" :src="currentSample.sampleImage" style="width: 100px; height: 100px" fit="cover" />
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="是否寄样">
            <el-tag :type="currentSample.isSampleSent ? 'success' : 'info'" size="small">
              {{ currentSample.isSampleSent ? '已寄样' : '未寄样' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="发货日期">{{ currentSample.shippingDate ? formatDate(currentSample.shippingDate) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="物流单号">{{ currentSample.trackingNumber || '-' }}</el-descriptions-item>
          <el-descriptions-item label="物流公司">{{ currentSample.logisticsCompany || '-' }}</el-descriptions-item>
          <el-descriptions-item label="收样日期">{{ currentSample.receivedDate ? formatDate(currentSample.receivedDate) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="是否出单">
            <el-tag :type="currentSample.isOrderGenerated ? 'success' : 'warning'" size="small">
              {{ currentSample.isOrderGenerated ? '已出单' : '未出单' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="视频链接" :span="2">
            <el-link v-if="currentSample.videoLink" :href="currentSample.videoLink" target="_blank" type="primary">
              {{ currentSample.videoLink }}
            </el-link>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="投流信息" :span="2">
            <div>Stream Code: {{ currentSample.videoStreamCode || '-' }}</div>
            <div>
              <el-tag :type="currentSample.isAdPromotion ? 'success' : 'info'" size="small">
                {{ currentSample.isAdPromotion ? '已投流' : '未投流' }}
              </el-tag>
              <span v-if="currentSample.adPromotionTime"> - {{ formatDate(currentSample.adPromotionTime) }}</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="履约时间">{{ currentSample.fulfillmentTime || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentSample.createdAt ? formatDate(currentSample.createdAt) : '-' }}</el-descriptions-item>
        </el-descriptions>

        <!-- 达人信息 -->
        <el-divider>达人信息</el-divider>
        <div v-if="influencerDetail" class="influencer-detail">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="TikTok ID">
              <span class="tiktok-id-text">{{ influencerDetail.tiktokId }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="TikTok名称">{{ influencerDetail.tiktokName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="真实姓名">{{ influencerDetail.realName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="常用昵称">{{ influencerDetail.nickname || '-' }}</el-descriptions-item>
            <el-descriptions-item label="最新粉丝">{{ formatNumber(influencerDetail.latestFollowers) }}</el-descriptions-item>
            <el-descriptions-item label="最新GMV">{{ influencerDetail.latestGmv || '-' }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="influencerDetail.status === 'enabled' ? 'success' : 'info'" size="small">
                {{ influencerDetail.status === 'enabled' ? '启用' : '禁用' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="黑名单状态">
              <el-tag v-if="influencerDetail.isBlacklisted" type="danger" size="small">黑名单</el-tag>
              <span v-else>正常</span>
            </el-descriptions-item>
          </el-descriptions>
        </div>
        <el-empty v-else description="未找到达人信息" />
      </div>
    </el-dialog>

    <!-- 新增对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新增样品申请"
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
            <el-form-item label="申请日期" prop="date">
              <el-date-picker
                v-model="createForm.date"
                type="date"
                placeholder="选择日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="归属BD" prop="salesman">
              <el-select v-model="createForm.salesman" placeholder="选择归属BD" filterable style="width: 100%" :loading="bdLoading">
                <el-option
                  v-for="user in users"
                  :key="user._id"
                  :label="user.realName || user.username"
                  :value="user._id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="商品信息" required>
          <el-select
            v-model="createForm.productId"
            filterable
            remote
            placeholder="搜索商品名称或ID"
            :remote-method="searchProducts"
            :loading="productLoading"
            style="width: 100%"
            @change="handleProductSelect"
          >
            <el-option
              v-for="product in cooperationProducts"
              :key="product._id"
              :label="`${product.productName} (${product.productId})`"
              :value="product._id"
            >
              <span>{{ product.productName }}</span>
              <span style="color: #6DAD19; font-size: 12px;"> - {{ product.productId }}</span>
            </el-option>
          </el-select>
          <el-input v-model="createForm.productName" type="hidden" />
        </el-form-item>

        <el-form-item label="TikTok ID" prop="influencerAccount" class="tiktok-label">
          <el-input v-model="createForm.influencerAccount" placeholder="TikTok ID" />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="粉丝数" prop="followerCount">
              <el-input-number v-model="createForm.followerCount" :min="0" :controls="false" placeholder="粉丝数" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="GMV" prop="gmv">
              <el-input-number v-model="createForm.gmv" :min="0" :precision="2" :controls="false" placeholder="GMV" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="收货信息" prop="shippingInfo">
          <el-input
            v-model="createForm.shippingInfo"
            type="textarea"
            :rows="2"
            placeholder="请输入收货信息"
          />
        </el-form-item>

        <el-form-item label="样品图片">
          <el-input v-model="createForm.sampleImage" placeholder="图片URL" />
        </el-form-item>

        <el-divider>寄样信息</el-divider>

        <el-form-item label="是否寄样">
          <el-switch v-model="createForm.isSampleSent" />
        </el-form-item>

        <template v-if="createForm.isSampleSent">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="发货单号">
                <el-input v-model="createForm.trackingNumber" placeholder="发货单号" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="物流公司">
                <el-input v-model="createForm.logisticsCompany" placeholder="物流公司" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="发货日期">
            <el-date-picker
              v-model="createForm.shippingDate"
              type="date"
              placeholder="选择发货日期"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
        </template>

        <el-divider>履约信息</el-divider>

        <el-form-item label="是否出单">
          <el-switch v-model="createForm.isOrderGenerated" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="creating">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import { Upload, Plus, Loading } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const loading = ref(false)
const importing = ref(false)
const creating = ref(false)
const createDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const samples = ref([])
const currentSample = ref(null)
const influencerDetail = ref(null)
const popoverInfluencer = ref(null)
const popoverLoading = ref(false)
const createFormRef = ref(null)
const users = ref([])
const cooperationProducts = ref([])
const bdLoading = ref(false)
const productLoading = ref(false)

const searchForm = reactive({
  date: '',
  productName: '',
  influencerAccount: '',
  salesman: '',
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
  productName: '',
  productId: '',
  influencerAccount: '',
  followerCount: 0,
  gmv: 0,
  salesman: '',
  shippingInfo: '',
  sampleImage: '',
  isSampleSent: false,
  trackingNumber: '',
  shippingDate: '',
  logisticsCompany: '',
  isOrderGenerated: false
})

const createRules = {
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  productId: [{ required: true, message: '请选择商品', trigger: 'change' }],
  influencerAccount: [{ required: true, message: '请输入TikTok ID', trigger: 'blur' }],
  salesman: [{ required: true, message: '请选择归属BD', trigger: 'change' }]
}

const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 获取当天日期
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

// 获取样品申请行样式
const getSampleRowClassName = ({ row }) => {
  return row.isBlacklistedInfluencer ? 'blacklist-row' : ''
}

const loadSamples = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm
    }
    const res = await request.get('/samples', { params })
    samples.value = res.samples
    pagination.total = res.pagination.total
  } catch (error) {
    console.error('Load samples error:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const resetSearch = () => {
  Object.assign(searchForm, {
    date: '',
    productName: '',
    influencerAccount: '',
    salesman: '',
    isSampleSent: null,
    isOrderGenerated: null
  })
  pagination.page = 1
  loadSamples()
}

// 加载用户列表（用于归属BD下拉）
const loadUsers = async () => {
  bdLoading.value = true
  try {
    const res = await request.get('/users', { params: { companyId: userStore.companyId, limit: 100 } })
    users.value = res.users || []
  } catch (error) {
    console.error('加载用户失败:', error)
  } finally {
    bdLoading.value = false
  }
}

// 加载合作产品列表（用于商品下拉）
const loadCooperationProducts = async () => {
  try {
    const res = await request.get('/cooperation-products', { params: { companyId: userStore.companyId, status: 'active', limit: 100 } })
    cooperationProducts.value = res.products || res.data || []
  } catch (error) {
    console.error('加载合作产品失败:', error)
  }
}

// 搜索商品
const searchProducts = async (query) => {
  if (!query) {
    loadCooperationProducts()
    return
  }
  productLoading.value = true
  try {
    const res = await request.get('/cooperation-products', {
      params: {
        companyId: userStore.companyId,
        status: 'active',
        keyword: query,
        limit: 20
      }
    })
    cooperationProducts.value = res.products || res.data || []
  } catch (error) {
    console.error('搜索商品失败:', error)
  } finally {
    productLoading.value = false
  }
}

// 选择商品
const handleProductSelect = (productId) => {
  const product = cooperationProducts.value.find(p => p._id === productId)
  if (product) {
    createForm.productName = product.productName
    createForm.productId = product._id  // 使用MongoDB _id作为关联
  }
}

const showCreateDialog = () => {
  // 默认归属BD为当前登录用户
  const currentUser = userStore.user
  Object.assign(createForm, {
    date: getTodayDate(),
    productName: '',
    productId: '',
    influencerAccount: '',
    followerCount: 0,
    gmv: 0,
    salesman: currentUser?._id || currentUser?.id || '',
    shippingInfo: '',
    sampleImage: '',
    isSampleSent: false,
    trackingNumber: '',
    shippingDate: '',
    logisticsCompany: '',
    isOrderGenerated: false
  })
  createDialogVisible.value = true
  // 加载用户和产品列表
  loadUsers()
  loadCooperationProducts()
}

const handleCreate = async () => {
  if (!createFormRef.value) return

  await createFormRef.value.validate(async (valid) => {
    if (!valid) return

    // 先检查是否为黑名单达人
    try {
      const blacklistRes = await request.get(`/influencer-managements/blacklist/check/${createForm.influencerAccount}`, {
        params: { companyId: userStore.companyId }
      })
      if (blacklistRes.isBlacklisted) {
        ElMessage.error('该达人被列为黑名单，减少接触！')
        return
      }
    } catch (blError) {
      console.error('检查黑名单失败:', blError)
    }

    creating.value = true
    try {
      await request.post('/samples', createForm)

      // 检查TikTok ID是否在达人表中存在
      try {
        const influencerRes = await request.get('/influencer-managements', {
          params: {
            companyId: userStore.companyId,
            keyword: createForm.influencerAccount,
            limit: 1
          }
        })
        const influencers = influencerRes.influencers || []
        const matchedInfluencer = influencers.find(i => i.tiktokId === createForm.influencerAccount)

        if (matchedInfluencer) {
          // 添加维护记录
          await request.post(`/influencer-managements/${matchedInfluencer._id}/maintenance`, {
            followers: createForm.followerCount,
            gmv: createForm.gmv,
            remark: '样品申请'
          })
          console.log('已添加达人维护记录')
        }
      } catch (infError) {
        console.error('检查达人或添加维护记录失败:', infError)
      }

      ElMessage.success('创建成功')
      createDialogVisible.value = false
      loadSamples()
    } catch (error) {
      console.error('Create sample error:', error)
      ElMessage.error(error.response?.data?.message || '创建失败')
    } finally {
      creating.value = false
    }
  })
}

const viewSampleDetail = async (sample) => {
  currentSample.value = sample
  detailDialogVisible.value = true
  
  // 尝试获取达人信息
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

// 加载悬停弹层中的达人信息
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
    console.log('达人搜索结果:', res)
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

const deleteSample = async (sample) => {
  await ElMessageBox.confirm('确定要删除这条记录吗？', '提示', {
    type: 'warning'
  })

  try {
    await request.delete(`/samples/${sample._id}`)
    ElMessage.success('删除成功')
    loadSamples()
  } catch (error) {
    console.error('Delete sample error:', error)
    ElMessage.error('删除失败')
  }
}

const handleImportFile = async (file) => {
  importing.value = true
  try {
    const formData = new FormData()
    formData.append('file', file.raw)

    const res = await request.post('/samples/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    ElMessage.success(res.message || '导入成功')

    if (res.data) {
      const summary = `新增: ${res.data.added} 条\n更新: ${res.data.updated} 条`

      if (res.data.errors && res.data.errors.length > 0) {
        const errorDetails = res.data.errors.map(e => `第${e.row}行: ${e.error}`).join('\n')
        ElMessageBox.alert(
          `${summary}\n失败: ${res.data.failed} 条\n\n失败详情:\n${errorDetails}`,
          '导入结果',
          { type: 'warning' }
        )
      } else {
        ElMessage.success(summary)
      }
    }

    loadSamples()
  } catch (error) {
    console.error('Import error:', error)
    ElMessage.error('导入失败，请稍后重试')
  } finally {
    importing.value = false
  }
}

onMounted(() => {
  loadSamples()
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

/* 表格样式优化 - 与建联达人相同 */
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

.video-link {
  font-size: 11px;
}

.stream-code {
  font-size: 12px;
  color: #757575;
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
.el-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, #9c4dcc 0%, #ba68c8 100%);
  padding: 16px 20px;
}

.el-dialog :deep(.el-dialog__title) {
  color: white;
  font-weight: 600;
}

.el-form-item :deep(.el-form-item__label) {
  color: #595959;
  font-weight: 500;
}

/* TikTok绿色样式 */
.tiktok-green-label :deep(.el-form-item__label) {
  color: #6DAD19;
}

.tiktok-green-input :deep(.el-input__wrapper) {
  border-color: #6DAD19;
  box-shadow: 0 0 0 1px #6DAD19 inset;
}

.tiktok-green-input :deep(.el-input__wrapper:hover) {
  border-color: #6DAD19;
  box-shadow: 0 0 0 1px #6DAD19 inset;
}

.tiktok-green-input :deep(.el-input__wrapper.is-focus) {
  border-color: #6DAD19;
  box-shadow: 0 0 0 1px #6DAD19 inset;
}

/* 修复 input-number 宽度溢出 */
.el-input-number {
  width: 100%;
}

.el-input-number :deep(.el-input__wrapper) {
  width: 100%;
  min-width: unset;
}

/* 黑名单行样式 */
.blacklist-row {
  background-color: #f5f5f5 !important;
  border: 2px solid #333 !important;
}

.blacklist-row td {
  background-color: #f5f5f5 !important;
  color: #666;
}

/* 达人详情区域 */
.influencer-detail {
  margin-top: 10px;
}

/* 悬停弹层加载状态 */
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

/* 详情对话框黑名单样式 */
.detail-dialog-blacklist {
  background-color: #f5f5f5 !important;
  border: 2px solid #333 !important;
}

.detail-dialog-blacklist :deep(.el-dialog__body) {
  background-color: #f5f5f5;
}

.detail-content-blacklist {
  background-color: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  border: 2px solid #333;
}
</style>
