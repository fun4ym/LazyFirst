<template>
  <div class="roles-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>角色管理</h3>
          <el-button type="primary" @click="showCreateDialog">
            <el-icon><Plus /></el-icon>
            新建角色
          </el-button>
        </div>
      </template>

      <!-- 表格 -->
      <el-table :data="roles" v-loading="loading" border>
        <el-table-column prop="name" label="角色名称" width="200" />
        <el-table-column prop="description" label="角色描述" />
        <el-table-column label="权限数量" width="120">
          <template #default="{ row }">
            {{ row.permissions?.length || 0 }}
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
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="showEditDialog(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑角色' : '新建角色'"
      width="700px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>

        <el-form-item label="角色描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>

        <el-form-item label="权限配置" prop="permissions">
          <el-checkbox-group v-model="form.permissions">
            <el-collapse>
              <el-collapse-item title="达人管理" name="influencers">
                <el-space direction="vertical" style="width: 100%">
                  <el-checkbox label="influencers:read">查看达人</el-checkbox>
                  <el-checkbox label="influencers:create">创建达人</el-checkbox>
                  <el-checkbox label="influencers:update">编辑达人</el-checkbox>
                  <el-checkbox label="influencers:delete">删除达人</el-checkbox>
                </el-space>
              </el-collapse-item>

              <el-collapse-item title="样品管理" name="samples">
                <el-space direction="vertical" style="width: 100%">
                  <el-checkbox label="samples:read">查看样品</el-checkbox>
                  <el-checkbox label="samples:create">创建样品申请</el-checkbox>
                  <el-checkbox label="samples:approve">审批样品申请</el-checkbox>
                  <el-checkbox label="samples:delete">删除样品申请</el-checkbox>
                </el-space>
              </el-collapse-item>

              <el-collapse-item title="订单管理" name="orders">
                <el-space direction="vertical" style="width: 100%">
                  <el-checkbox label="orders:read">查看订单</el-checkbox>
                  <el-checkbox label="orders:create">创建订单</el-checkbox>
                  <el-checkbox label="orders:update">编辑订单</el-checkbox>
                  <el-checkbox label="orders:delete">删除订单</el-checkbox>
                </el-space>
              </el-collapse-item>

              <el-collapse-item title="分润管理" name="commissions">
                <el-space direction="vertical" style="width: 100%">
                  <el-checkbox label="commissions:read">查看分润</el-checkbox>
                  <el-checkbox label="commissions:calculate">计算分润</el-checkbox>
                  <el-checkbox label="commissions:approve">审批分润</el-checkbox>
                </el-space>
              </el-collapse-item>

              <el-collapse-item title="用户管理" name="users">
                <el-space direction="vertical" style="width: 100%">
                  <el-checkbox label="users:read">查看用户</el-checkbox>
                  <el-checkbox label="users:create">创建用户</el-checkbox>
                  <el-checkbox label="users:update">编辑用户</el-checkbox>
                  <el-checkbox label="users:delete">删除用户</el-checkbox>
                </el-space>
              </el-collapse-item>

              <el-collapse-item title="角色管理" name="roles">
                <el-space direction="vertical" style="width: 100%">
                  <el-checkbox label="roles:read">查看角色</el-checkbox>
                  <el-checkbox label="roles:create">创建角色</el-checkbox>
                  <el-checkbox label="roles:update">编辑角色</el-checkbox>
                  <el-checkbox label="roles:delete">删除角色</el-checkbox>
                </el-space>
              </el-collapse-item>

              <el-collapse-item title="部门管理" name="departments">
                <el-space direction="vertical" style="width: 100%">
                  <el-checkbox label="departments:read">查看部门</el-checkbox>
                  <el-checkbox label="departments:create">创建部门</el-checkbox>
                  <el-checkbox label="departments:update">编辑部门</el-checkbox>
                  <el-checkbox label="departments:delete">删除部门</el-checkbox>
                </el-space>
              </el-collapse-item>
            </el-collapse>
          </el-checkbox-group>
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const roles = ref([])

const form = reactive({
  name: '',
  description: '',
  permissions: [],
  status: 'active'
})

const rules = {
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入角色描述', trigger: 'blur' }
  ]
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

const loadRoles = async () => {
  loading.value = true
  try {
    const res = await request.get('/roles', { params: { limit: 1000 } })
    roles.value = res.roles
  } catch (error) {
    console.error('Load roles error:', error)
  } finally {
    loading.value = false
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
    name: row.name,
    description: row.description,
    permissions: row.permissions || [],
    status: row.status
  })
}

const resetForm = () => {
  Object.assign(form, {
    name: '',
    description: '',
    permissions: [],
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
        await request.put(`/roles/${data._id}`, data)
        ElMessage.success('更新成功')
      } else {
        await request.post('/roles', data)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      loadRoles()
    } catch (error) {
      console.error('Submit error:', error)
    } finally {
      submitting.value = false
    }
  })
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除角色 ${row.name} 吗？`, '提示', {
      type: 'warning'
    })
    await request.delete(`/roles/${row._id}`)
    ElMessage.success('删除成功')
    loadRoles()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete error:', error)
    }
  }
}

onMounted(() => {
  loadRoles()
})
</script>

<style scoped>
.roles-page {
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
