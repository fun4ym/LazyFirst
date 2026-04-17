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

        <el-form-item :label="$t('influencer.account')">
          <el-input
            v-model="searchForm.influencerAccount"
            clearable
            :placeholder="$t('influencer.inputAccountPlaceholder')"
            style="width: 160px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>

        <el-form-item :label="$t('products.productName')">
          <el-input
            v-model="searchForm.productName"
            clearable
            :placeholder="$t('common.search')"
            style="width: 150px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>

        <el-form-item :label="$t('videos.adStatus')">
          <el-select
            v-model="searchForm.isAdPromotion"
            clearable
            :placeholder="$t('common.all')"
            style="width: 120px"
            @change="handleSearch"
          >
            <el-option :label="$t('videos.adPromoted')" :value="'true'" />
            <el-option :label="$t('videos.notAdPromoted')" :value="'false'" />
          </el-select>
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
        <el-table-column :label="$t('videos.registeredBy')" width="100">
          <template #default="{ row }">
            {{ row.createdBy?.realName || row.createdBy?.username || '-' }}
          </template>
        </el-table-column>

        <el-table-column :label="$t('influencer.account')" min-width="130">
          <template #default="{ row }">
            {{ row.influencerId?.tiktokId || '-' }}
          </template>
        </el-table-column>

        <el-table-column :label="$t('influencer.name')" min-width="110">
          <template #default="{ row }">
            {{ row.influencerId?.tiktokName || '-' }}
          </template>
        </el-table-column>

        <el-table-column :label="$t('products.productName')" min-width="150">
          <template #default="{ row }">
            <div class="product-cell">
              <el-image
                v-if="row.productId?.images?.[0]"
                :src="row.productId.images[0]"
                fit="cover"
                class="product-thumb"
                :preview-src-list="[row.productId.images[0]]"
              />
              <span>{{ row.productId?.name || '-' }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="$t('samples.productId')" width="120">
          <template #default="{ row }">
            {{ row.productId?.tiktokProductId || '-' }}
          </template>
        </el-table-column>

        <el-table-column :label="$t('samples.videoLink')" min-width="180">
          <template #default="{ row }">
            <div class="text-truncate">
              <a v-if="row.videoLink" :href="row.videoLink" target="_blank" class="video-link">
                {{ row.videoLink }}
              </a>
              <span v-else>-</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="$t('samples.videoStreamCode')" width="120">
          <template #default="{ row }">
            {{ row.videoStreamCode || '-' }}
          </template>
        </el-table-column>

        <el-table-column :label="$t('videos.adStatus')" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isAdPromotion ? 'success' : 'info'" size="small">
              {{ row.isAdPromotion ? $t('common.yes') : $t('common.no') }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="$t('samples.date')" width="110" sortable>
          <template #default="{ row }">
            {{ formatDate(row.sampleId?.date) }}
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
        <!-- 创建模式选择 -->
        <el-form-item :label="$t('videos.creationMode')">
          <el-radio-group v-model="formData.creationMode">
            <el-radio label="sampleLinked">{{ $t('videos.modeSampleLinked') }}</el-radio>
            <el-radio label="independent">{{ $t('videos.modeIndependent') }}</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 样品关联模式字段 -->
        <div v-if="formData.creationMode === 'sampleLinked'">
          <el-form-item :label="$t('videos.sampleRecord')" prop="sampleId">
            <el-select
              v-model="formData.sampleId"
              filterable
              remote
              reserve-keyword
              :remote-method="searchSamples"
              :loading="sampleSearchLoading"
              :placeholder="$t('videos.selectSample')"
              style="width: 100%"
            >
              <el-option
                v-for="s in sampleOptions"
                :key="s._id"
                :label="`${formatDate(s.date)} | ${s.influencerId?.tiktokId} | ${s.productId?.name}`"
                :value="s._id"
              />
            </el-select>
          </el-form-item>
        </div>

        <!-- 独立创建模式字段 -->
        <div v-else>
          <!-- 操作员选择 -->
          <el-form-item :label="$t('videos.operator')">
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
                :label="p.name"
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
        </div>

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
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import AuthManager from '@/utils/auth'

const { t } = useI18n()

const API_BASE = '/api/videos'

// 搜索表单
const searchForm = reactive({
  dateRange: [],
  createdBy: '',
  influencerAccount: '',
  productName: '',
  isAdPromotion: ''
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
  videoLink: '',
  videoStreamCode: '',
  isAdPromotion: false,
  adPromotionTime: '',
  // 独立创建模式字段
  creationMode: 'sampleLinked', // 'sampleLinked' 或 'independent'
  productId: '',
  influencerId: '',
  operator: ''
})

const formRules = {
  sampleId: [{ 
    required: true, 
    message: () => t('videos.selectSampleRequired'), 
    trigger: 'change',
    validator: (rule, value, callback) => {
      if (formData.creationMode === 'sampleLinked' && !value) {
        callback(new Error(t('videos.selectSampleRequired')))
      } else {
        callback()
      }
    }
  }],
  productId: [{
    required: true,
    message: () => t('videos.selectProductRequired'),
    trigger: 'change',
    validator: (rule, value, callback) => {
      if (formData.creationMode === 'independent' && !value) {
        callback(new Error(t('videos.selectProductRequired')))
      } else {
        callback()
      }
    }
  }],
  influencerId: [{
    required: true,
    message: () => t('videos.selectInfluencerRequired'),
    trigger: 'change',
    validator: (rule, value, callback) => {
      if (formData.creationMode === 'independent' && !value) {
        callback(new Error(t('videos.selectInfluencerRequired')))
      } else {
        callback()
      }
    }
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

// 计算属性：是否可以选其他操作员（基于数据权限）
const canSelectOtherOperator = computed(() => {
  // 这里需要根据实际的数据权限逻辑实现
  // 暂时假设如果用户数据范围是"只看自己"，则不能选择其他操作员
  const userDataScope = AuthManager.getUserDataScope?.('videos') || 'all'
  return userDataScope !== 'self'
})

// 加载用户列表
async function loadUsers() {
  try {
    const res = await fetch('/api/users', {
      headers: { Authorization: `Bearer ${AuthManager.getToken()}` }
    })
    const json = await res.json()
    if (json.success && json.data) {
      userList.value = json.data.users || []
    }
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
    if (searchForm.influencerAccount) params.append('influencerAccount', searchForm.influencerAccount)
    if (searchForm.productName) params.append('productName', searchForm.productName)
    if (searchForm.isAdPromotion !== '') params.append('isAdPromotion', searchForm.isAdPromotion)

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
  searchForm.influencerAccount = ''
  searchForm.productName = ''
  searchForm.isAdPromotion = ''
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
    const res = await fetch(`/api/products?page=1&limit=20&${new URLSearchParams({ name: query })}`, {
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
    const res = await fetch(`/api/influencers?page=1&limit=20&${new URLSearchParams({ tiktokId: query })}`, {
      headers: { Authorization: `Bearer ${AuthManager.getToken()}` }
    })
    const json = await res.json()
    if (json.success) {
      influencerOptions.value = json.data.influencers || []
    }
  } catch (e) {
    console.error(t('videos.searchInfluencerFailed'), e)
  } finally {
    influencerSearchLoading.value = false
  }
}

function openAddDialog() {
  isEditing.value = false
  editingId.value = null
  formData.sampleId = ''
  formData.videoLink = ''
  formData.videoStreamCode = ''
  formData.isAdPromotion = false
  formData.adPromotionTime = ''
  formData.creationMode = 'sampleLinked'
  formData.productId = ''
  formData.influencerId = ''
  formData.operator = ''
  dialogVisible.value = true
}

function openEditDialog(row) {
  isEditing.value = true
  editingId.value = row._id
  formData.sampleId = row.sampleId?._id || ''
  formData.videoLink = row.videoLink || ''
  formData.videoStreamCode = row.videoStreamCode || ''
  formData.isAdPromotion = row.isAdPromotion || false
  formData.adPromotionTime = row.adPromotionTime ? row.adPromotionTime.slice(0, 19).replace('T', ' ') : ''
  
  // 根据是否有sampleId决定创建模式
  formData.creationMode = row.sampleId ? 'sampleLinked' : 'independent'
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
    // 根据创建模式构建请求体
    let body = {
      videoLink: formData.videoLink,
      videoStreamCode: formData.videoStreamCode,
      isAdPromotion: formData.isAdPromotion,
      adPromotionTime: formData.adPromotionTime || undefined
    }
    
    if (formData.creationMode === 'sampleLinked') {
      // 样品关联模式
      body.sampleId = formData.sampleId
    } else {
      // 独立创建模式
      body.productId = formData.productId
      body.influencerId = formData.influencerId
      if (formData.operator) {
        body.createdBy = formData.operator
      }
    }
    
    // 编辑时需要发送所有字段，因为后端PUT路由会处理更新
    if (isEditing.value) {
      // 确保发送当前模式下的所有关联字段
      if (formData.creationMode === 'sampleLinked') {
        // 如果切换到样品关联模式，确保productId和influencerId不被发送（后端会从样品中获取）
        // 但为了明确，我们发送空值
        body.productId = undefined
        body.influencerId = undefined
      } else {
        // 独立创建模式，确保sampleId为空
        body.sampleId = undefined
      }
    }

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

/* 文本截断样式 */
.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
</style>
