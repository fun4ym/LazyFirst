<template>
  <div class="influencer-management-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>{{ $t('menu.influencerList') }}</h3>
          <el-button type="primary" @click="showCreateDialog = true" v-if="hasPermission('influencers:create')">{{ $t('influencer.addInfluencer') }}</el-button>
        </div>
      </template>

      <!-- 页签 -->
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 达人列表 -->
        <el-tab-pane :label="$t('influencer.influencerList')" name="list">

          <!-- 搜索筛选 -->
      <div class="filter-section">
        <el-row :gutter="16">
          <el-col :span="4">
            <el-select v-model="filters.poolType" :placeholder="$t('common.select')" clearable @change="loadData">
              <el-option :label="$t('common.all')" value="" />
              <el-option :label="$t('influencer.publicSea')" value="public" />
              <el-option :label="$t('influencer.privateSea')" value="private" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-select v-model="filters.status" :placeholder="$t('common.status')" clearable @change="loadData">
              <el-option :label="$t('common.all')" value="" />
              <el-option :label="$t('common.enable')" value="enabled" />
              <el-option :label="$t('common.disable')" value="disabled" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-select v-model="filters.categoryTag" :placeholder="$t('influencer.categoryTag')" clearable @change="loadData">
              <el-option v-for="tag in categoryTags" :key="tag._id" :label="tag.name" :value="tag._id" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-input v-model="filters.keyword" :placeholder="$t('common.search') + '...'" clearable @change="loadData">
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-col>
          <el-col :span="6">
            <div class="batch-actions">
              <el-button type="warning" :disabled="selectedIds.length === 0" @click="batchClaim" v-if="hasPermission('influencers:update')">{{ $t('influencer.batchClaim') }}</el-button>
              <el-button type="danger" :disabled="selectedIds.length === 0" @click="batchRelease" v-if="hasPermission('influencers:update')">{{ $t('influencer.batchRelease') }}</el-button>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 达人列表 -->
      <el-table :data="influencers" stripe @selection-change="handleSelectionChange" :row-class-name="getRowClassName">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="tiktokId" :label="$t('influencer.tiktokId')" min-width="160" fixed="left">
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
        <el-table-column :label="$t('influencer.bd')" width="80" fixed="left">
          <template #default="{ row }">
            <el-tag v-if="row.poolType === 'public'" type="info">{{ $t('influencer.publicSea') }}</el-tag>
            <el-tag v-else type="success">{{ row.assignedTo?.realName || row.assignedTo?.username }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="tiktokName" :label="$t('influencer.tiktokName')" min-width="150" />
        <el-table-column :label="$t('influencer.latestGmv')" width="150">
          <template #default="{ row }">
            <div>{{ $t('influencer.followers') }}: {{ row.latestFollowers }}</div>
            <div>GMV: {{ row.latestGmv }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('influencer.categoryTag')" width="120">
          <template #default="{ row }">
            <el-tag v-for="tag in row.categoryTags" :key="tag._id" size="small">{{ tag.name }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('influencer.latestMaintenance')" width="180">
          <template #default="{ row }">
            <div class="maintenance-info">
              <div>{{ $t('common.time') }}: {{ formatDate(row.latestMaintenanceTime) }}</div>
              <div>{{ $t('influencer.maintainer') }}: {{ row.latestMaintainerName || '-' }}</div>
              <div v-if="row.latestRemark" class="remark-text">{{ $t('common.remark') }}: {{ row.latestRemark }}</div>
              <div v-else class="remark-empty">{{ $t('common.remark') }}: -</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('influencer.maintenanceStatus')" width="100">
          <template #default="{ row }">
            <el-tag :type="getMaintenanceStatusType(row.maintenanceStatus)" size="small">
              {{ getMaintenanceStatusText(row.maintenanceStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('influencer.blacklist')" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.isBlacklisted" type="danger" size="small">{{ $t('influencer.blacklisted') }}</el-tag>
            <span v-else class="text-gray">-</span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.operation')" width="180" fixed="right">
          <template #default="{ row }">
            <el-button v-if="!row.isBlacklisted && hasPermission('influencers:update')" link type="primary" @click="editInfluencer(row)">{{ $t('influencer.edit') }}</el-button>
            <el-button v-if="row.isBlacklisted" link type="info" disabled>{{ $t('influencer.frozen') }}</el-button>
            <el-button v-if="hasPermission('orders:read')" link type="success" @click="goToOrders(row)">{{ $t('influencer.viewOrders') }}</el-button>
            <el-button v-if="row.poolType === 'public' && !row.isBlacklisted && hasPermission('influencers:update')" link type="warning" @click="claimInfluencer(row)">{{ $t('influencer.claim') }}</el-button>
            <el-button v-if="row.poolType === 'private' && !row.isBlacklisted && hasPermission('influencers:update')" link type="danger" @click="releaseInfluencer(row)">{{ $t('influencer.release') }}</el-button>
            <el-button v-if="!row.isBlacklisted && hasPermission('influencers:update')" link type="danger" @click="addToBlacklist(row)">{{ $t('influencer.blacklist') }}</el-button>
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
        <el-tab-pane :label="$t('menu.blacklist')" name="blacklist">
          <!-- 搜索筛选 -->
          <div class="filter-section">
            <el-row :gutter="16">
              <el-col :span="6">
                <el-input v-model="blacklistFilters.keyword" :placeholder="$t('influencer.searchInfluencerPlaceholder')" clearable @change="loadBlacklist">
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
              </el-col>
            </el-row>
          </div>

          <!-- 黑名单列表 -->
          <el-table :data="blacklistInfluencers" stripe v-loading="blacklistLoading" :row-class-name="getRowClassName">
            <el-table-column prop="tiktokId" :label="$t('influencer.tiktokId')" min-width="160" fixed="left">
              <template #default="{ row }">
                <span class="tiktok-id-cell clickable" @click="viewDetail(row)">{{ row.tiktokId }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="tiktokName" :label="$t('influencer.tiktokName')" min-width="150" />
            <el-table-column :label="$t('influencer.bd')" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.poolType === 'public'" type="info">{{ $t('influencer.publicSea') }}</el-tag>
                <el-tag v-else type="success">{{ row.assignedTo?.realName || row.assignedTo?.username || '-' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="$t('influencer.latestGmv')" width="150">
              <template #default="{ row }">
                <div>{{ $t('influencer.followers') }}: {{ row.latestFollowers }}</div>
                <div>GMV: {{ row.latestGmv }}</div>
              </template>
            </el-table-column>
            <el-table-column :label="$t('influencer.blacklistInfo')" width="200">
              <template #default="{ row }">
                <div>{{ row.blacklistedByName || '-' }} {{ formatDate(row.blacklistedAt) }}</div>
                <div v-if="row.blacklistReason" class="remark-text">{{ row.blacklistReason }}</div>
              </template>
            </el-table-column>
            <el-table-column :label="$t('common.operation')" width="80" fixed="right">
              <template #default="{ row }">
                <el-button link type="success" @click="releaseFromBlacklist(row)" v-if="hasPermission('influencers:update')">{{ $t('influencer.release') }}</el-button>
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
      :title="editingInfluencer ? $t('influencer.editInfluencer') : $t('influencer.addInfluencer')"
      width="900px"
      :close-on-click-modal="false"
    >
      <div class="form-container">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="110px" label-position="right">
          <!-- TikTok信息 -->
          <div class="form-section">
            <div class="section-header">
              <span class="section-title">{{ $t('influencer.tiktokInfo') }}</span>
              <span class="section-desc">{{ $t('influencer.influencerPlatformInfo') }}</span>
            </div>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item :label="$t('influencer.tiktokName')" prop="tiktokName" required>
                  <el-input v-model="form.tiktokName" :placeholder="$t('common.input') + $t('influencer.tiktokName')" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="$t('influencer.tiktokId')" prop="tiktokId" required class="tiktok-green-label">
                  <el-input v-model="form.tiktokId" :placeholder="$t('common.input') + $t('influencer.tiktokId')" class="tiktok-green-input" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item :label="$t('influencer.formerNames')">
                  <el-input v-model="form.formerNames" :placeholder="$t('influencer.formerNamesTip')" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="$t('influencer.formerIds')">
                  <el-input v-model="form.formerIds" :placeholder="$t('influencer.formerIdsTip')" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item :label="$t('influencer.originalTiktokId')" class="tiktok-green-label">
                  <el-input v-model="form.originalTiktokId" :placeholder="$t('influencer.originalTiktokIdTip')" class="tiktok-green-input" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="$t('common.status')" prop="status" required>
                  <el-radio-group v-model="form.status">
                    <el-radio value="enabled">{{ $t('common.enable') }}</el-radio>
                    <el-radio value="disabled">{{ $t('common.disable') }}</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item :label="$t('influencer.categoryTag')">
              <el-select v-model="form.categoryTags" multiple :placeholder="$t('common.select')" style="width: 100%">
                <el-option v-for="tag in categoryTags" :key="tag._id" :label="tag.name" :value="tag._id" />
              </el-select>
              <div class="form-tip">* {{ $t('influencer.categoryTagTip') }}</div>
            </el-form-item>
          </div>

          <!-- 真实信息 -->
          <div class="form-section">
            <div class="section-header">
              <span class="section-title">{{ $t('user.realName') }}</span>
            </div>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item :label="$t('influencer.realName')">
                  <el-input v-model="form.realName" :placeholder="$t('influencer.realNameTip')" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="$t('influencer.nickname')">
                  <el-input v-model="form.nickname" :placeholder="$t('influencer.nicknameTip')" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item :label="$t('influencer.gender')">
                  <el-radio-group v-model="form.gender">
                    <el-radio value="male">{{ $t('influencer.male') }}</el-radio>
                    <el-radio value="female">{{ $t('influencer.female') }}</el-radio>
                    <el-radio value="other">{{ $t('influencer.other') }}</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item :label="$t('influencer.phone')">
              <div class="dynamic-inputs">
                <div v-for="(phone, index) in form.phoneNumbers" :key="'phone-' + index" class="input-item">
                  <el-input v-model="form.phoneNumbers[index]" :placeholder="$t('influencer.phoneTip')" />
                  <el-button v-if="form.phoneNumbers.length > 1" type="danger" link @click="removePhone(index)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
                <el-button type="primary" link @click="addPhone" class="add-btn">
                  <el-icon><Plus /></el-icon> {{ $t('influencer.addPhone') }}
                </el-button>
              </div>
            </el-form-item>
            <el-form-item :label="$t('influencer.address')">
              <div class="dynamic-inputs">
                <div v-for="(address, index) in form.addresses" :key="'address-' + index" class="input-item">
                  <el-input v-model="form.addresses[index]" :placeholder="$t('influencer.addressTip')" />
                  <el-button v-if="form.addresses.length > 1" type="danger" link @click="removeAddress(index)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
                <el-button type="primary" link @click="addAddress" class="add-btn">
                  <el-icon><Plus /></el-icon> {{ $t('influencer.addAddress') }}
                </el-button>
              </div>
            </el-form-item>
            <el-form-item :label="$t('influencer.socialAccount')">
              <div class="dynamic-inputs">
                <div v-for="(social, index) in form.socialAccounts" :key="'social-' + index" class="input-item">
                  <el-input v-model="form.socialAccounts[index]" :placeholder="$t('influencer.socialAccountTip')" />
                  <el-button v-if="form.socialAccounts.length > 1" type="danger" link @click="removeSocial(index)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
                <el-button type="primary" link @click="addSocial" class="add-btn">
                  <el-icon><Plus /></el-icon> {{ $t('influencer.addSocial') }}
                </el-button>
              </div>
            </el-form-item>
          </div>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="showCreateDialog = false" size="large">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleSubmit" size="large">{{ $t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      :title="currentInfluencer?.isBlacklisted ? $t('influencer.influencerDetailBlacklist') : $t('influencer.influencerDetail')"
      width="900px"
      :class="currentInfluencer?.isBlacklisted ? 'detail-dialog-blacklist' : ''">
      <div v-if="currentInfluencer" :class="currentInfluencer.isBlacklisted ? 'detail-content-blacklist' : ''">
        <!-- 黑名单警告 -->
        <el-alert
          v-if="currentInfluencer.isBlacklisted"
          :title="$t('influencer.influencerBlacklistedWarning')"
          type="error"
          :description="`${$t('influencer.blacklistTime')}：${formatDate(currentInfluencer.blacklistedAt)} | ${$t('influencer.blacklistedBy')}：${currentInfluencer.blacklistedByName || '-'} | ${$t('influencer.reason')}：${currentInfluencer.blacklistReason || '-'}`"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
        />

        <el-descriptions :column="2" border>
          <el-descriptions-item :label="$t('influencer.tiktokName')">{{ currentInfluencer.tiktokName }}</el-descriptions-item>
          <el-descriptions-item :label="$t('influencer.tiktokId')">
            <span class="tiktok-id-text">{{ currentInfluencer.tiktokId }}</span>
          </el-descriptions-item>
          <el-descriptions-item :label="$t('influencer.formerNames')">{{ currentInfluencer.formerNames }}</el-descriptions-item>
          <el-descriptions-item :label="$t('influencer.formerIds')">{{ currentInfluencer.formerIds }}</el-descriptions-item>
          <el-descriptions-item :label="$t('influencer.realName')">{{ currentInfluencer.realName }}</el-descriptions-item>
          <el-descriptions-item :label="$t('influencer.nickname')">{{ currentInfluencer.nickname }}</el-descriptions-item>
          <el-descriptions-item :label="$t('influencer.gender')">{{ getGenderText(currentInfluencer.gender) }}</el-descriptions-item>
          <el-descriptions-item :label="$t('common.status')">{{ currentInfluencer.status === 'enabled' ? $t('common.enabled') : $t('common.disabled') }}</el-descriptions-item>
          <el-descriptions-item :label="$t('influencer.latestFollowersNum')">{{ currentInfluencer.latestFollowers }}</el-descriptions-item>
          <el-descriptions-item :label="$t('influencer.latestGmvAmount')">{{ currentInfluencer.latestGmv }}</el-descriptions-item>
          <el-descriptions-item :label="$t('influencer.latestMaintenanceTime')">{{ formatDate(currentInfluencer.latestMaintenanceTime) }}</el-descriptions-item>
          <el-descriptions-item :label="$t('influencer.maintainer')">{{ currentInfluencer.latestMaintainerName }}</el-descriptions-item>
          <el-descriptions-item :label="$t('influencer.blacklist')">
            <el-tag v-if="currentInfluencer.isBlacklisted" type="danger">{{ $t('influencer.blacklisted') }}</el-tag>
            <span v-else>{{ $t('influencer.normal') }}</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="currentInfluencer.isBlacklisted" :label="$t('influencer.blacklistTime')">{{ formatDate(currentInfluencer.blacklistedAt) }}</el-descriptions-item>
          <el-descriptions-item v-if="currentInfluencer.isBlacklisted" :label="$t('influencer.blacklistedBy')">{{ currentInfluencer.blacklistedByName }}</el-descriptions-item>
          <el-descriptions-item v-if="currentInfluencer.isBlacklisted" :label="$t('influencer.blacklistReason')" :span="2">{{ currentInfluencer.blacklistReason || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="$t('influencer.latestRemark')" :span="2">{{ currentInfluencer.latestRemark }}</el-descriptions-item>
        </el-descriptions>

        <el-divider>{{ $t('influencer.maintenanceRecord') }}</el-divider>
        <el-table :data="maintenances" stripe>
          <el-table-column prop="createdAt" :label="$t('common.time')" width="180">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column prop="followers" :label="$t('influencer.followers')" width="100" />
          <el-table-column prop="gmv" label="GMV" width="100" />
          <el-table-column prop="maintainerName" :label="$t('influencer.maintainer')" width="120" />
          <el-table-column prop="remark" :label="$t('common.remark')" />
        </el-table>

        <!-- 维护记录区域：黑名单达人不显示 -->
        <template v-if="!currentInfluencer.isBlacklisted">
          <el-divider>{{ $t('influencer.addMaintenanceRecord') }}</el-divider>
          <el-form :model="maintenanceForm" label-width="80px">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item :label="$t('influencer.followers')">
                  <el-input-number v-model="maintenanceForm.followers" :min="0" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="GMV">
                  <el-input-number v-model="maintenanceForm.gmv" :min="0" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item :label="$t('common.remark')">
                  <el-input v-model="maintenanceForm.remark" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-button type="primary" @click="addMaintenance">{{ $t('influencer.submitRecord') }}</el-button>
          </el-form>
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Delete } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'
import AuthManager from '@/utils/auth'

const { t } = useI18n()

const router = useRouter()

const userStore = useUserStore()

// 权限检查函数
const hasPermission = (perm) => AuthManager.hasPermission(perm)

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
  tiktokName: [{ required: true, message: t('common.input') + t('influencer.tiktokName'), trigger: 'blur' }],
  tiktokId: [{ required: true, message: t('common.input') + t('influencer.tiktokId'), trigger: 'blur' }],
  status: [{ required: true, message: t('common.select') + t('common.status'), trigger: 'change' }]
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
    console.error(t('influencer.loadFailed') + ':', error)
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
    console.error(t('influencer.loadFailed') + ':', error)
    ElMessage.error(t('influencer.loadFailed'))
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
    console.error(t('influencer.loadFailed') + ':', error)
    ElMessage.error(t('influencer.loadFailed'))
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
  const map = { male: t('influencer.male'), female: t('influencer.female'), other: t('influencer.other') }
  return map[gender] || t('influencer.other')
}

const getMaintenanceStatusText = (status) => {
  const map = {
    public: t('influencer.maintenancePublic'),
    normal: t('influencer.maintenanceNormal'),
    maintenance_needed: t('influencer.maintenanceNeeded'),
    at_risk: t('influencer.atRisk'),
    about_to_release: t('influencer.aboutToRelease'),
    released: t('influencer.released'),
    pending: t('influencer.maintenanceNeeded')
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
      t('influencer.blacklistConfirmTip', { name: row.tiktokId }),
      t('influencer.blacklistConfirm'),
      { type: 'warning' }
    )

    const { value: reason } = await ElMessageBox.prompt(t('influencer.blacklistReasonTip'), t('influencer.blacklistReasonTitle'), {
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel')
    })

    await request.post(`/influencer-managements/${row._id}/blacklist`, { reason: reason || '' })
    ElMessage.success(t('influencer.blacklistSuccess'))
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(t('influencer.loadFailed') + ':', error)
      ElMessage.error(t('influencer.loadFailed'))
    }
  }
}

// 释放黑名单
const releaseFromBlacklist = async (row) => {
  try {
    await ElMessageBox.confirm(
      t('influencer.releaseConfirmTip', { name: row.tiktokId }),
      t('influencer.releaseConfirm'),
      { type: 'warning' }
    )

    await request.post(`/influencer-managements/${row._id}/release-blacklist`)
    ElMessage.success(t('influencer.releaseBlacklistSuccess'))
    // 如果当前在小黑屋页面，刷新列表
    if (activeTab.value === 'blacklist') {
      loadBlacklist()
    } else {
      loadData()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error(t('influencer.loadFailed') + ':', error)
      ElMessage.error(t('influencer.loadFailed'))
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
    ElMessage.success(t('influencer.createSuccess'))
    showCreateDialog.value = false
    resetForm()
    loadData()
  } catch (error) {
    console.error(t('influencer.loadFailed') + ':', error)
    ElMessage.error(error.message || t('influencer.loadFailed'))
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
    ElMessage.success(t('influencer.updateSuccess'))
    showCreateDialog.value = false
    editingInfluencer.value = null
    resetForm()
    loadData()
  } catch (error) {
    console.error(t('influencer.loadFailed') + ':', error)
    ElMessage.error(error.message || t('influencer.loadFailed'))
  }
}

const editInfluencer = (row) => {
  // 检查是否为黑名单达人
  if (row.isBlacklisted) {
    ElMessage.warning(t('influencer.cannotEditBlacklist'))
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
    console.error(t('influencer.loadFailed') + ':', error)
    ElMessage.error(t('influencer.loadFailed'))
  }
}

const addMaintenance = async () => {
  try {
    await request.post(`/influencer-managements/${currentInfluencer.value._id}/maintenance`, maintenanceForm)
    ElMessage.success(t('influencer.addRecordSuccess'))
    maintenanceForm.followers = 0
    maintenanceForm.gmv = 0
    maintenanceForm.remark = ''
    viewDetail(currentInfluencer.value)
    loadData()
  } catch (error) {
    console.error(t('influencer.loadFailed') + ':', error)
    ElMessage.error(t('influencer.loadFailed'))
  }
}

const claimInfluencer = async (row) => {
  try {
    await request.post(`/influencer-managements/${row._id}/claim`)
    ElMessage.success(t('influencer.claimSuccess'))
    loadData()
  } catch (error) {
    console.error(t('influencer.loadFailed') + ':', error)
    ElMessage.error(error.message || t('influencer.loadFailed'))
  }
}

const releaseInfluencer = async (row) => {
  try {
    await ElMessageBox.confirm(t('influencer.releaseToPublicConfirm'), t('common.info'), {
      type: 'warning'
    })
    await request.post(`/influencer-managements/${row._id}/release`)
    ElMessage.success(t('influencer.releaseSuccess'))
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(t('influencer.loadFailed') + ':', error)
      ElMessage.error(t('influencer.loadFailed'))
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
