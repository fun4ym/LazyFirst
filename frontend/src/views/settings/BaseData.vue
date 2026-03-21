<template>
  <div class="base-data-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>{{ $t('menu.baseData') }}</h3>
          <div>
            <el-button type="primary" @click="showCreateDialog" v-if="hasPermission('base-data:create')">
              <el-icon><Plus /></el-icon>
              {{ $t('common.add') }}
            </el-button>
            <el-button type="danger" @click="handleBatchDelete" :disabled="!hasSelected" v-if="hasPermission('base-data:btn-batch-delete')">
              {{ $t('common.delete') }}
            </el-button>
            <el-button type="success" @click="exportData" :loading="exporting" v-if="hasPermission('base-data:btn-export')">
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
        <el-tab-pane label="达人归类标签" name="influencerCategory" />
      </el-tabs>

      <!-- 搜索筛选 -->
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item label="名称">
          <el-input
            v-model="searchForm.search"
            placeholder="请输入名称"
            clearable
            style="width: 200px"
            @keyup.enter="loadData"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
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
        <el-table-column prop="name" label="名称" width="200" />
        <el-table-column prop="code" label="代码" width="150">
          <template #default="{ row }">
            {{ row.code || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="value" label="数值/配置" width="200">
          <template #default="{ row }">
            {{ row.value || row.description || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="creatorId.realName" label="创建人" width="100">
          <template #default="{ row }">
            {{ row.creatorId?.realName || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="150">
          <template #default="{ row }">
            <el-button link type="primary" @click="showEditDialog(row)" v-if="hasPermission('base-data:update')">修改</el-button>
            <el-button link type="danger" @click="handleDelete(row)" v-if="hasPermission('base-data:delete')">删除</el-button>
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
      :title="isEdit ? '编辑' : '新增'"
      width="600px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>

        <el-form-item label="代码" prop="code" v-if="activeTab === 'country' || activeTab === 'priceUnit'">
          <el-input v-model="form.code" :placeholder="activeTab === 'country' ? '如 TH, MY, SG 等' : '如 USD, CNY, EUR 等'" />
        </el-form-item>

        <el-form-item label="英文名称" prop="englishName" v-if="activeTab === 'country'">
          <el-input v-model="form.englishName" placeholder="如 Thailand, Malaysia" />
        </el-form-item>

        <el-form-item label="汇率" prop="value" v-if="activeTab === 'priceUnit'">
          <el-input-number v-model="form.value" :min="0" :precision="4" style="width: 100%" />
          <span style="margin-left: 10px; color: #999;">(相对于基准货币的汇率)</span>
        </el-form-item>

        <el-form-item label="数值/配置" prop="value" v-if="activeTab === 'timeoutConfig'">
          <el-input-number v-model="form.value" :min="0" :precision="0" style="width: 100%" />
          <span style="margin-left: 10px; color: #999;">(小时)</span>
        </el-form-item>

        <el-form-item label="配置值" prop="value" v-if="activeTab === 'trackingUrl'">
          <el-input v-model="form.value" type="textarea" :rows="3" placeholder="物流查询链接模板" />
        </el-form-item>

        <el-form-item label="描述" prop="description" v-if="activeTab === 'category' || activeTab === 'grade'">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio label="active">正常</el-radio>
            <el-radio label="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
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
  status: 'active'
})

const rules = {
  name: [
    { required: true, message: '请输入名称', trigger: 'blur' }
  ],
  code: [
    { required: false, message: '请输入代码', trigger: 'blur' }
  ]
}

const hasSelected = computed(() => selectedRows.value.length > 0)

const tabLabels = {
  country: '国家',
  category: '产品类目',
  grade: '商品等级',
  priceUnit: '货币单位',
  timeoutConfig: '超时配置',
  trackingUrl: '物流查询链接',
  influencerCategory: '达人归类标签'
}

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
    status: row.status
  })
}

const resetForm = () => {
  Object.assign(form, {
    name: '',
    code: '',
    englishName: '',
    value: null,
    description: '',
    status: 'active'
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
        ElMessage.success('更新成功')
      } else {
        await request.post('/base-data', data)
        ElMessage.success('创建成功')
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
    await ElMessageBox.confirm(`确定要删除${tabLabels[activeTab.value]}"${row.name}"吗？`, '提示', {
      type: 'warning'
    })

    await request.delete(`/base-data/${row._id}`)
    ElMessage.success('删除成功')
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
    await ElMessageBox.confirm(`确定要删除选中的 ${ids.length} 条数据吗？`, '提示', {
      type: 'warning'
    })

    await request.delete('/base-data/batch', { data: { ids } })
    ElMessage.success('删除成功')
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
    const res = await request.get('/base-data/export', { params })

    const csvContent = res.data
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${tabLabels[activeTab.value]}数据_${new Date().toLocaleDateString('zh-CN')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('Export error:', error)
    ElMessage.error('导出失败，请稍后重试')
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
