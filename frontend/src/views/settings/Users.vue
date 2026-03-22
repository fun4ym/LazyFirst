<template>
  <div class="users-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>{{ $t('menu.users') }}</h3>
          <el-button type="primary" @click="showCreateDialog" v-if="hasPermission('users:create')">
            <el-icon><Plus /></el-icon>
            {{ $t('user.addUser') }}
          </el-button>
        </div>
      </template>

      <!-- 搜索筛选 -->
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item :label="$t('common.search')">
          <el-input
            v-model="searchForm.search"
            :placeholder="$t('user.searchPlaceholder')"
            clearable
            style="width: 200px"
          />
        </el-form-item>

        <el-form-item :label="$t('common.status')">
          <el-select v-model="searchForm.status" :placeholder="$t('common.all')" clearable>
            <el-option :label="$t('status.active')" value="active" />
            <el-option :label="$t('status.inactive')" value="inactive" />
          </el-select>
        </el-form-item>

        <el-form-item label="角色">
          <el-select v-model="searchForm.roleId" placeholder="全部角色" clearable>
            <el-option
              v-for="role in roles"
              :key="role._id"
              :label="role.name"
              :value="role._id"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="loadUsers">{{ $t('common.search') }}</el-button>
          <el-button @click="resetSearch">{{ $t('common.reset') }}</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table :data="users" v-loading="loading" border>
        <el-table-column prop="username" :label="$t('user.username')" width="120" />
        <el-table-column prop="realName" label="真实姓名" width="120" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="email" label="邮箱" width="180" />
        <el-table-column label="角色" width="120">
          <template #default="{ row }">
            {{ row.roleId?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="部门" width="120">
          <template #default="{ row }">
            {{ row.deptId?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <!-- 超级管理员用户：只有超级管理员可编辑/删除 -->
            <template v-if="isSuperAdminUser(row)">
              <el-tag type="danger" size="small">超级管理员</el-tag>
              <template v-if="isCurrentUserSuperAdmin()">
                <el-button link type="primary" @click="showEditDialog(row)" v-if="hasPermission('users:update')">编辑</el-button>
                <el-button link type="danger" @click="handleDelete(row)" v-if="hasPermission('users:delete')">删除</el-button>
              </template>
            </template>
            <!-- 普通用户：可编辑/删除 -->
            <template v-else>
              <el-button link type="primary" @click="showEditDialog(row)" v-if="hasPermission('users:update')">编辑</el-button>
              <el-button link type="warning" @click="showPasswordResetDialog(row)" v-if="hasPermission('users:btn-reset-pwd')">重置密码</el-button>
              <el-button link type="danger" @click="handleDelete(row)" v-if="hasPermission('users:delete')">删除</el-button>
            </template>
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
        @size-change="loadUsers"
        @current-change="loadUsers"
      />
    </el-card>

    <!-- 新建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑用户' : '新建用户'"
      width="600px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="isEdit" />
        </el-form-item>

        <el-form-item label="密码" prop="password" v-if="!isEdit">
          <el-input v-model="form.password" type="password" show-password />
        </el-form-item>

        <el-form-item label="真实姓名" prop="realName">
          <el-input v-model="form.realName" />
        </el-form-item>

        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" />
        </el-form-item>

        <el-form-item label="角色" prop="roleId">
          <el-select v-model="form.roleId" placeholder="选择角色" style="width: 100%" :disabled="isEdit && users.value && isSuperAdminUser(users.value.find(u => u._id === form._id))">
            <el-option
              v-for="role in availableRoles"
              :key="role._id"
              :label="role.name"
              :value="role._id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="部门" prop="deptId">
          <el-select v-model="form.deptId" placeholder="选择部门" style="width: 100%">
            <el-option
              v-for="dept in departments"
              :key="dept._id"
              :label="dept.name"
              :value="dept._id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="银行账号">
          <el-input v-model="form.bankAccount" placeholder="请输入银行账号（非必填）" />
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio label="active">启用</el-radio>
            <el-radio label="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog
      v-model="passwordResetDialogVisible"
      title="重置密码"
      width="400px"
    >
      <el-alert
        :title="`为用户 ${passwordResetForm.username} 重置密码`"
        type="info"
        :closable="false"
        style="margin-bottom: 20px"
      />
      <el-form :model="passwordResetForm" label-width="100px">
        <el-form-item label="新密码">
          <el-input v-model="passwordResetForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="passwordResetForm.confirmPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordResetDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handlePasswordReset">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import AuthManager from '@/utils/auth'

const hasPermission = (perm) => AuthManager.hasPermission(perm)

// 判断用户是否是超级管理员
const isSuperAdminUser = (user) => {
  if (!user) return false
  const role = user.role || user.roleId
  if (!role) return false
  // 检查role对象或role名称
  if (typeof role === 'object') {
    return role.name === '超级管理员' || role.permissions?.includes('*')
  }
  return role === '超级管理员' || role === 'admin'
}

// 判断当前登录用户是否是超级管理员
const isCurrentUserSuperAdmin = () => {
  const currentUser = AuthManager.getUser()
  if (!currentUser) return false
  return isSuperAdminUser(currentUser)
}

// 可选择的角色列表（排除超级管理员角色）
const availableRoles = computed(() => {
  return roles.value.filter(role => role.name !== '超级管理员')
})

const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const users = ref([])
const roles = ref([])
const departments = ref([])
const passwordResetDialogVisible = ref(false)
const passwordResetForm = ref({
  userId: '',
  username: '',
  newPassword: '',
  confirmPassword: ''
})

const searchForm = reactive({
  search: '',
  status: '',
  roleId: ''
})

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

const form = reactive({
  username: '',
  password: '',
  realName: '',
  phone: '',
  email: '',
  roleId: '',
  deptId: '',
  status: 'active',
  bankAccount: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  realName: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' }
  ],
  roleId: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ]
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

const loadUsers = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm
    }
    const res = await request.get('/users', { params })
    users.value = res.users
    pagination.total = res.pagination.total
  } catch (error) {
    console.error('Load users error:', error)
  } finally {
    loading.value = false
  }
}

const loadRoles = async () => {
  try {
    const res = await request.get('/roles', { params: { limit: 1000 } })
    roles.value = res.roles
  } catch (error) {
    console.error('Load roles error:', error)
  }
}

const loadDepartments = async () => {
  try {
    const res = await request.get('/departments', { params: { limit: 1000 } })
    departments.value = res.departments
  } catch (error) {
    console.error('Load departments error:', error)
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
    username: row.username,
    realName: row.realName,
    phone: row.phone,
    email: row.email,
    roleId: row.roleId?._id || row.roleId,
    deptId: row.deptId?._id || row.deptId,
    status: row.status,
    bankAccount: row.bankAccount || ''
  })
}

const showPasswordResetDialog = (row) => {
  passwordResetForm.value = {
    userId: row._id,
    username: row.username,
    newPassword: '',
    confirmPassword: ''
  }
  passwordResetDialogVisible.value = true
}

const handlePasswordReset = async () => {
  if (passwordResetForm.value.newPassword !== passwordResetForm.value.confirmPassword) {
    ElMessage.error('两次输入的新密码不一致')
    return
  }

  if (passwordResetForm.value.newPassword.length < 6) {
    ElMessage.error('密码至少6位')
    return
  }

  try {
    const response = await fetch(`/api/users/${passwordResetForm.value.userId}/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        newPassword: passwordResetForm.value.newPassword
      })
    })

    const result = await response.json()
    if (result.success) {
      ElMessage.success('密码重置成功')
      passwordResetDialogVisible.value = false
    } else {
      ElMessage.error(result.message || '密码重置失败')
    }
  } catch (error) {
    ElMessage.error('密码重置失败')
  }
}

const resetForm = () => {
  Object.assign(form, {
    username: '',
    password: '',
    realName: '',
    phone: '',
    email: '',
    roleId: '',
    deptId: '',
    status: 'active',
    bankAccount: ''
  })
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

const resetSearch = () => {
  Object.assign(searchForm, { search: '', status: '' })
  loadUsers()
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      const data = { ...form }
      if (isEdit.value) {
        await request.put(`/users/${data._id}`, data)
        ElMessage.success('更新成功')
      } else {
        await request.post('/users', data)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      loadUsers()
    } catch (error) {
      console.error('Submit error:', error)
    } finally {
      submitting.value = false
    }
  })
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除用户 ${row.realName} 吗？`, '提示', {
      type: 'warning'
    })
    await request.delete(`/users/${row._id}`)
    ElMessage.success('删除成功')
    loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete error:', error)
    }
  }
}

onMounted(() => {
  loadUsers()
  loadRoles()
  loadDepartments()
})
</script>

<style scoped>
.users-page {
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

.el-pagination {
  margin-top: 16px;
  justify-content: flex-end;
}

/* 表格操作按钮 */
.el-button + .el-button {
  margin-left: 8px;
}

/* 对话框表单 */
.el-form {
  padding: 0;
}

.el-form-item {
  margin-bottom: 18px;
}
</style>
