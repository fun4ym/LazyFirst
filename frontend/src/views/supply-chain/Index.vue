<template>
  <div class="supply-chain-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>供应链管理</h3>
          <div class="header-actions">
            <el-button type="success" @click="showCreateDialog">
              <el-icon><Plus /></el-icon>
              新增供应商
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索筛选 -->
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item label="供应商名称">
          <el-input
            v-model="searchForm.name"
            placeholder="供应商名称"
            clearable
            style="width: 200px"
          />
        </el-form-item>

        <el-form-item label="联系人">
          <el-input
            v-model="searchForm.contact"
            placeholder="联系人"
            clearable
            style="width: 150px"
          />
        </el-form-item>

        <el-form-item label="供应商类型">
          <el-select
            v-model="searchForm.type"
            placeholder="全部"
            clearable
            style="width: 150px"
          >
            <el-option label="样品供应商" value="sample" />
            <el-option label="产品供应商" value="product" />
            <el-option label="物流商" value="logistics" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="loadSuppliers">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table
        :data="suppliers"
        v-loading="loading"
        stripe
        border
        class="supply-table"
      >
        <el-table-column
          label="供应商名称"
          width="200"
          fixed="left"
          prop="name"
          sortable
        >
          <template #default="{ row }">
            <div class="column-text">{{ row.name || '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column
          label="类型"
          width="120"
        >
          <template #default="{ row }">
            <el-tag
              :type="getTypeTagType(row.type)"
              size="small"
            >
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          label="联系人"
          width="120"
        >
          <template #default="{ row }">
            <div class="column-text">{{ row.contact || '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column
          label="联系电话"
          width="140"
        >
          <template #default="{ row }">
            <div class="column-text">{{ row.phone || '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column
          label="邮箱"
          width="180"
        >
          <template #default="{ row }">
            <div class="column-text">{{ row.email || '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column
          label="地址"
          width="250"
        >
          <template #default="{ row }">
            <el-tooltip :content="row.address" placement="top">
              <div class="truncate-text">{{ row.address || '--' }}</div>
            </el-tooltip>
          </template>
        </el-table-column>

        <el-table-column
          label="备注"
          width="200"
        >
          <template #default="{ row }">
            <el-tooltip :content="row.remarks" placement="top">
              <div class="truncate-text">{{ row.remarks || '--' }}</div>
            </el-tooltip>
          </template>
        </el-table-column>

        <el-table-column
          label="创建时间"
          width="140"
          prop="createdAt"
          sortable
        >
          <template #default="{ row }">
            <div class="column-text">{{ row.createdAt ? formatDate(row.createdAt) : '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column
          label="操作"
          width="150"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button link type="primary" @click="editSupplier(row)">编辑</el-button>
            <el-button link type="danger" @click="deleteSupplier(row)">删除</el-button>
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
        @size-change="loadSuppliers"
        @current-change="loadSuppliers"
        style="margin-top: 20px"
      />
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑供应商' : '新增供应商'"
      width="600px"
    >
      <el-form
        :model="form"
        :rules="rules"
        ref="formRef"
        label-width="100px"
      >
        <el-form-item label="供应商名称" prop="name">
          <el-input v-model="form.name" placeholder="供应商名称" />
        </el-form-item>

        <el-form-item label="供应商类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择类型" style="width: 100%">
            <el-option label="样品供应商" value="sample" />
            <el-option label="产品供应商" value="product" />
            <el-option label="物流商" value="logistics" />
          </el-select>
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="联系人" prop="contact">
              <el-input v-model="form.contact" placeholder="联系人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="form.phone" placeholder="联系电话" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="邮箱" />
        </el-form-item>

        <el-form-item label="地址">
          <el-input
            v-model="form.address"
            type="textarea"
            :rows="2"
            placeholder="请输入地址"
          />
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="form.remarks"
            type="textarea"
            :rows="3"
            placeholder="备注信息"
          />
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
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const suppliers = ref([])
const formRef = ref(null)

const searchForm = reactive({
  name: '',
  contact: '',
  type: ''
})

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

const form = reactive({
  _id: '',
  name: '',
  type: '',
  contact: '',
  phone: '',
  email: '',
  address: '',
  remarks: ''
})

const rules = {
  name: [{ required: true, message: '请输入供应商名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择供应商类型', trigger: 'change' }],
  contact: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }]
}

const getTypeLabel = (type) => {
  const typeMap = {
    sample: '样品供应商',
    product: '产品供应商',
    logistics: '物流商'
  }
  return typeMap[type] || '--'
}

const getTypeTagType = (type) => {
  const typeTagMap = {
    sample: 'primary',
    product: 'success',
    logistics: 'warning'
  }
  return typeTagMap[type] || 'info'
}

const formatDate = (date) => {
  if (!date) return '--'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const loadSuppliers = () => {
  loading.value = true
  // TODO: 实际调用API
  setTimeout(() => {
    suppliers.value = [
      {
        _id: '1',
        name: '广州样品供应商',
        type: 'sample',
        contact: '张三',
        phone: '13800138000',
        email: 'zhangsan@example.com',
        address: '广州市天河区xx路xx号',
        remarks: '主要提供样品',
        createdAt: new Date()
      }
    ]
    pagination.total = 1
    loading.value = false
  }, 500)
}

const resetSearch = () => {
  Object.assign(searchForm, { name: '', contact: '', type: '' })
  pagination.page = 1
  loadSuppliers()
}

const showCreateDialog = () => {
  isEdit.value = false
  Object.assign(form, {
    _id: '',
    name: '',
    type: '',
    contact: '',
    phone: '',
    email: '',
    address: '',
    remarks: ''
  })
  dialogVisible.value = true
}

const editSupplier = (row) => {
  isEdit.value = true
  Object.assign(form, { ...row })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      // TODO: 实际调用API
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      loadSuppliers()
    } catch (error) {
      console.error('Submit error:', error)
      ElMessage.error('操作失败')
    } finally {
      submitting.value = false
    }
  })
}

const deleteSupplier = async (row) => {
  await ElMessageBox.confirm('确定要删除这个供应商吗？', '提示', {
    type: 'warning'
  })

  try {
    // TODO: 实际调用API
    ElMessage.success('删除成功')
    loadSuppliers()
  } catch (error) {
    console.error('Delete error:', error)
    ElMessage.error('删除失败')
  }
}

onMounted(() => {
  loadSuppliers()
})
</script>

<style scoped>
.supply-chain-page {
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

.header-actions {
  display: flex;
  gap: 12px;
}

.search-form {
  margin-bottom: 20px;
  padding: 20px;
  background: #faf5ff;
  border-radius: 8px;
  border: 1px solid #e8e4ef;
}

/* 表格样式优化 */
.supply-table {
  border-radius: 8px;
  overflow: hidden;
}

.supply-table :deep(.el-table__header) {
  background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
}

.supply-table :deep(.el-table__header th) {
  background: transparent;
  color: #4a148c;
  font-weight: 600;
  font-size: 13px;
  border-bottom: 2px solid #ce93d8;
}

.supply-table :deep(.el-table__body tr:hover > td) {
  background: #f3e5f5 !important;
}

.column-text {
  font-size: 13px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.truncate-text {
  font-size: 12px;
  color: #757575;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
</style>
