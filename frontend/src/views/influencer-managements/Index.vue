<template>
  <div class="influencer-management-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>建联达人</h3>
          <el-button type="primary" @click="showCreateDialog = true">新建达人</el-button>
        </div>
      </template>

      <!-- 页签 -->
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 达人列表 -->
        <el-tab-pane label="达人列表" name="list">

          <!-- 搜索筛选 -->
      <div class="filter-section">
        <el-row :gutter="16">
          <el-col :span="4">
            <el-select v-model="filters.poolType" placeholder="归属海域" clearable @change="loadData">
              <el-option label="公海" value="public" />
              <el-option label="私海" value="private" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-select v-model="filters.status" placeholder="状态" clearable @change="loadData">
              <el-option label="启用" value="enabled" />
              <el-option label="禁用" value="disabled" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-select v-model="filters.categoryTag" placeholder="归类标签" clearable @change="loadData">
              <el-option v-for="tag in categoryTags" :key="tag._id" :label="tag.name" :value="tag._id" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-input v-model="filters.keyword" placeholder="搜索达人名称/ID/真实姓名" clearable @change="loadData">
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-col>
          <el-col :span="6">
            <div class="batch-actions">
              <el-button type="warning" :disabled="selectedIds.length === 0" @click="batchClaim">批量领取</el-button>
              <el-button type="danger" :disabled="selectedIds.length === 0" @click="batchRelease">批量释放</el-button>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 达人列表 -->
      <el-table :data="influencers" stripe @selection-change="handleSelectionChange" :row-class-name="getRowClassName">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="tiktokId" label="TikTok ID" min-width="160" fixed="left">
          <template #default="{ row }">
            <div class="tiktok-id-wrapper">
              <span class="tiktok-id-cell clickable" @click="viewDetail(row)">{{ row.tiktokId }}</span>
              <div class="order-badges" v-if="influencerOrderStats[row._id] !== undefined">
                <span v-if="influencerOrderStats[row._id]?.lastWeekCount > 0" class="order-badge week" title="最近一周成单">
                  📦 {{ influencerOrderStats[row._id].lastWeekCount }}
                </span>
                <span v-if="influencerOrderStats[row._id]?.lastMonthCount >= 10" class="order-badge month-10" title="最近一个月成单10个以上">
                  📊 10+
                </span>
                <span v-if="influencerOrderStats[row._id]?.lastMonthCount >= 100" class="order-badge month-100" title="最近一个月成单100个以上">
                  ⭐ 100+
                </span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="归属BD" width="80" fixed="left">
          <template #default="{ row }">
            <el-tag v-if="row.poolType === 'public'" type="info">公海</el-tag>
            <el-tag v-else type="success">{{ row.assignedTo?.realName || row.assignedTo?.username }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="tiktokName" label="TikTok名称" min-width="150" />
        <el-table-column label="最新数据" width="150">
          <template #default="{ row }">
            <div>粉丝: {{ row.latestFollowers }}</div>
            <div>GMV: {{ row.latestGmv }}</div>
          </template>
        </el-table-column>
        <el-table-column label="归类" width="120">
          <template #default="{ row }">
            <el-tag v-for="tag in row.categoryTags" :key="tag._id" size="small">{{ tag.name }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最近维护" width="180">
          <template #default="{ row }">
            <div class="maintenance-info">
              <div>时间: {{ formatDate(row.latestMaintenanceTime) }}</div>
              <div>维护人: {{ row.latestMaintainerName || '-' }}</div>
              <div v-if="row.latestRemark" class="remark-text">备注: {{ row.latestRemark }}</div>
              <div v-else class="remark-empty">备注: -</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="维护状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getMaintenanceStatusType(row.maintenanceStatus)" size="small">
              {{ getMaintenanceStatusText(row.maintenanceStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="黑名单" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.isBlacklisted" type="danger" size="small">黑名单</el-tag>
            <span v-else class="text-gray">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button v-if="!row.isBlacklisted" link type="primary" @click="editInfluencer(row)">编辑</el-button>
            <el-button v-if="row.isBlacklisted" link type="info" disabled>已冻结</el-button>
            <el-button link type="success" @click="goToOrders(row)">查订单</el-button>
            <el-button v-if="row.poolType === 'public' && !row.isBlacklisted" link type="warning" @click="claimInfluencer(row)">领取</el-button>
            <el-button v-if="row.poolType === 'private' && !row.isBlacklisted" link type="danger" @click="releaseInfluencer(row)">释放</el-button>
            <el-button v-if="!row.isBlacklisted" link type="danger" @click="addToBlacklist(row)">拉黑</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper" v-if="activeTab === 'list'">
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
        </el-tab-pane>

        <!-- 小黑屋页签 -->
        <el-tab-pane label="小黑屋" name="blacklist">
          <!-- 搜索筛选 -->
          <div class="filter-section">
            <el-row :gutter="16">
              <el-col :span="6">
                <el-input v-model="blacklistFilters.keyword" placeholder="搜索达人名称/ID/真实姓名" clearable @change="loadBlacklist">
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
              </el-col>
            </el-row>
          </div>

          <!-- 黑名单列表 -->
          <el-table :data="blacklistInfluencers" stripe v-loading="blacklistLoading" :row-class-name="getRowClassName">
            <el-table-column prop="tiktokId" label="TikTok ID" min-width="160" fixed="left">
              <template #default="{ row }">
                <span class="tiktok-id-cell clickable" @click="viewDetail(row)">{{ row.tiktokId }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="tiktokName" label="TikTok名称" min-width="150" />
            <el-table-column label="归属BD" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.poolType === 'public'" type="info">公海</el-tag>
                <el-tag v-else type="success">{{ row.assignedTo?.realName || row.assignedTo?.username || '-' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="最新数据" width="150">
              <template #default="{ row }">
                <div>粉丝: {{ row.latestFollowers }}</div>
                <div>GMV: {{ row.latestGmv }}</div>
              </template>
            </el-table-column>
            <el-table-column label="拉黑信息" width="200">
              <template #default="{ row }">
                <div>{{ row.blacklistedByName || '-' }} {{ formatDate(row.blacklistedAt) }}</div>
                <div v-if="row.blacklistReason" class="remark-text">{{ row.blacklistReason }}</div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" fixed="right">
              <template #default="{ row }">
                <el-button link type="success" @click="releaseFromBlacklist(row)">释放</el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="blacklistPagination.page"
              v-model:page-size="blacklistPagination.limit"
              :total="blacklistPagination.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="loadBlacklist"
              @current-change="loadBlacklist"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 新建/编辑对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingInfluencer ? '编辑达人' : '新建达人'"
      width="900px"
      :close-on-click-modal="false"
    >
      <div class="form-container">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="110px" label-position="right">
          <!-- TikTok信息 -->
          <div class="form-section">
            <div class="section-header">
              <span class="section-title">TikTok 信息</span>
              <span class="section-desc">达人平台基本信息</span>
            </div>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="TikTok名称" prop="tiktokName" required>
                  <el-input v-model="form.tiktokName" placeholder="请输入TikTok账号名称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="TikTok ID" prop="tiktokId" required class="tiktok-green-label">
                  <el-input v-model="form.tiktokId" placeholder="请输入TikTok唯一ID" class="tiktok-green-input" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="曾用名称">
                  <el-input v-model="form.formerNames" placeholder="多个用逗号分隔" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="曾用ID">
                  <el-input v-model="form.formerIds" placeholder="多个用逗号分隔" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="TikTok原始ID" class="tiktok-green-label">
                  <el-input v-model="form.originalTiktokId" placeholder="可选，平台原始ID" class="tiktok-green-input" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="状态" prop="status" required>
                  <el-radio-group v-model="form.status">
                    <el-radio value="enabled">启用</el-radio>
                    <el-radio value="disabled">禁用</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="归类标签">
              <el-select v-model="form.categoryTags" multiple placeholder="请选择归类标签（可多选）" style="width: 100%">
                <el-option v-for="tag in categoryTags" :key="tag._id" :label="tag.name" :value="tag._id" />
              </el-select>
              <div class="form-tip">* 归类标签在【系统管理 - 基础数据】中维护</div>
            </el-form-item>
          </div>

          <!-- 真实信息 -->
          <div class="form-section">
            <div class="section-header">
              <span class="section-title">真实信息</span>
              <span class="section-desc">达人个人联系方式</span>
            </div>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="真实姓名">
                  <el-input v-model="form.realName" placeholder="可选，达人真实姓名" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="常用昵称">
                  <el-input v-model="form.nickname" placeholder="可选，常用称呼" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="性别">
                  <el-radio-group v-model="form.gender">
                    <el-radio value="male">男</el-radio>
                    <el-radio value="female">女</el-radio>
                    <el-radio value="other">其他</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="联系电话">
              <div class="dynamic-inputs">
                <div v-for="(phone, index) in form.phoneNumbers" :key="'phone-' + index" class="input-item">
                  <el-input v-model="form.phoneNumbers[index]" placeholder="请输入联系电话" />
                  <el-button v-if="form.phoneNumbers.length > 1" type="danger" link @click="removePhone(index)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
                <el-button type="primary" link @click="addPhone" class="add-btn">
                  <el-icon><Plus /></el-icon> 添加联系电话
                </el-button>
              </div>
            </el-form-item>
            <el-form-item label="地址">
              <div class="dynamic-inputs">
                <div v-for="(address, index) in form.addresses" :key="'address-' + index" class="input-item">
                  <el-input v-model="form.addresses[index]" placeholder="请输入地址" />
                  <el-button v-if="form.addresses.length > 1" type="danger" link @click="removeAddress(index)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
                <el-button type="primary" link @click="addAddress" class="add-btn">
                  <el-icon><Plus /></el-icon> 添加地址
                </el-button>
              </div>
            </el-form-item>
            <el-form-item label="社交账号">
              <div class="dynamic-inputs">
                <div v-for="(social, index) in form.socialAccounts" :key="'social-' + index" class="input-item">
                  <el-input v-model="form.socialAccounts[index]" placeholder="LINE/Email/其他社交账号" />
                  <el-button v-if="form.socialAccounts.length > 1" type="danger" link @click="removeSocial(index)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
                <el-button type="primary" link @click="addSocial" class="add-btn">
                  <el-icon><Plus /></el-icon> 添加社交账号
                </el-button>
              </div>
            </el-form-item>
          </div>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="showCreateDialog = false" size="large">取消</el-button>
        <el-button type="primary" @click="handleSubmit" size="large">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      :title="currentInfluencer?.isBlacklisted ? '达人详情（黑名单）' : '达人详情'"
      width="900px"
      :class="currentInfluencer?.isBlacklisted ? 'detail-dialog-blacklist' : ''">
      <div v-if="currentInfluencer" :class="currentInfluencer.isBlacklisted ? 'detail-content-blacklist' : ''">
        <!-- 黑名单警告 -->
        <el-alert
          v-if="currentInfluencer.isBlacklisted"
          title="该达人已被列入黑名单"
          type="error"
          :description="`拉黑时间：${formatDate(currentInfluencer.blacklistedAt)} | 拉黑人：${currentInfluencer.blacklistedByName || '-'} | 原因：${currentInfluencer.blacklistReason || '-'}`"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
        />

        <el-descriptions :column="2" border>
          <el-descriptions-item label="TikTok名称">{{ currentInfluencer.tiktokName }}</el-descriptions-item>
          <el-descriptions-item label="TikTok ID">
            <span class="tiktok-id-text">{{ currentInfluencer.tiktokId }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="曾用名称">{{ currentInfluencer.formerNames }}</el-descriptions-item>
          <el-descriptions-item label="曾用ID">{{ currentInfluencer.formerIds }}</el-descriptions-item>
          <el-descriptions-item label="真实姓名">{{ currentInfluencer.realName }}</el-descriptions-item>
          <el-descriptions-item label="常用昵称">{{ currentInfluencer.nickname }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ getGenderText(currentInfluencer.gender) }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ currentInfluencer.status === 'enabled' ? '启用' : '禁用' }}</el-descriptions-item>
          <el-descriptions-item label="最新粉丝数">{{ currentInfluencer.latestFollowers }}</el-descriptions-item>
          <el-descriptions-item label="最新GMV">{{ currentInfluencer.latestGmv }}</el-descriptions-item>
          <el-descriptions-item label="最近维护时间">{{ formatDate(currentInfluencer.latestMaintenanceTime) }}</el-descriptions-item>
          <el-descriptions-item label="维护人">{{ currentInfluencer.latestMaintainerName }}</el-descriptions-item>
          <el-descriptions-item label="黑名单状态">
            <el-tag v-if="currentInfluencer.isBlacklisted" type="danger">黑名单</el-tag>
            <span v-else>正常</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="currentInfluencer.isBlacklisted" label="拉黑时间">{{ formatDate(currentInfluencer.blacklistedAt) }}</el-descriptions-item>
          <el-descriptions-item v-if="currentInfluencer.isBlacklisted" label="拉黑人">{{ currentInfluencer.blacklistedByName }}</el-descriptions-item>
          <el-descriptions-item v-if="currentInfluencer.isBlacklisted" label="拉黑原因" :span="2">{{ currentInfluencer.blacklistReason || '-' }}</el-descriptions-item>
          <el-descriptions-item label="最新备注" :span="2">{{ currentInfluencer.latestRemark }}</el-descriptions-item>
        </el-descriptions>

        <el-divider>维护记录</el-divider>
        <el-table :data="maintenances" stripe>
          <el-table-column prop="createdAt" label="维护时间" width="180">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column prop="followers" label="粉丝数" width="100" />
          <el-table-column prop="gmv" label="GMV" width="100" />
          <el-table-column prop="maintainerName" label="维护人" width="120" />
          <el-table-column prop="remark" label="备注" />
        </el-table>

        <!-- 维护记录区域：黑名单达人不显示 -->
        <template v-if="!currentInfluencer.isBlacklisted">
          <el-divider>添加维护记录</el-divider>
          <el-form :model="maintenanceForm" label-width="80px">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="粉丝数">
                  <el-input-number v-model="maintenanceForm.followers" :min="0" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="GMV">
                  <el-input-number v-model="maintenanceForm.gmv" :min="0" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="备注">
                  <el-input v-model="maintenanceForm.remark" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-button type="primary" @click="addMaintenance">提交维护记录</el-button>
          </el-form>
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Delete } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'

const router = useRouter()

const userStore = useUserStore()

const activeTab = ref('list')
const influencers = ref([])
const categoryTags = ref([])
const selectedIds = ref([])
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const editingInfluencer = ref(null)
const currentInfluencer = ref(null)
const maintenances = ref([])

// 黑名单相关
const blacklistInfluencers = ref([])
const blacklistLoading = ref(false)
const blacklistFilters = reactive({ keyword: '' })
const blacklistPagination = reactive({ page: 1, limit: 20, total: 0 })

const filters = reactive({
  poolType: '',
  status: '',
  categoryTag: '',
  keyword: ''
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 达人订单统计
const influencerOrderStats = ref({})

const form = reactive({
  tiktokName: '',
  tiktokId: '',
  formerNames: '',
  formerIds: '',
  originalTiktokId: '',
  status: 'enabled',
  categoryTags: [],
  realName: '',
  nickname: '',
  gender: 'other',
  addresses: [''],
  phoneNumbers: [''],
  socialAccounts: ['']
})

const rules = {
  tiktokName: [{ required: true, message: '请输入TikTok名称', trigger: 'blur' }],
  tiktokId: [{ required: true, message: '请输入TikTok ID', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const maintenanceForm = reactive({
  followers: 0,
  gmv: 0,
  remark: ''
})

const addPhone = () => {
  form.phoneNumbers.push('')
}

const removePhone = (index) => {
  if (form.phoneNumbers.length > 1) {
    form.phoneNumbers.splice(index, 1)
  }
}

const addAddress = () => {
  form.addresses.push('')
}

const removeAddress = (index) => {
  if (form.addresses.length > 1) {
    form.addresses.splice(index, 1)
  }
}

const addSocial = () => {
  form.socialAccounts.push('')
}

const removeSocial = (index) => {
  if (form.socialAccounts.length > 1) {
    form.socialAccounts.splice(index, 1)
  }
}

const loadCategoryTags = async () => {
  try {
    const res = await request.get('/base-data', {
      params: { type: 'influencerCategory' }
    })
    categoryTags.value = res.data || []
  } catch (error) {
    console.error('加载归类标签失败:', error)
  }
}

const loadData = async () => {
  try {
    const params = {
      companyId: userStore.companyId,
      ...filters,
      page: pagination.page,
      limit: pagination.limit
    }
    const res = await request.get('/influencer-managements', { params })
    influencers.value = res.influencers || []
    pagination.total = res.total || 0
    pagination.page = res.page || 1

    // 加载达人订单统计
    loadInfluencerOrderStats()
  } catch (error) {
    console.error('加载达人列表失败:', error)
    ElMessage.error('加载达人列表失败')
  }
}

// 页签切换
const handleTabChange = (tabName) => {
  if (tabName === 'blacklist') {
    loadBlacklist()
  }
}

// 加载黑名单列表
const loadBlacklist = async () => {
  blacklistLoading.value = true
  try {
    const params = {
      companyId: userStore.companyId,
      keyword: blacklistFilters.keyword,
      page: blacklistPagination.page,
      limit: blacklistPagination.limit
    }
    const res = await request.get('/influencer-managements/blacklist/list', { params })
    blacklistInfluencers.value = res.influencers || []
    blacklistPagination.total = res.total || 0
    blacklistPagination.page = res.page || 1
  } catch (error) {
    console.error('加载黑名单列表失败:', error)
    ElMessage.error('加载黑名单列表失败')
  } finally {
    blacklistLoading.value = false
  }
}

// 跳转到 TikTok 订单页面
const goToOrders = (row) => {
  router.push({
    path: '/orders',
    query: { influencer: row.tiktokId }
  })
}

// 加载达人订单统计
const loadInfluencerOrderStats = async () => {
  try {
    const influencerIds = influencers.value.map(i => i._id).join(',')
    if (!influencerIds) return

    const res = await request.get('/product-stats/influencer-order-stats', {
      params: {
        companyId: userStore.companyId,
        influencerIds
      }
    })

    console.log('达人订单统计返回:', res)
    console.log('达人订单统计详情:', JSON.stringify(res))
    // 可能是直接返回数组或 { success, data } 结构
    const data = res.data || res
    if (Array.isArray(data)) {
      const statsMap = {}
      data.forEach(item => {
        statsMap[item.influencerId] = item.stats
      })
      influencerOrderStats.value = statsMap
      console.log('达人订单统计Map:', statsMap)
    }
  } catch (error) {
    console.error('加载达人订单统计失败:', error)
  }
}

const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map(item => item._id)
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const getGenderText = (gender) => {
  const map = { male: '男', female: '女', other: '其他' }
  return map[gender] || '其他'
}

const getMaintenanceStatusText = (status) => {
  const map = {
    public: '公共',
    normal: '正常',
    maintenance_needed: '待维护',
    at_risk: '将流失',
    about_to_release: '即将释放',
    released: '已释放',
    pending: '待维护'
  }
  return map[status] || status
}

const getMaintenanceStatusType = (status) => {
  const map = {
    public: 'info',
    normal: 'success',
    maintenance_needed: 'warning',
    at_risk: 'danger',
    about_to_release: 'danger',
    released: 'info',
    pending: 'warning'
  }
  return map[status] || ''
}

// 获取行样式
const getRowClassName = ({ row }) => {
  return row.isBlacklisted ? 'blacklist-row' : ''
}

// 标记黑名单
const addToBlacklist = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要将达人 "${row.tiktokId}" 列入黑名单吗？\n\n列入黑名单后：\n1. 该达人信息将不可修改\n2. 相关订单也将被标记为黑名单\n3. 该达人将出现在"小黑屋"页签中`,
      '确认拉黑',
      { type: 'warning' }
    )

    const { value: reason } = await ElMessageBox.prompt('请输入拉黑原因（可选）', '拉黑原因', {
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })

    await request.post(`/influencer-managements/${row._id}/blacklist`, { reason: reason || '' })
    ElMessage.success('已将该达人列入黑名单')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('标记黑名单失败:', error)
      ElMessage.error('标记黑名单失败')
    }
  }
}

// 释放黑名单
const releaseFromBlacklist = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要释放达人 "${row.tiktokId}" 吗？\n\n释放后：\n1. 该达人将恢复正常状态\n2. 相关订单的黑名单标记将被移除`,
      '确认释放',
      { type: 'warning' }
    )

    await request.post(`/influencer-managements/${row._id}/release-blacklist`)
    ElMessage.success('已释放黑名单')
    // 如果当前在小黑屋页面，刷新列表
    if (activeTab.value === 'blacklist') {
      loadBlacklist()
    } else {
      loadData()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('释放黑名单失败:', error)
      ElMessage.error('释放黑名单失败')
    }
  }
}

const handleSubmit = async () => {
  if (editingInfluencer.value) {
    await updateInfluencer()
  } else {
    await createInfluencer()
  }
}

const createInfluencer = async () => {
  try {
    // 准备提交数据
    const submitData = {
      companyId: userStore.companyId,
      tiktokName: form.tiktokName,
      tiktokId: form.tiktokId,
      formerNames: form.formerNames,
      formerIds: form.formerIds,
      originalTiktokId: form.originalTiktokId,
      status: form.status,
      categoryTags: form.categoryTags,
      realName: form.realName,
      nickname: form.nickname,
      gender: form.gender,
      phoneNumbers: form.phoneNumbers.filter(p => p.trim()),
      addresses: form.addresses.filter(a => a.trim()),
      socialAccounts: form.socialAccounts.filter(s => s.trim())
    }

    console.log('创建达人 - 前端提交数据:', JSON.stringify(submitData, null, 2))

    await request.post('/influencer-managements', submitData)
    ElMessage.success('创建成功')
    showCreateDialog.value = false
    resetForm()
    loadData()
  } catch (error) {
    console.error('创建达人失败:', error)
    ElMessage.error(error.message || '创建达人失败')
  }
}

const updateInfluencer = async () => {
  try {
    const data = {
      ...form,
      phoneNumbers: form.phoneNumbers.filter(p => p.trim()),
      addresses: form.addresses.filter(a => a.trim()),
      socialAccounts: form.socialAccounts.filter(s => s.trim())
    }
    await request.put(`/influencer-managements/${editingInfluencer.value._id}`, data)
    ElMessage.success('更新成功')
    showCreateDialog.value = false
    editingInfluencer.value = null
    resetForm()
    loadData()
  } catch (error) {
    console.error('更新达人失败:', error)
    ElMessage.error(error.message || '更新达人失败')
  }
}

const editInfluencer = (row) => {
  // 检查是否为黑名单达人
  if (row.isBlacklisted) {
    ElMessage.warning('该达人已被列入黑名单，无法修改信息')
    return
  }
  editingInfluencer.value = row
  Object.assign(form, {
    tiktokName: row.tiktokName,
    tiktokId: row.tiktokId,
    formerNames: row.formerNames,
    formerIds: row.formerIds,
    originalTiktokId: row.originalTiktokId,
    status: row.status,
    categoryTags: (row.categoryTags || []).map(t => t._id || t),
    realName: row.realName,
    nickname: row.nickname,
    gender: row.gender,
    addresses: (row.addresses || []).length > 0 ? [...row.addresses] : [''],
    phoneNumbers: (row.phoneNumbers || []).length > 0 ? [...row.phoneNumbers] : [''],
    socialAccounts: (row.socialAccounts || []).length > 0 ? [...row.socialAccounts] : ['']
  })
  showCreateDialog.value = true
}

const viewDetail = async (row) => {
  try {
    currentInfluencer.value = row
    const res = await request.get(`/influencer-managements/${row._id}`)
    maintenances.value = res.maintenances || []
    showDetailDialog.value = true
  } catch (error) {
    console.error('获取达人详情失败:', error)
    ElMessage.error('获取达人详情失败')
  }
}

const addMaintenance = async () => {
  try {
    await request.post(`/influencer-managements/${currentInfluencer.value._id}/maintenance`, maintenanceForm)
    ElMessage.success('添加维护记录成功')
    maintenanceForm.followers = 0
    maintenanceForm.gmv = 0
    maintenanceForm.remark = ''
    viewDetail(currentInfluencer.value)
    loadData()
  } catch (error) {
    console.error('添加维护记录失败:', error)
    ElMessage.error('添加维护记录失败')
  }
}

const claimInfluencer = async (row) => {
  try {
    await request.post(`/influencer-managements/${row._id}/claim`)
    ElMessage.success('领取成功')
    loadData()
  } catch (error) {
    console.error('领取达人失败:', error)
    ElMessage.error(error.message || '领取达人失败')
  }
}

const releaseInfluencer = async (row) => {
  try {
    await ElMessageBox.confirm('确定要释放该达人到公海吗?', '提示', {
      type: 'warning'
    })
    await request.post(`/influencer-managements/${row._id}/release`)
    ElMessage.success('释放成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('释放达人失败:', error)
      ElMessage.error('释放达人失败')
    }
  }
}

const batchClaim = async () => {
  try {
    await request.post('/influencer-managements/batch', {
      action: 'claim',
      influencerIds: selectedIds.value
    })
    ElMessage.success('批量领取成功')
    selectedIds.value = []
    loadData()
  } catch (error) {
    console.error('批量领取失败:', error)
    ElMessage.error('批量领取失败')
  }
}

const batchRelease = async () => {
  try {
    await ElMessageBox.confirm(`确定要释放选中的${selectedIds.value.length}个达人到公海吗?`, '提示', {
      type: 'warning'
    })
    await request.post('/influencer-managements/batch', {
      action: 'release',
      influencerIds: selectedIds.value
    })
    ElMessage.success('批量释放成功')
    selectedIds.value = []
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量释放失败:', error)
      ElMessage.error('批量释放失败')
    }
  }
}

const resetForm = () => {
  Object.assign(form, {
    tiktokName: '',
    tiktokId: '',
    formerNames: '',
    formerIds: '',
    originalTiktokId: '',
    status: 'enabled',
    categoryTags: [],
    realName: '',
    nickname: '',
    gender: 'other',
    addresses: [''],
    phoneNumbers: [''],
    socialAccounts: ['']
  })
}

onMounted(() => {
  loadCategoryTags()
  loadData()
})
</script>

<style scoped>
.influencer-management-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

.filter-section {
  margin-bottom: 20px;
}

.batch-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.remark-text {
  font-size: 12px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}

.remark-empty {
  font-size: 12px;
  color: #ccc;
}

.maintenance-info {
  font-size: 12px;
  line-height: 1.6;
}

/* 表单样式 */
.form-container {
  max-height: 600px;
  overflow-y: auto;
  padding: 0 10px;
}

.form-section {
  margin-bottom: 24px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #dee2e6;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #212529;
}

.section-desc {
  font-size: 13px;
  color: #6c757d;
}

.form-tip {
  font-size: 12px;
  color: #868e96;
  margin-top: 4px;
}

.dynamic-inputs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-item {
  display: flex;
  gap: 10px;
  align-items: center;
}

.input-item .el-input {
  flex: 1;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  margin-top: 4px;
  border: 1px dashed #409eff;
  background: #f0f7ff;
  color: #409eff;
}

.add-btn:hover {
  background: #e6f3ff;
}

/* 滚动条样式 */
.form-container::-webkit-scrollbar {
  width: 6px;
}

.form-container::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.form-container::-webkit-scrollbar-track {
  background: #f1f3f5;
}

/* TikTok绿色样式 */
.tiktok-green-label :deep(.el-form-item__label) {
  color: #6DAD19;
}

.tiktok-green-input :deep(.el-input__wrapper) {
  border-color: #6DAD19;
  box-shadow: 0 0 0 1px #6DAD19 inset;
}

.tiktok-green-input :deep(.el-input__wrapper:hover) {
  border-color: #6DAD19;
  box-shadow: 0 0 0 1px #6DAD19 inset;
}

.tiktok-green-input :deep(.el-input__wrapper.is-focus) {
  border-color: #6DAD19;
  box-shadow: 0 0 0 1px #6DAD19 inset;
}

/* TikTok ID 文字颜色 */
.tiktok-id-cell {
  color: #6DAD19;
  font-weight: 500;
}

.tiktok-id-cell.clickable {
  cursor: pointer;
}

.tiktok-id-cell.clickable:hover {
  text-decoration: underline;
}

.tiktok-id-text {
  color: #6DAD19;
  font-weight: 500;
}

/* TikTok ID 包装器和订单统计徽章 */
.tiktok-id-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.order-badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.order-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.order-badge.week {
  background-color: #ffebe6;
  color: #D3290F;
  border: 1px solid #D3290F;
}

.order-badge.month-10 {
  background-color: #ffebe6;
  color: #D3290F;
  border: 1px solid #D3290F;
}

.order-badge.month-100 {
  background-color: #ffebe6;
  color: #D3290F;
  border: 1px solid #D3290F;
}

/* 黑名单行样式 */
.blacklist-row {
  background-color: #f5f5f5 !important;
  border: 2px solid #333 !important;
}

.blacklist-row td {
  background-color: #f5f5f5 !important;
  color: #666;
}

/* 详情对话框黑名单样式 */
.detail-dialog-blacklist {
  background-color: #f5f5f5 !important;
  border: 2px solid #333 !important;
}

.detail-dialog-blacklist :deep(.el-dialog__body) {
  background-color: #f5f5f5;
}

.text-gray {
  color: #999;
}
</style>
