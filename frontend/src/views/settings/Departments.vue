<template>
  <div class="departments-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>{{ $t('menu.departments') }}</h3>
          <el-button type="primary" @click="showCreateDialog" v-if="hasPermission('departments:create')">
            <el-icon><Plus /></el-icon>
            {{ $t('department.addDepartment') }}
          </el-button>
        </div>
      </template>

      <!-- 表格 -->
      <el-table :data="departments" v-loading="loading" border row-key="_id" :tree-props="{ children: 'children' }">
        <el-table-column prop="name" :label="$t('department.departmentName')" width="250" />
        <el-table-column prop="description" :label="$t('role.description')" />
        <el-table-column prop="managerId.realName" :label="$t('department.manager')" width="120" />
        <el-table-column :label="$t('common.status')" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? $t('status.active') : $t('status.inactive') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" :label="$t('common.createTime')" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('department.operation')" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="showEditDialog(row)" v-if="hasPermission('departments:update')">{{ $t('common.edit') }}</el-button>
            <el-button link type="danger" @click="handleDelete(row)" v-if="hasPermission('departments:delete')">{{ $t('common.delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? $t('department.editDepartmentTitle') : $t('department.createDepartmentTitle')"
      width="600px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item :label="$t('department.parentDepartment')" prop="parentId">
          <el-tree-select
            v-model="form.parentId"
            :data="departmentTree"
            :props="{ label: 'name', value: '_id' }"
            :placeholder="$t('department.selectParent')"
            clearable
            check-strictly
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item :label="$t('department.departmentName')" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>

        <el-form-item :label="$t('role.description')" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>

        <el-form-item :label="$t('department.manager')" prop="managerId">
          <el-select v-model="form.managerId" :placeholder="$t('department.selectManager')" style="width: 100%" clearable filterable>
            <el-option
              v-for="user in users"
              :key="user._id"
              :label="user.realName"
              :value="user._id"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="$t('common.status')" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio label="active">{{ $t('role.enabled') }}</el-radio>
            <el-radio label="inactive">{{ $t('role.disabled') }}</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ $t('common.confirm') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import AuthManager from '@/utils/auth'

const hasPermission = (perm) => AuthManager.hasPermission(perm)

const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const departments = ref([])
const departmentTree = ref([])
const users = ref([])

const form = reactive({
  parentId: '',
  name: '',
  description: '',
  managerId: '',
  status: 'active'
})

const rules = {
  name: [
    { required: true, message: t('department.inputDeptName'), trigger: 'blur' }
  ],
  description: [
    { required: true, message: t('department.inputDeptDesc'), trigger: 'blur' }
  ]
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

const buildTree = (list, parentId = null) => {
  return list
    .filter(item => {
      if (parentId === null) {
        return !item.parentId
      }
      return String(item.parentId) === String(parentId)
    })
    .map(item => ({
      ...item,
      children: buildTree(list, item._id)
    }))
}

const loadDepartments = async () => {
  loading.value = true
  try {
    const res = await request.get('/departments', { params: { limit: 1000 } })
    const list = res.departments
    departmentTree.value = buildTree(list)
    departments.value = list
  } catch (error) {
    console.error('Load departments error:', error)
  } finally {
    loading.value = false
  }
}

const loadUsers = async () => {
  try {
    const res = await request.get('/users', { params: { limit: 1000 } })
    users.value = res.users
  } catch (error) {
    console.error('Load users error:', error)
  }
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
    parentId: row.parentId?._id || row.parentId,
    name: row.name,
    description: row.description,
    managerId: row.managerId?._id || row.managerId,
    status: row.status
  })
}

const resetForm = () => {
  Object.assign(form, {
    parentId: '',
    name: '',
    description: '',
    managerId: '',
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
      const data = { ...form }
      if (isEdit.value) {
        await request.put(`/departments/${data._id}`, data)
        ElMessage.success(t('department.updateSuccess'))
      } else {
        await request.post('/departments', data)
        ElMessage.success(t('department.createSuccess'))
      }
      dialogVisible.value = false
      loadDepartments()
    } catch (error) {
      console.error('Submit error:', error)
    } finally {
      submitting.value = false
    }
  })
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(t('department.deleteConfirm', { name: row.name }), t('department.confirmTitle'), {
      type: 'warning'
    })
    await request.delete(`/departments/${row._id}`)
    ElMessage.success(t('department.deleteSuccess'))
    loadDepartments()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete error:', error)
    }
  }
}

onMounted(() => {
  loadDepartments()
  loadUsers()
})
</script>

<style scoped>
.departments-page {
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
</style>
