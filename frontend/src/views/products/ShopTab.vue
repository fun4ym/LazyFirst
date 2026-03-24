<template>
  <div class="shop-tab">
    <!-- 搜索筛选 -->
    <div class="filter-section">
      <el-row :gutter="16">
        <el-col :span="4">
          <el-select v-model="filters.status" placeholder="状态" clearable @change="loadData">
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-input v-model="filters.keyword" placeholder="搜索店铺/店铺号" clearable @change="loadData">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="showCreateDialog" v-if="hasPermission('shops:create')">新建店铺</el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 店铺列表 -->
    <el-table :data="shops" stripe v-loading="loading">
      <el-table-column label="店铺头像" width="80">
        <template #default="{ row }">
          <el-avatar v-if="row.avatar" :src="row.avatar" :size="50" />
          <el-avatar v-else :size="50">店</el-avatar>
        </template>
      </el-table-column>
      <el-table-column prop="shopName" label="店铺" width="150" />
      <el-table-column prop="shopNumber" label="店铺号" width="120" />
      <el-table-column label="申样链接" min-width="180">
        <template #default="{ row }">
          <div v-if="row.identificationCode" class="sample-link">
            <el-tag type="success" size="small">已生成</el-tag>
            <span class="generated-time">{{ formatDate(row.identificationCodeGeneratedAt) }}</span>
            <el-button
              link
              type="primary"
              size="small"
              @click="copySampleLink(row)"
            >
              复制
            </el-button>
          </div>
          <span v-else class="no-code">未生成</span>
        </template>
      </el-table-column>
      <el-table-column prop="creditRating" label="信用等级" width="100">
        <template #default="{ row }">
          ★{{ row.creditRating || 0 }}
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'">
            {{ row.status === 'active' ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="cooperationRating" label="配合程度" width="100">
        <template #default="{ row }">
          ★{{ row.cooperationRating || 0 }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewShop(row)" v-if="hasPermission('shops:read')">详情</el-button>
          <el-button link type="primary" @click="editShop(row)" v-if="hasPermission('shops:update')">编辑</el-button>
          <el-button link type="danger" @click="deleteShop(row)" v-if="hasPermission('shops:delete')">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadData"
        @current-change="loadData"
      />
    </div>

    <!-- 新建/编辑店铺对话框 -->
    <el-dialog
      v-model="showDialog"
      :title="editingShop ? '编辑店铺' : '新建店铺'"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" ref="formRef" label-width="120px" label-position="right">
        <el-form-item label="店铺头像">
          <el-input v-model="form.avatar" placeholder="请输入头像URL" />
        </el-form-item>
        <el-form-item label="店铺" prop="shopName" required>
          <el-input v-model="form.shopName" placeholder="请输入店铺名称" />
        </el-form-item>
        <el-form-item label="店铺号" prop="shopNumber" required>
          <el-input v-model="form.shopNumber" placeholder="请输入店铺号" />
        </el-form-item>
        <el-form-item label="联系地址">
          <el-input v-model="form.contactAddress" type="textarea" :rows="2" placeholder="请输入联系地址" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="active">启用</el-radio>
            <el-radio value="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 店铺详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="店铺详情"
      width="1000px"
      :close-on-click-modal="false"
    >
      <div v-if="currentShop">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="店铺名称">{{ currentShop.shopName }}</el-descriptions-item>
          <el-descriptions-item label="店铺号">{{ currentShop.shopNumber }}</el-descriptions-item>
          <el-descriptions-item label="识别码">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span v-if="currentShop.identificationCode" class="code-text">{{ currentShop.identificationCode }}</span>
              <span v-else class="no-code">未生成</span>
              <el-button link type="primary" size="small" @click="refreshIdentificationCode(currentShop)">刷新</el-button>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="生成时间">
            {{ currentShop.identificationCodeGeneratedAt ? formatDate(currentShop.identificationCodeGeneratedAt) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="联系地址">{{ currentShop.contactAddress || '-' }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ currentShop.remark || '-' }}</el-descriptions-item>
        </el-descriptions>

        <el-divider>评分信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card>
              <template #header>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span>信用等级</span>
                  <el-icon style="cursor: pointer; color: #409eff;" @click="updateRating"><Check /></el-icon>
                </div>
              </template>
              <el-form @submit.prevent="updateRating">
                <el-form-item label="评分">
                  <el-rate v-model="ratingForm.creditRating" :max="10" show-score />
                </el-form-item>
                <el-form-item label="说明">
                  <el-input v-model="ratingForm.creditRemark" type="textarea" :rows="2" />
                </el-form-item>
              </el-form>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card>
              <template #header>配合程度</template>
              <el-form @submit.prevent="updateRating">
                <el-form-item label="评分">
                  <el-rate v-model="ratingForm.cooperationRating" :max="10" show-score />
                </el-form-item>
                <el-form-item label="说明">
                  <el-input v-model="ratingForm.cooperationRemark" type="textarea" :rows="2" />
                </el-form-item>
              </el-form>
            </el-card>
          </el-col>
        </el-row>

        <el-divider>联系人</el-divider>
        <el-button type="primary" @click="showAddContact">添加联系人</el-button>
        <el-table :data="contacts" stripe style="margin-top: 10px">
          <el-table-column prop="name" label="联系人" width="120" />
          <el-table-column prop="phone" label="手机号" width="120" />
          <el-table-column prop="email" label="邮箱" width="180" />
          <el-table-column prop="trackerName" label="跟踪人" width="100" />
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button link type="primary" @click="editContact(row)">修改</el-button>
              <el-button link type="danger" @click="deleteContact(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-divider>跟踪记录</el-divider>
        <el-button type="primary" @click="showAddTracking">添加跟踪记录</el-button>
        <el-table :data="trackings" stripe style="margin-top: 10px">
          <el-table-column prop="userName" label="跟踪人" width="100" />
          <el-table-column prop="action" label="操作内容" />
          <el-table-column prop="trackingDate" label="跟踪时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.trackingDate) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- 添加/编辑联系人对话框 -->
    <el-dialog v-model="showContactDialog" :title="editingContact ? '修改联系人' : '添加联系人'" width="500px">
      <el-form :model="contactForm" label-width="80px">
        <el-form-item label="联系人" required>
          <el-input v-model="contactForm.name" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="contactForm.phone" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="contactForm.email" />
        </el-form-item>
        <el-form-item label="跟踪人">
          <el-select v-model="contactForm.trackerId" placeholder="选择用户" style="width: 100%">
            <el-option v-for="user in users" :key="user._id" :label="user.realName || user.username" :value="user._id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showContactDialog = false">取消</el-button>
        <el-button type="primary" @click="saveContact">确定</el-button>
      </template>
    </el-dialog>

    <!-- 添加跟踪记录对话框 -->
    <el-dialog v-model="showTrackingDialog" title="添加跟踪记录" width="500px">
      <el-form :model="trackingForm" label-width="80px">
        <el-form-item label="操作内容" required>
          <el-input v-model="trackingForm.action" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="跟踪时间">
          <el-date-picker v-model="trackingForm.trackingDate" type="datetime" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showTrackingDialog = false">取消</el-button>
        <el-button type="primary" @click="addTracking">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Check } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'
import AuthManager from '@/utils/auth'

const userStore = useUserStore()

// 权限检查 - 支持 products 和 shops 权限
const hasPermission = (perm) => {
  // shops 权限本来就是 shops:xxx，不需要特殊处理
  return AuthManager.hasPermission(perm)
}

const loading = ref(false)
const showDialog = ref(false)
const showDetailDialog = ref(false)
const showContactDialog = ref(false)
const showTrackingDialog = ref(false)
const editingShop = ref(null)
const editingContact = ref(null)
const currentShop = ref(null)
const shops = ref([])
const contacts = ref([])
const trackings = ref([])
const users = ref([])

const filters = reactive({
  status: '',
  keyword: ''
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

const form = reactive({
  shopName: '',
  shopNumber: '',
  avatar: '',
  contactAddress: '',
  remark: '',
  status: 'active'
})

const ratingForm = reactive({
  creditRating: 5,
  creditRemark: '',
  cooperationRating: 5,
  cooperationRemark: ''
})

const contactForm = reactive({
  name: '',
  phone: '',
  email: '',
  trackerId: ''
})

const trackingForm = reactive({
  action: '',
  trackingDate: new Date()
})

const loadUsers = async () => {
  // 检查是否有users:read权限，没有则不调用
  if (!AuthManager.hasPermission('users:read')) {
    console.log('无users:read权限，跳过加载用户')
    return
  }
  try {
    const res = await request.get('/users', {
      params: { companyId: userStore.companyId }
    })
    users.value = res.users || []
  } catch (error) {
    console.error('加载用户失败:', error)
  }
}

const loadData = async () => {
  loading.value = true
  try {
    const params = {
      companyId: userStore.companyId,
      ...filters,
      page: pagination.page,
      limit: pagination.limit
    }
    const res = await request.get('/shops', { params })
    shops.value = res.shops || []
    pagination.total = res.total || 0
  } catch (error) {
    console.error('加载店铺失败:', error)
    ElMessage.error('加载店铺失败')
  } finally {
    loading.value = false
  }
}

const showCreateDialog = () => {
  editingShop.value = null
  resetForm()
  showDialog.value = true
}

const editShop = (row) => {
  editingShop.value = row
  Object.assign(form, {
    shopName: row.shopName,
    shopNumber: row.shopNumber,
    avatar: row.avatar,
    contactAddress: row.contactAddress,
    remark: row.remark,
    status: row.status
  })
  showDialog.value = true
}

const deleteShop = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除"${row.shopName}"吗?`, '提示', {
      type: 'warning'
    })
    await request.delete(`/shops/${row._id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const handleSubmit = async () => {
  try {
    const data = {
      companyId: userStore.companyId,
      ...form
    }
    if (editingShop.value) {
      await request.put(`/shops/${editingShop.value._id}`, data)
      ElMessage.success('更新成功')
    } else {
      await request.post('/shops', data)
      ElMessage.success('创建成功')
    }
    showDialog.value = false
    resetForm()
    loadData()
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error(error.message || '提交失败')
  }
}

const resetForm = () => {
  Object.assign(form, {
    shopName: '',
    shopNumber: '',
    avatar: '',
    contactAddress: '',
    remark: '',
    status: 'active'
  })
}

const viewShop = async (row) => {
  try {
    currentShop.value = row
    const res = await request.get(`/shops/${row._id}`)
    contacts.value = res.contacts || []
    trackings.value = res.trackings || []
    if (res.rating) {
      Object.assign(ratingForm, {
        creditRating: res.rating.creditRating,
        creditRemark: res.rating.creditRemark,
        cooperationRating: res.rating.cooperationRating,
        cooperationRemark: res.rating.cooperationRemark
      })
    }
    showDetailDialog.value = true
  } catch (error) {
    console.error('获取店铺详情失败:', error)
    ElMessage.error('获取店铺详情失败')
  }
}

const updateRating = async () => {
  try {
    await request.put(`/shops/${currentShop.value._id}/rating`, ratingForm)
    ElMessage.success('更新评分成功')
    loadData()
  } catch (error) {
    console.error('更新评分失败:', error)
    ElMessage.error('更新评分失败')
  }
}

const showAddContact = () => {
  editingContact.value = null
  Object.assign(contactForm, {
    name: '',
    phone: '',
    email: '',
    trackerId: ''
  })
  showContactDialog.value = true
}

const editContact = (row) => {
  editingContact.value = row
  Object.assign(contactForm, {
    name: row.name,
    phone: row.phone,
    email: row.email,
    trackerId: row.trackerId
  })
  showContactDialog.value = true
}

const saveContact = async () => {
  try {
    if (editingContact.value) {
      await request.put(`/shops/${currentShop.value._id}/contacts/${editingContact.value._id}`, contactForm)
      ElMessage.success('修改联系人成功')
    } else {
      await request.post(`/shops/${currentShop.value._id}/contacts`, contactForm)
      ElMessage.success('添加联系人成功')
    }
    showContactDialog.value = false
    viewShop(currentShop.value)
  } catch (error) {
    console.error('保存联系人失败:', error)
    ElMessage.error('保存联系人失败')
  }
}

const deleteContact = async (row) => {
  try {
    await request.delete(`/shops/${currentShop.value._id}/contacts/${row._id}`)
    ElMessage.success('删除成功')
    viewShop(currentShop.value)
  } catch (error) {
    console.error('删除联系人失败:', error)
    ElMessage.error('删除联系人失败')
  }
}

const showAddTracking = () => {
  Object.assign(trackingForm, {
    action: '',
    trackingDate: new Date()
  })
  showTrackingDialog.value = true
}

const addTracking = async () => {
  try {
    await request.post(`/shops/${currentShop.value._id}/trackings`, trackingForm)
    ElMessage.success('添加跟踪记录成功')
    showTrackingDialog.value = false
    viewShop(currentShop.value)
  } catch (error) {
    console.error('添加跟踪记录失败:', error)
    ElMessage.error('添加跟踪记录失败')
  }
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const copySampleLink = async (row) => {
  const link = `${window.location.origin}/samples/public?s=${row.identificationCode}`
  try {
    await navigator.clipboard.writeText(link)
    ElMessage.success('链接已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
}

const refreshIdentificationCode = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要刷新"${row.shopName}"的识别码吗?`, '提示', {
      type: 'warning'
    })
    const res = await request.put(`/shops/${row._id}/identification-code`)
    ElMessage.success('识别码刷新成功')
    // 更新当前行的数据
    row.identificationCode = res.identificationCode
    row.identificationCodeGeneratedAt = res.identificationCodeGeneratedAt
    // 如果当前查看的是这个店铺，也更新详情
    if (currentShop.value && currentShop.value._id === row._id) {
      currentShop.value.identificationCode = res.identificationCode
      currentShop.value.identificationCodeGeneratedAt = res.identificationCodeGeneratedAt
    }
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('刷新识别码失败:', error)
      ElMessage.error('刷新识别码失败')
    }
  }
}

onMounted(() => {
  loadUsers()
  loadData()
})

defineExpose({
  loadData
})
</script>

<style scoped>
.shop-tab {
  padding: 0;
}

.filter-section {
  margin-bottom: 20px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.code-text {
  font-family: 'Monaco', 'Menlo', monospace;
  color: #409eff;
  font-weight: 600;
  letter-spacing: 1px;
}

.no-code {
  color: #909399;
  font-style: italic;
}

.sample-link {
  display: flex;
  align-items: center;
  gap: 8px;
}

.generated-time {
  color: #909399;
  font-size: 12px;
}
</style>
