<template>
  <div class="recruitments-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>{{ $t('recruitment.title') }}</h3>
          <el-button type="primary" @click="showAddDialog" v-if="hasPermission('recruitments:create')">
            <el-icon><Plus /></el-icon>
            {{ $t('recruitment.add') }}
          </el-button>
        </div>
      </template>

      <!-- 搜索表单 -->
      <el-form :inline="true" class="search-form">
        <el-form-item :label="$t('recruitment.keyword')">
          <el-input
            v-model="searchForm.keyword"
            :placeholder="$t('recruitment.keywordPlaceholder')"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item :label="$t('recruitment.status')">
          <el-select v-model="searchForm.enabled" :placeholder="$t('recruitment.all')" clearable style="width: 120px">
            <el-option :label="$t('recruitment.all')" value="" />
            <el-option :label="$t('recruitment.enabled')" :value="true" />
            <el-option :label="$t('recruitment.disabled')" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">{{ $t('recruitment.search') }}</el-button>
          <el-button @click="handleReset">{{ $t('recruitment.reset') }}</el-button>
        </el-form-item>
      </el-form>

      <!-- 数据表格 -->
      <el-table :data="tableData" v-loading="loading" border stripe>
        <el-table-column :label="$t('recruitment.name')" min-width="350" fixed="left">
          <template #default="{ row }">
            <div class="recruit-name" @click="showDetail(row)">{{ row.name }}</div>
            <div class="truncate-text" style="margin-top: 4px">{{ row.description || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('recruitment.requirement')" width="280">
          <template #default="{ row }">
            <div style="margin-bottom: 6px; font-size: 13px">
              {{ row.isStrict ? '✅' : '❌' }} {{ $t('recruitment.isStrictShort') }}
            </div>
            <div class="req-grid">
              <el-tooltip :content="$t('recruitment.requirementGmv')" placement="top" :show-after="300">
                <div class="req-item">
                  <div class="req-label">GMV</div>
                  <div class="req-value">{{ row.requirementGmv > 0 ? row.requirementGmv.toLocaleString() : '-' }}</div>
                </div>
              </el-tooltip>
              <el-tooltip :content="$t('recruitment.requirementFollowers')" placement="top" :show-after="300">
                <div class="req-item">
                  <div class="req-label">FV</div>
                  <div class="req-value">{{ row.requirementFollowers > 0 ? row.requirementFollowers + 'K' : '-' }}</div>
                </div>
              </el-tooltip>
              <el-tooltip :content="$t('recruitment.requirementMonthlySales')" placement="top" :show-after="300">
                <div class="req-item">
                  <div class="req-label">MSS</div>
                  <div class="req-value">{{ row.requirementMonthlySales > 0 ? row.requirementMonthlySales.toLocaleString() : '-' }}</div>
                </div>
              </el-tooltip>
              <el-tooltip :content="$t('recruitment.requirementAvgViews')" placement="top" :show-after="300">
                <div class="req-item">
                  <div class="req-label">APV</div>
                  <div class="req-value">{{ row.requirementAvgViews > 0 ? row.requirementAvgViews.toLocaleString() : '-' }}</div>
                </div>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('recruitment.products')" width="150">
          <template #default="{ row }">
            <span v-if="row.products && row.products.length > 0">
              {{ row.products.length }}{{ $t('recruitment.productsField') }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('recruitment.callableUsers')" width="120">
          <template #default="{ row }">
            <span v-if="row.callableUsers && row.callableUsers.length > 0">
              {{ row.callableUsers.length }}{{ $t('recruitment.callableUsersField') }}
            </span>
            <span v-else>{{ $t('recruitment.allUsers') }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('recruitment.enabledStatus')" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
              {{ row.enabled ? $t('recruitment.enabled') : $t('recruitment.disabled') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('recruitment.maintainer')" width="160">
          <template #default="{ row }">
            <div>{{ row.updatedBy?.nickname || row.updatedBy?.username || row.creatorId?.nickname || row.creatorId?.username || '-' }}</div>
            <div class="truncate-text" style="margin-top: 2px">{{ formatDate(row.updatedAt || row.createdAt) }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.operation')" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="showEditDialog(row)" v-if="hasPermission('recruitments:update')">{{ $t('recruitment.edit') }}</el-button>
            <el-button link type="danger" @click="handleDelete(row)" v-if="hasPermission('recruitments:delete')">{{ $t('recruitment.delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? $t('recruitment.editTitle') : $t('recruitment.addTitle')"
      width="700px"
      @close="handleDialogClose"
    >
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="140px">
        <el-form-item :label="$t('recruitment.nameField')" prop="name">
          <el-input v-model="form.name" :placeholder="$t('recruitment.namePlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('recruitment.descriptionField')">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            :placeholder="$t('recruitment.descriptionPlaceholder')"
          />
        </el-form-item>
        <el-form-item :label="$t('recruitment.isStrictField')">
          <el-switch v-model="form.isStrict" />
          <span style="margin-left: 8px; color: #909399; font-size: 12px">{{ $t('recruitment.isStrictTip') }}</span>
        </el-form-item>
        <el-form-item :label="$t('recruitment.gmvField')">
          <el-input-number v-model="form.requirementGmv" :min="0" :step="1000" style="width: 100%" />
        </el-form-item>
        <el-form-item :label="$t('recruitment.followersField')">
          <el-input-number v-model="form.requirementFollowers" :min="0" :step="10" style="width: 100%" />
        </el-form-item>
        <el-form-item :label="$t('recruitment.monthlySalesField')">
          <el-input-number v-model="form.requirementMonthlySales" :min="0" :step="100" style="width: 100%" />
        </el-form-item>
        <el-form-item :label="$t('recruitment.avgViewsField')">
          <el-input-number v-model="form.requirementAvgViews" :min="0" :step="1000" style="width: 100%" />
        </el-form-item>
        <el-form-item :label="$t('recruitment.productsField')">
          <el-select
            v-model="form.products"
            multiple
            filterable
            remote
            reserve-keyword
            :placeholder="$t('recruitment.productsPlaceholder')"
            :remote-method="searchProducts"
            :loading="productsLoading"
            style="width: 100%"
          >
            <el-option
              v-for="item in productList"
              :key="item._id"
              :label="item.name"
              :value="item._id"
            >
              <div class="product-option">
                <span>{{ item.name }}</span>
                <span style="color: #909399; font-size: 12px">{{ item.sku }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('recruitment.callableUsersField')">
          <el-select
            v-model="form.callableUsers"
            multiple
            filterable
            :placeholder="$t('recruitment.callableUsersPlaceholder')"
            style="width: 100%"
          >
            <el-option
              v-for="item in userList"
              :key="item._id"
              :label="item.nickname || item.username"
              :value="item._id"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('recruitment.enabledField')">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">{{ $t('recruitment.cancel') }}</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">{{ $t('recruitment.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="detailData?.name || ''"
      direction="rtl"
      size="420px"
    >
      <div class="phone-screen" v-if="detailData">
        <!-- 基本信息 -->
        <div class="detail-section">
          <div class="detail-desc">{{ detailData.description || '-' }}</div>
          <div class="detail-tags">
            <el-tag :type="detailData.enabled ? 'success' : 'info'" size="small">
              {{ detailData.enabled ? $t('recruitment.enabled') : $t('recruitment.disabled') }}
            </el-tag>
          </div>
        </div>

        <!-- 达人要求 -->
        <div class="detail-section" :class="detailData.isStrict ? 'req-section-strict' : 'req-section-loose'">
          <div class="section-title">
            {{ $t('recruitment.requirement') }}
            <el-tag :type="detailData.isStrict ? 'danger' : 'success'" size="small" style="margin-left: 8px">
              {{ detailData.isStrict ? $t('recruitment.strictYes') : $t('recruitment.strictNo') }} {{ $t('recruitment.isStrictShort') }}
            </el-tag>
          </div>
          <div class="req-grid" style="grid-template-columns: 1fr 1fr">
            <el-tooltip :content="$t('recruitment.requirementGmv')" placement="top" :show-after="300">
              <div class="req-item">
                <div class="req-label">GMV</div>
                <div class="req-value">{{ detailData.requirementGmv > 0 ? detailData.requirementGmv.toLocaleString() : '-' }}</div>
              </div>
            </el-tooltip>
            <el-tooltip :content="$t('recruitment.requirementFollowers')" placement="top" :show-after="300">
              <div class="req-item">
                <div class="req-label">FV</div>
                <div class="req-value">{{ detailData.requirementFollowers > 0 ? detailData.requirementFollowers + 'K' : '-' }}</div>
              </div>
            </el-tooltip>
            <el-tooltip :content="$t('recruitment.requirementMonthlySales')" placement="top" :show-after="300">
              <div class="req-item">
                <div class="req-label">MSS</div>
                <div class="req-value">{{ detailData.requirementMonthlySales > 0 ? detailData.requirementMonthlySales.toLocaleString() : '-' }}</div>
              </div>
            </el-tooltip>
            <el-tooltip :content="$t('recruitment.requirementAvgViews')" placement="top" :show-after="300">
              <div class="req-item">
                <div class="req-label">APV</div>
                <div class="req-value">{{ detailData.requirementAvgViews > 0 ? detailData.requirementAvgViews.toLocaleString() : '-' }}</div>
              </div>
            </el-tooltip>
          </div>
        </div>

        <!-- 包含产品 -->
        <div class="detail-section">
          <div class="section-title">{{ $t('recruitment.productsField') }}</div>
          <div v-if="detailData.products && detailData.products.length > 0" class="product-list">
            <div v-for="prod in detailData.products" :key="prod._id" class="product-card">
              <a v-if="getDefaultActivityLink(prod)" :href="getDefaultActivityLink(prod)" target="_blank" class="prod-name prod-name-link">{{ prod.name }}</a>
              <div v-else class="prod-name">{{ prod.name }}</div>
              <div class="prod-id">{{ prod.tiktokProductId || prod.sku || '-' }}</div>
              <div class="prod-rates">
                <span class="rate-square">
                  <span class="rate-label">{{ $t('recruitment.squareRate') }}</span>
                  <span class="rate-value rate-line">{{ formatRate(getProductSquareRate(prod)) }}</span>
                </span>
                <span class="rate-promo">
                  <span class="rate-label">{{ $t('recruitment.promoRate') }}</span>
                  <span class="rate-value rate-promo-value">{{ formatRate(getProductPromoRate(prod)) }}</span>
                </span>
                <span v-if="calcExtra(prod) > 0" class="rate-extra">
                  <span class="extra-badge">+{{ calcExtra(prod) }}%</span>
                  <span class="extra-label">{{ $t('recruitment.extraPromo') }}</span>
                </span>
              </div>
            </div>
          </div>
          <div v-else class="empty-text">{{ $t('recruitment.noProducts') }}</div>
        </div>

        <!-- 识别码 -->
        <div class="code-section" :style="{ borderColor: pageStyleConfig.themeColor }">
          <div class="code-header">
            <span class="code-label">{{ $t('recruitment.identificationCode') }}</span>
            <el-button size="small" type="primary" plain @click="refreshCode" :loading="codeLoading" style="background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.4); color: #fff">{{ $t('recruitment.refresh') }}</el-button>
          </div>
          <div class="code-value">{{ detailData.identificationCode || '-' }}</div>

          <!-- 页面样式设置 -->
          <div class="style-config">
            <div class="style-config-item">
              <span class="style-config-label">{{ $t('recruitment.pageStyle') }}</span>
              <el-select v-model="pageStyleConfig.layoutStyle" size="small" style="width: 120px" @change="savePageStyle">
                <el-option :label="$t('recruitment.styleWarm')" value="warm" />
                <el-option :label="$t('recruitment.styleSweet')" value="sweet" />
                <el-option :label="$t('recruitment.styleTech')" value="tech" />
              </el-select>
            </div>
          </div>
          <div class="style-config">
            <div class="style-config-item">
              <span class="style-config-label">{{ $t('recruitment.themeColor') }}</span>
              <el-color-picker v-model="pageStyleConfig.themeColor" size="small" @change="savePageStyle" />
            </div>
            <div class="preset-colors">
              <span
                v-for="color in presetColors"
                :key="color.value"
                class="preset-color-dot"
                :style="{ background: color.value }"
                :title="$t(color.i18nKey)"
                @click="pageStyleConfig.themeColor = color.value; savePageStyle()"
              ></span>
            </div>
          </div>

          <!-- 识别码已生成时：跳转和复制入口 -->
          <div v-if="detailData.identificationCode" class="code-actions">
            <a :href="getPublicUrl()" target="_blank" class="code-action-btn">
              <el-icon :size="14"><Link /></el-icon>
              <span>打开链接</span>
            </a>
            <div class="code-action-btn" @click="copyPublicUrl">
              <el-icon :size="14"><CopyDocument /></el-icon>
              <span>复制链接</span>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import AuthManager from '@/utils/auth'
import { Plus, Link, CopyDocument } from '@element-plus/icons-vue'
import { presetColors } from './components/recruitmentStyles'

const { t } = useI18n()
const hasPermission = (perm) => AuthManager.hasPermission(perm)

// 搜索表单
const searchForm = reactive({
  keyword: '',
  enabled: ''
})

// 表格数据
const tableData = ref([])
const loading = ref(false)

// 对话框
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const currentId = ref(null)

// 表单
const formRef = ref(null)
const form = reactive({
  name: '',
  description: '',
  isStrict: false,
  requirementGmv: 0,
  requirementFollowers: 0,
  requirementMonthlySales: 0,
  requirementAvgViews: 0,
  products: [],
  callableUsers: [],
  enabled: true
})

const formRules = {
  name: [
    { required: true, message: t('recruitment.nameRequired'), trigger: 'blur' }
  ]
}

// 产品列表
const productList = ref([])
const productsLoading = ref(false)

// 用户列表
const userList = ref([])

// 格式化日期
const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

// 搜索产品
const searchProducts = async (query) => {
  productsLoading.value = true
  try {
    // request拦截器会直接返回数组，不需要检查success
    let data = await request.get('/recruitments/products/list')
    if (!Array.isArray(data)) data = []
    // 如果有查询词，前端过滤
    if (query) {
      data = data.filter(p => p.name?.toLowerCase().includes(query.toLowerCase()) || p.sku?.toLowerCase().includes(query.toLowerCase()))
    }
    productList.value = data
  } catch (error) {
    console.error('Search products error:', error)
  } finally {
    productsLoading.value = false
  }
}

// 加载用户列表
const loadUsers = async () => {
  try {
    let data = await request.get('/recruitments/users/list')
    userList.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Load users error:', error)
  }
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const params = {}
    if (searchForm.keyword) params.keyword = searchForm.keyword
    if (searchForm.enabled !== '') params.enabled = searchForm.enabled

    const res = await request.get('/recruitments', { params })
    // 拦截器对数组接口直接返回 data 数组
    tableData.value = Array.isArray(res) ? res : (res.data || [])
  } catch (error) {
    console.error('Load data error:', error)
    ElMessage.error(t('recruitment.loadFailed'))
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  loadData()
}

// 重置
const handleReset = () => {
  searchForm.keyword = ''
  searchForm.enabled = ''
  loadData()
}

// 显示新增对话框
const showAddDialog = async () => {
  isEdit.value = false
  currentId.value = null
  resetForm()
  dialogVisible.value = true
  await loadUsers()
  // 默认加载产品列表
  await searchProducts('')
}

// 显示编辑对话框
const showEditDialog = async (row) => {
  isEdit.value = true
  currentId.value = row._id
  resetForm()
  
  form.name = row.name || ''
  form.description = row.description || ''
  form.isStrict = row.isStrict || false
  form.requirementGmv = row.requirementGmv || 0
  form.requirementFollowers = row.requirementFollowers || 0
  form.requirementMonthlySales = row.requirementMonthlySales || 0
  form.requirementAvgViews = row.requirementAvgViews || 0
  form.products = row.products?.map(p => p._id || p) || []
  form.callableUsers = row.callableUsers?.map(u => u._id || u) || []
  form.enabled = row.enabled !== false

  dialogVisible.value = true
  await loadUsers()
  await searchProducts('')
}

// 重置表单
const resetForm = () => {
  form.name = ''
  form.description = ''
  form.isStrict = false
  form.requirementGmv = 0
  form.requirementFollowers = 0
  form.requirementMonthlySales = 0
  form.requirementAvgViews = 0
  form.products = []
  form.callableUsers = []
  form.enabled = true
}

// 对话框关闭
const handleDialogClose = () => {
  formRef.value?.resetFields()
  resetForm()
}

// 提交
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
  } catch (e) {
    return
  }
  
  submitting.value = true
  try {
    const data = {
      name: form.name,
      description: form.description,
      isStrict: form.isStrict,
      requirementGmv: form.requirementGmv,
      requirementFollowers: form.requirementFollowers,
      requirementMonthlySales: form.requirementMonthlySales,
      requirementAvgViews: form.requirementAvgViews,
      products: form.products,
      callableUsers: form.callableUsers,
      enabled: form.enabled
    }

    if (isEdit.value) {
      await request.put(`/recruitments/${currentId.value}`, data)
      ElMessage.success(t('recruitment.updateSuccess'))
    } else {
      await request.post('/recruitments', data)
      ElMessage.success(t('recruitment.createSuccess'))
    }
    dialogVisible.value = false
    loadData()
  } catch (error) {
    console.error('Submit error:', error)
    ElMessage.error(isEdit.value ? t('recruitment.updateFailed') : t('recruitment.createFailed'))
  } finally {
    submitting.value = false
  }
}

// 删除
const handleDelete = (row) => {
  ElMessageBox.confirm(
    t('recruitment.confirmDelete'),
    t('recruitment.confirmDeleteTip'),
    {
      confirmButtonText: t('recruitment.delete'),
      cancelButtonText: t('recruitment.cancel'),
      type: 'warning'
    }
  ).then(async () => {
    try {
      await request.delete(`/recruitments/${row._id}`)
      ElMessage.success(t('recruitment.deleteSuccess'))
      loadData()
    } catch (error) {
      console.error('Delete error:', error)
      ElMessage.error(t('recruitment.deleteFailed'))
    }
  }).catch(() => {})
}

// 详情抽屉
const drawerVisible = ref(false)
const detailData = ref(null)
const codeLoading = ref(false)

// 页面样式配置
const pageStyleConfig = reactive({
  layoutStyle: 'style1',
  themeColor: '#775999'
})

const showDetail = (row) => {
  detailData.value = row
  // 从数据库的pageStyle字段加载
  if (row.pageStyle) {
    pageStyleConfig.layoutStyle = row.pageStyle.layoutStyle || 'style1'
    pageStyleConfig.themeColor = row.pageStyle.themeColor || '#775999'
  } else {
    pageStyleConfig.layoutStyle = 'warm'
    pageStyleConfig.themeColor = '#775999'
  }
  drawerVisible.value = true
}

// 保存页面样式配置到数据库
const savePageStyle = async () => {
  if (!detailData.value?._id) return
  try {
    await request.put(`/recruitments/${detailData.value._id}`, {
      pageStyle: {
        layoutStyle: pageStyleConfig.layoutStyle,
        themeColor: pageStyleConfig.themeColor
      }
    })
    // 同步更新本地数据
    detailData.value.pageStyle = {
      layoutStyle: pageStyleConfig.layoutStyle,
      themeColor: pageStyleConfig.themeColor
    }
  } catch (error) {
    console.error('Save page style error:', error)
    ElMessage.error('保存样式配置失败')
  }
}

// 获取公开链接
const getPublicUrl = () => {
  if (!detailData.value?.identificationCode) return ''
  return `${window.location.origin}/recruitments/public?y=${detailData.value.identificationCode}`
}

// 复制公开链接
const copyPublicUrl = async () => {
  const url = getPublicUrl()
  if (!url) return
  try {
    await navigator.clipboard.writeText(url)
    ElMessage.success('链接已复制')
  } catch {
    // fallback
    const input = document.createElement('input')
    input.value = url
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    ElMessage.success('链接已复制')
  }
}

// 刷新识别码
const refreshCode = async () => {
  if (!detailData.value?._id) return
  codeLoading.value = true
  try {
    const res = await request.post(`/recruitments/${detailData.value._id}/refresh-code`)
    if (res?.identificationCode) {
      detailData.value.identificationCode = res.identificationCode
    } else if (res?.data?.identificationCode) {
      detailData.value.identificationCode = res.data.identificationCode
    }
    ElMessage.success('识别码已刷新')
  } catch (error) {
    console.error('Refresh code error:', error)
    ElMessage.error('刷新识别码失败')
  } finally {
    codeLoading.value = false
  }
}

const formatRate = (rate) => {
  if (!rate && rate !== 0) return '-'
  return (rate * 100).toFixed(1) + '%'
}

const calcExtra = (prod) => {
  const promo = getProductPromoRate(prod)
  const square = getProductSquareRate(prod)
  const diff = (promo - square) * 100
  return diff > 0 ? diff.toFixed(1) : 0
}

// 获取默认活动配置
const getDefaultActivityConfig = (prod) => {
  if (prod.activityConfigs && prod.activityConfigs.length > 0) {
    const defaultConfig = prod.activityConfigs.find(ac => ac.isDefault)
    return defaultConfig || prod.activityConfigs[0]
  }
  return null
}

// 获取默认活动的activityLink
const getDefaultActivityLink = (prod) => {
  const config = getDefaultActivityConfig(prod)
  return config?.activityLink || ''
}

// 获取推广佣金率（优先从默认活动取，否则从产品顶级字段取）
const getProductPromoRate = (prod) => {
  const config = getDefaultActivityConfig(prod)
  if (config && config.promotionInfluencerRate) return config.promotionInfluencerRate
  return prod.promotionInfluencerRate || 0
}

// 获取广场佣金率（优先从默认活动取，否则从产品顶级字段取）
const getProductSquareRate = (prod) => {
  const config = getDefaultActivityConfig(prod)
  if (config && config.squareCommissionRate !== undefined) return config.squareCommissionRate
  return prod.squareCommissionRate || 0
}

// 初始化
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.recruitments-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h3 {
  margin: 0;
}

.search-form {
  margin-bottom: 20px;
}

.product-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.influencer-data {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.data-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.follower-count {
  font-weight: 600;
  color: #6a1b9a;
  font-size: 13px;
}

.req-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 4px 8px;
}

.req-item {
  text-align: center;
}

.req-label {
  font-size: 11px;
  color: #909399;
}

.req-value {
  font-weight: 600;
  color: #6a1b9a;
  font-size: 13px;
}

.truncate-text {
  font-size: 12px;
  color: #757575;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recruit-name {
  font-weight: 600;
  cursor: pointer;
  color: var(--el-color-primary);
}

.recruit-name:hover {
  text-decoration: underline;
}

.phone-screen {
  padding: 0 4px;
}

.detail-section {
  margin-bottom: 20px;
  padding-bottom: 16px;
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  border-radius: 8px;
}

.detail-section:last-child {
  border-bottom: none;
}

.req-section-strict {
  background-color: #c9bdd6;
}

.req-section-loose {
  background-color: #c5dea3;
}

.code-section {
  background-color: #775999;
  border: 3px solid #775999;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  margin-top: 20px;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.code-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.code-value {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2px;
  font-family: 'Courier New', monospace;
}

.style-config {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.style-config-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.style-config-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
}

.preset-colors {
  display: flex;
  gap: 6px;
  margin-left: 8px;
}

.preset-color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.preset-color-dot:hover {
  transform: scale(1.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.code-actions {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  justify-content: center;
  gap: 24px;
}

.code-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  cursor: pointer;
  font-size: 11px;
  transition: color 0.2s;
}

.code-action-btn:hover {
  color: #fff;
}

.detail-desc {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 8px;
}

.detail-tags {
  display: flex;
  gap: 6px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
}

.empty-text {
  font-size: 12px;
  color: #c0c4cc;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.product-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 10px 12px;
}

.prod-name {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.prod-name-link {
  color: var(--el-color-primary);
  text-decoration: none;
  cursor: pointer;
}

.prod-name-link:hover {
  text-decoration: underline;
}

.prod-id {
  font-size: 11px;
  color: #909399;
  margin: 4px 0 8px;
}

.prod-rates {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.rate-square, .rate-promo {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.rate-label {
  font-size: 10px;
  color: #c0c4cc;
}

.rate-value {
  font-weight: 600;
  font-size: 14px;
}

.rate-line {
  color: #c0c4cc;
  text-decoration: line-through;
}

.rate-promo-value {
  color: #e6a23c;
  font-size: 16px;
}

.rate-extra {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.extra-badge {
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  color: white;
  font-weight: 700;
  font-size: 13px;
  padding: 2px 8px;
  border-radius: 10px;
  animation: pulse 1.5s infinite;
}

.extra-label {
  font-size: 10px;
  color: #ff6b6b;
  margin-top: 2px;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
</style>
