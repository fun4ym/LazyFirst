<template>
  <div class="base-data-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>{{ $t('menu.baseData') }}</h3>
          <div>
            <el-button type="primary" @click="showCreateDialog" v-if="hasPermission('baseData:create')">
              <el-icon><Plus /></el-icon>
              {{ $t('common.add') }}
            </el-button>
            <el-button type="danger" @click="handleBatchDelete" :disabled="!hasSelected" v-if="hasPermission('baseData:btn-batch-delete')">
              {{ $t('common.delete') }}
            </el-button>
            <el-button type="success" @click="exportData" :loading="exporting" v-if="hasPermission('baseData:btn-export')">
              <el-icon><Download /></el-icon>
              {{ $t('common.export') }}
            </el-button>
          </div>
        </div>
      </template>

      <!-- 标签页 -->
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane :label="$t('baseData.country')" name="country" />
        <el-tab-pane :label="$t('baseData.category')" name="category" />
        <el-tab-pane :label="$t('baseData.grade')" name="grade" />
        <el-tab-pane :label="$t('baseData.priceUnit')" name="priceUnit" />
        <el-tab-pane :label="$t('baseData.timeoutConfig')" name="timeoutConfig" />
        <el-tab-pane :label="$t('baseData.trackingUrl')" name="trackingUrl" />
        <el-tab-pane :label="$t('baseData.influencerCategory')" name="influencerCategory" />
      </el-tabs>

      <!-- 搜索筛选 -->
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item :label="$t('baseData.name')">
          <el-input
            v-model="searchForm.search"
            :placeholder="$t('baseData.searchPlaceholder')"
            clearable
            style="width: 200px"
            @keyup.enter="loadData"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">{{ $t('baseData.search') }}</el-button>
          <el-button @click="resetSearch">{{ $t('baseData.reset') }}</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" :label="$t('baseData.name')" width="200" />
        <el-table-column prop="code" :label="$t('baseData.code')" width="150">
          <template #default="{ row }">
            {{ row.code || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="value" :label="$t('baseData.value')" width="200">
          <template #default="{ row }">
            {{ row.value || row.description || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="creatorId.realName" :label="$t('baseData.creator')" width="100">
          <template #default="{ row }">
            {{ row.creatorId?.realName || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="status" :label="$t('baseData.status')" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? $t('baseData.active') : $t('baseData.inactive') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isDefault" :label="$t('baseData.isDefault')" width="80" v-if="activeTab === 'country' || activeTab === 'priceUnit'">
          <template #default="{ row }">
            <el-tag :type="row.isDefault ? 'warning' : 'info'">
              {{ row.isDefault ? $t('baseData.yes') : $t('baseData.no') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" :label="$t('baseData.createdAt')" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('baseData.operation')" fixed="right" width="150">
          <template #default="{ row }">
            <el-button link type="primary" @click="showEditDialog(row)" v-if="hasPermission('baseData:update')">{{ $t('baseData.edit') }}</el-button>
            <el-button link type="danger" @click="handleDelete(row)" v-if="hasPermission('baseData:delete')">{{ $t('common.delete') }}</el-button>
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
        @size-change="loadData"
        @current-change="loadData"
        style="margin-top: 20px"
      />
    </el-card>

    <!-- 新建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? $t('baseData.editTitle') : $t('baseData.createTitle')"
      width="600px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item :label="$t('baseData.name')" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>

        <el-form-item :label="$t('baseData.code')" prop="code" v-if="activeTab === 'country' || activeTab === 'priceUnit'">
          <el-input v-model="form.code" :placeholder="activeTab === 'country' ? $t('baseData.codePlaceholderCountry') : $t('baseData.codePlaceholderCurrency')" />
        </el-form-item>

        <el-form-item :label="$t('baseData.englishName')" prop="englishName" v-if="activeTab === 'country'">
          <el-input v-model="form.englishName" :placeholder="$t('baseData.englishNamePlaceholder')" />
        </el-form-item>

        <el-form-item :label="$t('baseData.exchangeRate')" prop="value" v-if="activeTab === 'priceUnit'">
          <el-input-number v-model="form.value" :min="0" :precision="4" style="width: 100%" />
          <span style="margin-left: 10px; color: #999;">{{ $t('baseData.exchangeRateTip') }}</span>
        </el-form-item>

        <el-form-item :label="$t('baseData.value')" prop="value" v-if="activeTab === 'timeoutConfig'">
          <el-input-number v-model="form.value" :min="0" :precision="0" style="width: 100%" />
          <span style="margin-left: 10px; color: #999;">{{ $t('baseData.timeoutTip') }}</span>
        </el-form-item>

        <el-form-item :label="$t('baseData.trackingUrl')" prop="value" v-if="activeTab === 'trackingUrl'">
          <el-input v-model="form.value" type="textarea" :rows="3" :placeholder="$t('baseData.trackingUrlPlaceholder')" />
        </el-form-item>

        <el-form-item :label="$t('baseData.description')" prop="description" v-if="activeTab === 'category' || activeTab === 'grade'">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>

        <el-form-item :label="$t('baseData.status')" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="active">{{ $t('baseData.active') }}</el-radio>
            <el-radio value="inactive">{{ $t('baseData.inactive') }}</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item :label="$t('baseData.isDefault')" prop="isDefault" v-if="activeTab === 'country' || activeTab === 'priceUnit'">
          <el-switch v-model="form.isDefault" />
          <span style="margin-left: 10px; color: #999;">{{ $t('baseData.defaultTip') }}</span>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ $t('baseData.cancel') }}</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">{{ $t('baseData.confirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import { Plus, Download } from '@element-plus/icons-vue'
import AuthManager from '@/utils/auth'

const hasPermission = (perm) => AuthManager.hasPermission(perm)

const loading = ref(false)
const exporting = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const activeTab = ref('country')
const tableData = ref([])
const selectedRows = ref([])

const searchForm = reactive({
  search: ''
})

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

const form = reactive({
  name: '',
  code: '',
  englishName: '',
  value: null,
  description: '',
  status: 'active',
  isDefault: false
})

const rules = computed(() => ({
  name: [
    { required: true, message: t('common.input') + t('baseData.name'), trigger: 'blur' }
  ],
  code: [
    { required: false, message: t('common.input') + t('baseData.code'), trigger: 'blur' }
  ]
}))

const hasSelected = computed(() => selectedRows.value.length > 0)

const tabLabels = computed(() => ({
  country: t('baseData.country'),
  category: t('baseData.category'),
  grade: t('baseData.grade'),
  priceUnit: t('baseData.priceUnit'),
  timeoutConfig: t('baseData.timeoutConfig'),
  trackingUrl: t('baseData.trackingUrl'),
  influencerCategory: t('baseData.influencerCategory')
}))

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      type: activeTab.value,
      ...searchForm
    }
    const res = await request.get('/base-data', { params })
    tableData.value = res.data || []
    pagination.total = res.pagination?.total || 0
  } catch (error) {
    console.error('Load data error:', error)
  } finally {
    loading.value = false
  }
}

const handleTabChange = () => {
  searchForm.search = ''
  pagination.page = 1
  loadData()
}

const showCreateDialog = () => {
  isEdit.value = false
  dialogVisible.value = true
  resetForm()
}

const showEditDialog = (row) => {
  isEdit.value = true
  dialogVisible.value = true
  Object.assign(form, {
    _id: row._id,
    name: row.name,
    code: row.code || '',
    englishName: row.englishName || '',
    value: row.value || null,
    description: row.description || '',
    status: row.status,
    isDefault: row.isDefault || false
  })
}

const resetForm = () => {
  Object.assign(form, {
    name: '',
    code: '',
    englishName: '',
    value: null,
    description: '',
    status: 'active',
    isDefault: false
  })
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      const data = {
        ...form,
        type: activeTab.value
      }

      if (isEdit.value) {
        await request.put(`/base-data/${data._id}`, data)
        ElMessage.success(t('baseData.updateSuccess'))
      } else {
        await request.post('/base-data', data)
        ElMessage.success(t('baseData.createSuccess'))
      }

      dialogVisible.value = false
      loadData()
    } catch (error) {
      console.error('Submit error:', error)
    } finally {
      submitting.value = false
    }
  })
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(t('baseData.confirmDelete', { name: row.name }), t('common.warning'), {
      type: 'warning'
    })

    await request.delete(`/base-data/${row._id}`)
    ElMessage.success(t('baseData.deleteSuccess'))
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete error:', error)
    }
  }
}

const handleBatchDelete = async () => {
  const ids = selectedRows.value.map(row => row._id)
  try {
    await ElMessageBox.confirm(t('baseData.confirmDeleteSelected', { count: ids.length }), t('common.warning'), {
      type: 'warning'
    })

    await request.delete('/base-data/batch', { data: { ids } })
    ElMessage.success(t('baseData.deleteSuccess'))
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Batch delete error:', error)
    }
  }
}

const handleSelectionChange = (selection) => {
  selectedRows.value = selection
}

const resetSearch = () => {
  searchForm.search = ''
  pagination.page = 1
  loadData()
}

const exportData = async () => {
  exporting.value = true
  try {
    const params = {
      type: activeTab.value,
      ...searchForm,
      isExport: true
    }
    const res = await request.get('/base-data', { params })

    const csvContent = res.data
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${tabLabels.value[activeTab.value]}_${new Date().toLocaleDateString()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success(t('baseData.exportSuccess'))
  } catch (error) {
    console.error('Export error:', error)
    ElMessage.error(t('baseData.exportFailed'))
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.base-data-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #4a148c;
  margin: 0;
}

.search-form {
  margin-bottom: 16px;
  padding: 16px 0;
  border-bottom: 1px solid #e8e8e8;
}

.el-button + .el-button {
  margin-left: 8px;
}
</style>
