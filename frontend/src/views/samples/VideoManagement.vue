<template>
  <div class="video-management">
    <!-- 搜索筛选区 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item :label="$t('videos.dateRange')">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="-"
            :start-placeholder="$t('common.startDate')"
            :end-placeholder="$t('common.endDate')"
            value-format="YYYY-MM-DD"
            @change="handleSearch"
          />
        </el-form-item>

        <el-form-item :label="$t('videos.registeredBy')">
          <el-select
            v-model="searchForm.createdBy"
            clearable
            filterable
            :placeholder="$t('videos.selectUser')"
            style="width: 140px"
            @change="handleSearch"
          >
            <el-option
              v-for="user in userList"
              :key="user._id"
              :label="user.realName || user.username"
              :value="user._id"
            />
          </el-select>
        </el-form-item>



        <el-form-item :label="$t('product.productName')">
          <el-input
            v-model="searchForm.productName"
            clearable
            :placeholder="$t('common.search')"
            style="width: 150px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>



        <el-form-item>
          <el-button type="primary" @click="handleSearch">{{ $t('common.search') }}</el-button>
          <el-button @click="resetSearch">{{ $t('common.reset') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作栏 -->
    <div class="toolbar">
      <el-button type="primary" @click="openAddDialog">
        <el-icon><Plus /></el-icon>
        {{ $t('common.add') }}{{ $t('menu.videoRegister') }}
      </el-button>
      <span class="total-count">{{ $t('common.total') }} {{ pagination.total }} {{ $t('common.countUnit') }}</span>
    </div>

    <!-- 表格 -->
    <el-card shadow="never" class="table-card">
      <el-table :data="videoList" v-loading="loading" stripe border>
        <el-table-column :label="$t('samples.date')" width="110" sortable fixed="left">
          <template #default="{ row }">
            {{ formatDate(row.sampleId?.date) }}
          </template>
        </el-table-column>

        <el-table-column :label="$t('videos.registeredBy')" width="100" fixed="left">
          <template #default="{ row }">
            {{ row.createdBy?.realName || row.createdBy?.username || $t('common.dash') }}
          </template>
        </el-table-column>

        <el-table-column :label="$t('videos.productInfo')" min-width="320">
          <template #default="{ row }">
            <div class="product-cell">
              <el-image
                v-if="row.productId?.images?.[0]"
                :src="row.productId.images[0]"
                fit="cover"
                class="product-thumb"
                :preview-src-list="[row.productId.images[0]]"
              />
              <div v-else class="product-thumb-placeholder"></div>
              <div class="product-info">
                <div class="product-id purple">{{ row.productId?.tiktokProductId || $t('common.dash') }}</div>
                <el-tooltip :content="row.productId?.name" placement="top">
                  <div class="product-name">
                    {{ row.productId?.name || $t('common.dash') }}
                  </div>
                </el-tooltip>
                <div class="shop-name" v-if="getShopName(row.productId)">
                  <ShopIcon :size="16" />
                  {{ getShopName(row.productId) }}
                </div>
                <div class="shop-name" v-else>{{ $t('common.doubleDash') }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="$t('videos.influencer')" width="280">
          <template #default="{ row }">
            <div v-if="row.influencerId">
              <InfluencerCell :influencer="{
                tiktokId: row.influencerId?.tiktokId,
                tiktokUsername: row.influencerId?.tiktokName,
                latestFollowers: row.influencerId?.latestFollowers,
                latestGmv: row.influencerId?.latestGmv,
                avgVideoViews: row.influencerId?.avgVideoViews,
                monthlySalesCount: row.influencerId?.monthlySalesCount
              }" :showGmv="!!row.influencerId?.latestGmv" :showFollowers="!!row.influencerId?.latestFollowers" :showAvgViews="!!row.influencerId?.avgVideoViews" :showMonthlySales="!!row.influencerId?.monthlySalesCount" />
            </div>
            <span v-else>{{ $t('common.dash') }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="$t('samples.videoLink')" min-width="120">
          <template #default="{ row }">
            <div v-if="row.videoLink" class="link-actions">
              <el-button link type="primary" size="small" @click="openVideoLink(row.videoLink)">
                {{ $t('videos.clickToJump') }}
              </el-button>
              <el-icon class="copy-icon" @click="copyToClipboard(row.videoLink)">
                <CopyDocument />
              </el-icon>
            </div>
            <span v-else>{{ $t('common.dash') }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="$t('samples.videoStreamCode')" width="120">
          <template #default="{ row }">
            <div v-if="row.videoStreamCode" class="stream-code-actions">
              <el-button link type="primary" size="small" @click="viewStreamCode(row.videoStreamCode)">
                {{ $t('videos.clickToView') }}
              </el-button>
              <el-icon class="copy-icon" @click="copyToClipboard(row.videoStreamCode)">
                <CopyDocument />
              </el-icon>
            </div>
            <span v-else>{{ $t('common.dash') }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="$t('common.createTime')" width="165">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column :label="$t('common.operation')" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEditDialog(row)">
              {{ $t('common.edit') }}
            </el-button>
            <el-popconfirm :title="$t('common.confirmDelete')" @confirm="handleDelete(row._id)">
              <template #reference>
                <el-button link type="danger" size="small">{{ $t('common.delete') }}</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadVideos"
          @current-change="loadVideos"
        />
      </div>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? $t('common.edit') + $t('menu.videoRegister') : $t('common.add') + $t('menu.videoRegister')"
      width="560px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="110px">




        <!-- 独立创建模式字段 -->
        <!-- BD选择 -->
        <el-form-item :label="$t('videos.bd')">
          <el-select
            v-model="formData.operator"
            clearable
            filterable
            :placeholder="$t('videos.selectOperator')"
            style="width: 100%"
            :disabled="!canSelectOtherOperator"
          >
            <el-option
              v-for="user in userList"
              :key="user._id"
              :label="user.realName || user.username"
              :value="user._id"
            />
          </el-select>
          <div class="form-tip" v-if="!canSelectOtherOperator">
            {{ $t('videos.operatorSelfOnlyTip') }}
          </div>
        </el-form-item>

        <!-- 商品选择 -->
        <el-form-item :label="$t('videos.selectProduct')" prop="productId">
          <el-select
            v-model="formData.productId"
            filterable
            remote
            reserve-keyword
            :remote-method="searchProducts"
            :loading="productSearchLoading"
            :placeholder="$t('videos.selectProduct')"
            style="width: 100%"
          >
            <el-option
              v-for="p in productOptions"
              :key="p._id"
              :label="p.tiktokProductId ? `${p.name} (${p.tiktokProductId})` : p.name"
              :value="p._id"
            />
          </el-select>
        </el-form-item>

        <!-- 达人选择 -->
        <el-form-item :label="$t('videos.selectInfluencer')" prop="influencerId">
          <el-select
            v-model="formData.influencerId"
            filterable
            remote
            reserve-keyword
            :remote-method="searchInfluencers"
            :loading="influencerSearchLoading"
            :placeholder="$t('videos.selectInfluencer')"
            style="width: 100%"
          >
            <el-option
              v-for="inf in influencerOptions"
              :key="inf._id"
              :label="`${inf.tiktokId} (${inf.tiktokName || ''})`"
              :value="inf._id"
            />
          </el-select>
        </el-form-item>

        <!-- 关联申样记录 -->
        <el-form-item :label="$t('videos.linkSampleRecord')">
          <el-checkbox v-model="formData.linkSampleRecord">{{ $t('videos.linkSampleRecord') }}</el-checkbox>
        </el-form-item>
        
        <el-form-item v-if="formData.linkSampleRecord" :label="$t('videos.sampleFilteredOptions')">
          <el-select
            v-model="formData.sampleId"
            filterable
            :placeholder="$t('videos.sampleSelectionPlaceholder')"
            style="width: 100%"
          >
            <el-option
              v-for="sample in filteredSampleOptions"
              :key="sample._id"
              :label="$t('videos.sampleDateAndStatus', { date: formatDate(sample.date), status: $t(`samples.${sample.sampleStatus}`) })"
              :value="sample._id"
            />
          </el-select>
        </el-form-item>

        <!-- 公共字段 -->
        <el-form-item :label="$t('samples.videoLink')">
          <el-input v-model="formData.videoLink" :placeholder="$t('videos.enterVideoLink')" />
        </el-form-item>

        <el-form-item :label="$t('samples.videoStreamCode')">
          <el-input v-model="formData.videoStreamCode" :placeholder="$t('videos.enterStreamCode')" />
        </el-form-item>

        <el-form-item :label="$t('videos.isAdPromotion')">
          <el-switch v-model="formData.isAdPromotion" />
        </el-form-item>

        <el-form-item v-if="formData.isAdPromotion" :label="$t('videos.adTime')">
          <el-date-picker
            v-model="formData.adPromotionTime"
            type="datetime"
            :placeholder="$t('videos.selectAdTime')"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEditing ? $t('common.update') : $t('common.create') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, CopyDocument } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import AuthManager from '@/utils/auth'
import InfluencerCell from '@/components/InfluencerCell.vue'
import ShopIcon from '@/components/ShopIcon.vue'

const { t } = useI18n()

const API_BASE = '/api/videos'

// 搜索表单
const searchForm = reactive({
  dateRange: [],
  createdBy: '',
  productName: ''
})

const loading = ref(false)
const videoList = ref([])
const userList = ref([])
const pagination = reactive({ page: 1, limit: 10, total: 0 })

// 弹窗相关
const dialogVisible = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const formRef = ref(null)
const submitting = ref(false)

const formData = reactive({
  sampleId: '',
  linkSampleRecord: true,
  videoLink: '',
  videoStreamCode: '',
  isAdPromotion: false,
  adPromotionTime: '',
  // 商品、达人选择
  productId: '',
  influencerId: '',
  operator: ''
})

const formRules = {
  productId: [{
    required: true,
    message: () => t('videos.selectProductRequired'),
    trigger: 'change'
  }],
  influencerId: [{
    required: true,
    message: () => t('videos.selectInfluencerRequired'),
    trigger: 'change'
  }]
}

// 样品搜索
const sampleOptions = ref([])
const sampleSearchLoading = ref(false)

// 商品搜索
const productOptions = ref([])
const productSearchLoading = ref(false)

// 达人搜索
const influencerOptions = ref([])
const influencerSearchLoading = ref(false)

// 筛选后的样品记录
const filteredSampleOptions = ref([])

// 计算属性：是否可以选其他操作员（基于数据权限）
const canSelectOtherOperator = computed(() => {
  // 这里需要根据实际的数据权限逻辑实现
  // 暂时假设如果用户数据范围是"只看自己"，则不能选择其他操作员
  const userDataScope = AuthManager.getUserDataScope?.('videos') || 'all'
  return userDataScope !== 'self'
})

// 打开视频链接
function openVideoLink(link) {
  window.open(link, '_blank')
}

// 复制到剪贴板
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(t('common.copySuccess'))
  } catch (err) {
    console.error('复制失败:', err)
    ElMessage.error(t('common.copyFailed'))
  }
}

// 查看投流码（弹窗显示）
function viewStreamCode(code) {
  ElMessageBox.alert(code, t('samples.videoStreamCode'), {
    confirmButtonText: t('common.close'),
    customClass: 'stream-code-modal',
    dangerouslyUseHTMLString: true,
    // 允许复制
    beforeClose: (action, instance, done) => {
      if (action === 'confirm') {
        done()
      }
    }
  })
}

// 获取店铺名称
function getShopName(product) {
  if (!product) return ''
  // 优先从populate后的shopId对象获取店铺名称
  if (product.shopId && typeof product.shopId === 'object' && product.shopId.shopName) {
    return product.shopId.shopName
  }
  // 其次从product.shopName获取（可能在某些API中直接注入）
  if (product.shopName) return product.shopName
  // 尝试其他可能的路径
  if (product.shopId?.name) return product.shopId.name
  if (product.shopId?.title) return product.shopId.title
  if (product.shop?.shopName) return product.shop.shopName
  if (product.shop?.name) return product.shop.name
  if (product.shop?.title) return product.shop.title
  if (product.shop?.storeName) return product.shop.storeName
  if (product.shop?.shopTitle) return product.shop.shopTitle
  if (product.shop?.displayName) return product.shop.displayName
  if (product.storeName) return product.storeName
  if (product.store?.name) return product.store.name
  // 如果shopId是字符串（未populate），不显示ObjectId，返回空
  return ''
}

// 加载用户列表
async function loadUsers() {
  try {
    // 添加limit参数获取更多用户，避免数据不全
    const params = new URLSearchParams({ limit: '1000' })
    const res = await fetch(`/api/users?${params}`, {
      headers: { Authorization: `Bearer ${AuthManager.getToken()}` }
    })
    const json = await res.json()
    let users = []
    if (json.success && json.data) {
      users = json.data.users || []
    }
    // 确保当前登录用户存在于用户列表中
    const currentUser = AuthManager.getUser()
    if (currentUser && currentUser._id) {
      const userExists = users.some(user => user._id === currentUser._id)
      if (!userExists) {
        // 将当前用户添加到列表前面
        users.unshift({
          _id: currentUser._id,
          realName: currentUser.realName,
          username: currentUser.username
        })
      }
    }
    userList.value = users
  } catch (e) {
    console.error(t('videos.loadUserFailed'), e)
  }
}

// 加载视频列表
async function loadVideos() {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: pagination.page,
      limit: pagination.limit
    })

    if (searchForm.dateRange?.length === 2) {
      params.append('dateStart', searchForm.dateRange[0])
      params.append('dateEnd', searchForm.dateRange[1])
    }
    if (searchForm.createdBy) params.append('createdBy', searchForm.createdBy)
    if (searchForm.productName) params.append('productName', searchForm.productName)

    const res = await fetch(`${API_BASE}?${params}`, {
      headers: { Authorization: `Bearer ${AuthManager.getToken()}` }
    })
    const json = await res.json()
    if (json.success) {
      videoList.value = json.data.videos || []
      pagination.total = json.data.pagination?.total || 0
    }
  } catch (e) {
    console.error(t('videos.loadVideoFailed'), e)
    ElMessage.error(t('videos.loadFailed'))
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  loadVideos()
}

function resetSearch() {
  searchForm.dateRange = []
  searchForm.createdBy = ''
  searchForm.productName = ''
  handleSearch()
}

// 搜索样品（远程搜索）
async function searchSamples(query) {
  if (!query || query.length < 1) return

  sampleSearchLoading.value = true
  try {
    const res = await fetch(`/api/samples?page=1&limit=20&${new URLSearchParams({ date: query })}`, {
      headers: { Authorization: `Bearer ${AuthManager.getToken()}` }
    })
    const json = await res.json()
    if (json.success) {
      sampleOptions.value = json.data.samples || []
    }
  } catch (e) {
    console.error(t('videos.searchSampleFailed'), e)
  } finally {
    sampleSearchLoading.value = false
  }
}

// 搜索商品（远程搜索）
async function searchProducts(query) {
  if (!query || query.length < 1) return

  productSearchLoading.value = true
  try {
    // 使用keyword参数同时搜索商品名称和TikTok商品ID
    const params = new URLSearchParams({
      keyword: query,
      page: '1',
      limit: '20'
    })
    const res = await fetch(`/api/products?${params}`, {
      headers: { Authorization: `Bearer ${AuthManager.getToken()}` }
    })
    const json = await res.json()
    if (json.success) {
      productOptions.value = json.data.products || []
    }
  } catch (e) {
    console.error(t('videos.searchProductFailed'), e)
  } finally {
    productSearchLoading.value = false
  }
}

// 搜索达人（远程搜索）
async function searchInfluencers(query) {
  if (!query || query.length < 1) return

  influencerSearchLoading.value = true
  try {
    const user = AuthManager.getUser()
    const params = new URLSearchParams({
      keyword: query,
      limit: 20
    })
    if (user?.companyId) {
      params.append('companyId', user.companyId)
    } else if (user?.company?._id) {
      params.append('companyId', user.company._id)
    }
    const res = await fetch(`/api/influencer-managements?${params}`, {
      headers: { Authorization: `Bearer ${AuthManager.getToken()}` }
    })
    const json = await res.json()
    // 注意：响应结构可能为 { success: true, data: { influencers: [...] } } 或 { influencers: [...] }
    if (json.success) {
      influencerOptions.value = json.data?.influencers || json.influencers || []
    } else {
      influencerOptions.value = json.influencers || []
    }
  } catch (e) {
    console.error(t('videos.searchInfluencerFailed'), e)
  } finally {
    influencerSearchLoading.value = false
  }
}

// 加载筛选后的样品记录
async function loadFilteredSamples() {
  if (!formData.productId || !formData.influencerId) {
    filteredSampleOptions.value = []
    return
  }
  try {
    const params = new URLSearchParams({
      productId: formData.productId,
      influencerId: formData.influencerId,
      limit: 100
    })
    const res = await fetch(`/api/samples?${params}`, {
      headers: { Authorization: `Bearer ${AuthManager.getToken()}` }
    })
    const json = await res.json()
    if (json.success) {
      filteredSampleOptions.value = json.data?.samples || json.samples || []
    } else {
      filteredSampleOptions.value = []
    }
  } catch (e) {
    console.error(t('videos.loadSamplesFailed'), e)
    filteredSampleOptions.value = []
  }
}

// 监听商品和达人选择变化
watch(() => [formData.productId, formData.influencerId], () => {
  if (formData.linkSampleRecord) {
    loadFilteredSamples()
  }
})

// 监听关联申样记录复选框变化
watch(() => formData.linkSampleRecord, (newVal) => {
  if (newVal && formData.productId && formData.influencerId) {
    loadFilteredSamples()
  } else {
    filteredSampleOptions.value = []
    formData.sampleId = ''
  }
})

function openAddDialog() {
  isEditing.value = false
  editingId.value = null
  formData.sampleId = ''
  formData.videoLink = ''
  formData.videoStreamCode = ''
  formData.isAdPromotion = false
  formData.adPromotionTime = ''
  formData.productId = ''
  formData.influencerId = ''
  // 默认选中当前登录用户作为BD
  const currentUser = AuthManager.getUser()
  formData.operator = currentUser?._id || ''
  // 确保当前用户存在于用户列表中
  if (currentUser && currentUser._id) {
    const exists = userList.value.some(user => user._id === currentUser._id)
    if (!exists) {
      userList.value.unshift({
        _id: currentUser._id,
        realName: currentUser.realName,
        username: currentUser.username
      })
    }
  }
  dialogVisible.value = true
}

function openEditDialog(row) {
  isEditing.value = true
  editingId.value = row._id
  formData.sampleId = row.sampleId?._id || ''
  formData.linkSampleRecord = !!row.sampleId
  formData.videoLink = row.videoLink || ''
  formData.videoStreamCode = row.videoStreamCode || ''
  formData.isAdPromotion = row.isAdPromotion || false
  formData.adPromotionTime = row.adPromotionTime ? row.adPromotionTime.slice(0, 19).replace('T', ' ') : ''
  
  formData.productId = row.productId?._id || ''
  formData.influencerId = row.influencerId?._id || ''
  formData.operator = row.createdBy?._id || ''
  
  // 填充样品选项
  if (row.sampleId) {
    sampleOptions.value = [{
      _id: row.sampleId._id,
      date: row.sampleId.date,
      influencerId: row.influencerId,
      productId: row.productId
    }]
  }
  
  // 填充商品选项
  if (row.productId) {
    productOptions.value = [{
      _id: row.productId._id,
      name: row.productId.name
    }]
  }
  
  // 填充达人选项
  if (row.influencerId) {
    influencerOptions.value = [{
      _id: row.influencerId._id,
      tiktokId: row.influencerId.tiktokId,
      tiktokName: row.influencerId.tiktokName
    }]
  }

  dialogVisible.value = true
}

async function handleSubmit() {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    // 构建请求体（独立模式）
    let body = {
      videoLink: formData.videoLink,
      videoStreamCode: formData.videoStreamCode,
      isAdPromotion: formData.isAdPromotion,
      adPromotionTime: formData.adPromotionTime || undefined,
      productId: formData.productId,
      influencerId: formData.influencerId,
      sampleId: formData.sampleId || undefined
    }
    
    if (formData.operator) {
      body.createdBy = formData.operator
    }
    
    // 编辑时不需要特殊处理，因为所有字段都已包含

    const url = isEditing.value ? `${API_BASE}/${editingId.value}` : API_BASE
    const method = isEditing.value ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AuthManager.getToken()}`
      },
      body: JSON.stringify(body)
    })

    const json = await res.json()

    if (json.success) {
      ElMessage.success(json.message || (isEditing.value ? t('videos.updateSuccess') : t('videos.createSuccess')))
      dialogVisible.value = false
      loadVideos()
    } else {
      ElMessage.error(json.message || t('videos.operationFailed'))
    }
  } catch (e) {
    ElMessage.error(t('videos.operationFailed'))
  } finally {
    submitting.value = false
  }
}

async function handleDelete(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${AuthManager.getToken()}` }
    })
    const json = await res.json()
    if (json.success) {
      ElMessage.success(t('videos.deleteSuccess'))
      loadVideos()
    } else {
      ElMessage.error(json.message || t('videos.deleteFailed'))
    }
  } catch (e) {
    ElMessage.error(t('videos.deleteFailed'))
  }
}

// 格式化日期
function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString()
}

function formatDateTime(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString()
}

onMounted(() => {
  loadUsers()
  loadVideos()
})
</script>

<style scoped>
.video-management {
  padding: 0;
}

.search-card {
  margin-bottom: 16px;
}
.search-card :deep(.el-card__body) {
  padding-bottom: 2px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.total-count {
  color: #909399;
  font-size: 14px;
}

.table-card {
  margin-bottom: 16px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 8px;
}

.video-link {
  color: #7b1fa2;
  text-decoration: none;
  word-break: break-all;
}
.video-link:hover {
  text-decoration: underline;
}

.product-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.product-thumb {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  border: 1px solid #ebeef5;
  flex-shrink: 0;
}

.product-thumb-placeholder {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  border: 1px dashed #dcdfe6;
  background-color: #f5f7fa;
  flex-shrink: 0;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.product-name {
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-id {
  font-size: 11px;
  color: #909399;
}

.product-id.purple {
  color: #7b1fa2;
}

.shop-name {
  font-size: 11px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.shop-svg-icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

/* 文本截断样式 */
.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

/* 链接操作按钮 */
.link-actions,
.stream-code-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.copy-icon {
  color: #7b1fa2;
  cursor: pointer;
  font-size: 14px;
}
.copy-icon:hover {
  color: #5a0f7a;
}
</style>
