<template>
  <div class="chrome-extension-page">
    <!-- 插件介绍：标题、功能、步骤合为一张紧凑卡片 -->
    <el-card class="section-card intro-card">
      <div class="intro-header">
        <div>
          <div class="intro-title">
            <h2>{{ $t('chromeExtension.title') }}</h2>
            <span class="version-tag">v{{ extensionVersion }}</span>
          </div>
          <p class="intro-subtitle">{{ $t('chromeExtension.subtitle') }}</p>
        </div>
        <div class="intro-actions">
          <el-button @click="openTemplateDialog">
            <el-icon><EditPen /></el-icon>
            {{ $t('chromeExtension.templateBtn') }}
          </el-button>
          <el-button type="primary" @click="downloadExtension">
            <el-icon><Download /></el-icon>
            {{ $t('chromeExtension.download') }}
          </el-button>
        </div>
      </div>

      <div class="intro-body">
        <div class="intro-features">
          <div class="feature-mini">
            <div class="feature-icon-mini"><el-icon><Search /></el-icon></div>
            <div>
              <div class="feature-title">{{ $t('chromeExtension.featureSearchTitle') }}</div>
              <div class="feature-desc">{{ $t('chromeExtension.featureSearchDesc') }}</div>
            </div>
          </div>
          <div class="feature-mini">
            <div class="feature-icon-mini"><el-icon><UserFilled /></el-icon></div>
            <div>
              <div class="feature-title">{{ $t('chromeExtension.featureProfileTitle') }}</div>
              <div class="feature-desc">{{ $t('chromeExtension.featureProfileDesc') }}</div>
            </div>
          </div>
          <div class="feature-mini">
            <div class="feature-icon-mini"><el-icon><VideoPlay /></el-icon></div>
            <div>
              <div class="feature-title">{{ $t('chromeExtension.featureVideoTitle') }}</div>
              <div class="feature-desc">{{ $t('chromeExtension.featureVideoDesc') }}</div>
            </div>
          </div>
        </div>

        <div class="intro-steps">
          <div class="step-mini" v-for="(step, index) in steps" :key="index">
            <span class="step-num">{{ index + 1 }}</span>
            <span class="step-desc" v-html="step.desc"></span>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 采集数据 -->
    <el-card class="section-card">
      <template #header>
        <div class="data-header">
          <span>{{ $t('chromeExtension.collectedData') }}</span>
          <span class="data-header-desc">{{ $t('chromeExtension.collectedDataDesc') }}</span>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item :label="$t('chromeExtension.keyword')">
          <el-input
            v-model="searchForm.keyword"
            :placeholder="$t('chromeExtension.keywordPlaceholder')"
            clearable
            style="width: 200px;"
          />
        </el-form-item>
        <el-form-item :label="$t('chromeExtension.syncStatus')">
          <el-select v-model="searchForm.synced" :placeholder="$t('chromeExtension.allStatus')" clearable style="width: 120px;">
            <el-option :label="$t('chromeExtension.notSynced')" :value="false" />
            <el-option :label="$t('chromeExtension.synced')" :value="true" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('chromeExtension.collectedDate')">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            :range-separator="$t('chromeExtension.dateRangeSeparator')"
            :start-placeholder="$t('chromeExtension.startDate')"
            :end-placeholder="$t('chromeExtension.endDate')"
            style="width: 250px;"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">{{ $t('chromeExtension.search') }}</el-button>
          <el-button @click="handleReset">{{ $t('chromeExtension.reset') }}</el-button>
        </el-form-item>
      </el-form>

      <!-- 操作栏 -->
      <div class="action-bar">
        <el-button
          type="primary"
          :disabled="selectedIds.length === 0"
          @click="handleBatchSync"
        >
          {{ $t('chromeExtension.batchSync') }} ({{ selectedIds.length }})
        </el-button>
        <el-button
          type="danger"
          :disabled="selectedIds.length === 0"
          @click="handleBatchDelete"
        >
          {{ $t('chromeExtension.batchDelete') }}
        </el-button>
      </div>

      <!-- 数据表格 -->
      <el-table
        v-loading="loading"
        :data="dataList"
        stripe
        border
        size="small"
        @selection-change="handleSelectionChange"
        style="width: 100%; margin-top: 12px;"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="tiktokId" :label="$t('chromeExtension.tiktokId')" width="140" />
        <el-table-column prop="tiktokName" :label="$t('chromeExtension.nickname')" width="140" />
        <el-table-column prop="followerCount" :label="$t('chromeExtension.followerCount')" width="100" align="right" />
        <el-table-column prop="estimatedGmv" :label="$t('chromeExtension.estimatedGmv')" width="110" align="right" />
        <el-table-column prop="monthlySalesCount" :label="$t('chromeExtension.monthlySalesCount')" width="100" align="right" />
        <el-table-column prop="collectedAt" :label="$t('chromeExtension.collectTime')" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.collectedAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="synced" :label="$t('chromeExtension.syncStatus')" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.synced" type="success" size="small">{{ $t('chromeExtension.synced') }}</el-tag>
            <el-tag v-else type="warning" size="small">{{ $t('chromeExtension.notSynced') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="syncedAt" :label="$t('chromeExtension.syncTime')" width="160">
          <template #default="{ row }">
            {{ row.syncedAt ? formatDateTime(row.syncedAt) : '-' }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('chromeExtension.actions')" width="140" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="!row.synced"
              type="primary"
              size="small"
              @click="handleSync(row)"
            >
              {{ $t('chromeExtension.syncBtn') }}
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="handleDelete(row)"
            >
              {{ $t('chromeExtension.deleteBtn') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 信息模版弹层 -->
    <el-dialog
      v-model="showTemplateDialog"
      :title="$t('chromeExtension.templateDialogTitle')"
      width="620px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px">
        <template #default>
          {{ $t('chromeExtension.templateTips') }}
          <ul class="placeholder-tips">
            <li><code>{昵称}</code> → {{ $t('chromeExtension.templatePlaceholderNick') }}</li>
            <li><code>{粉丝数}</code> → {{ $t('chromeExtension.templatePlaceholderFollowers') }}</li>
          </ul>
        </template>
      </el-alert>

      <el-tabs v-model="activeLang" type="card">
        <el-tab-pane :label="$t('chromeExtension.templateTabTh')" name="th">
          <el-form :label-width="locale === 'en' ? '140px' : '80px'">
            <el-form-item :label="$t('chromeExtension.templateContentLabel')">
              <el-input
                v-model="templates.th"
                type="textarea"
                :rows="6"
                maxlength="500"
                show-word-limit
                :placeholder="$t('chromeExtension.templatePlaceholderTh')"
              />
            </el-form-item>
          </el-form>
          <div class="template-preview-box">
            <div class="template-preview-title">{{ $t('chromeExtension.templatePreviewTitle') }}</div>
            <div class="template-preview-desc">{{ $t('chromeExtension.templatePreviewDesc') }}</div>
            <div class="template-preview-content">{{ preview('th') }}</div>
          </div>
        </el-tab-pane>
        <el-tab-pane :label="$t('chromeExtension.templateTabEn')" name="en">
          <el-form :label-width="locale === 'en' ? '140px' : '80px'">
            <el-form-item :label="$t('chromeExtension.templateContentLabel')">
              <el-input
                v-model="templates.en"
                type="textarea"
                :rows="6"
                maxlength="500"
                show-word-limit
                :placeholder="$t('chromeExtension.templatePlaceholderEn')"
              />
            </el-form-item>
          </el-form>
          <div class="template-preview-box">
            <div class="template-preview-title">{{ $t('chromeExtension.templatePreviewTitleEn') }}</div>
            <div class="template-preview-desc">{{ $t('chromeExtension.templatePreviewDescEn') }}</div>
            <div class="template-preview-content">{{ preview('en') }}</div>
          </div>
        </el-tab-pane>
        <el-tab-pane :label="$t('chromeExtension.templateTabZh')" name="zh">
          <el-form :label-width="locale === 'en' ? '140px' : '80px'">
            <el-form-item :label="$t('chromeExtension.templateContentLabel')">
              <el-input
                v-model="templates.zh"
                type="textarea"
                :rows="6"
                maxlength="500"
                show-word-limit
                :placeholder="$t('chromeExtension.templatePlaceholderZh')"
              />
            </el-form-item>
          </el-form>
          <div class="template-preview-box">
            <div class="template-preview-title">{{ $t('chromeExtension.templatePreviewTitle') }}</div>
            <div class="template-preview-desc">{{ $t('chromeExtension.templatePreviewDesc') }}</div>
            <div class="template-preview-content">{{ preview('zh') }}</div>
          </div>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="showTemplateDialog = false">{{ $t('chromeExtension.templateCancel') }}</el-button>
        <el-button @click="resetTemplate">{{ $t('chromeExtension.templateReset') }}</el-button>
        <el-button type="primary" :loading="templateSaving" @click="saveTemplate">{{ $t('chromeExtension.templateSave') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, UserFilled, VideoPlay, Download, EditPen } from '@element-plus/icons-vue'
import AuthManager from '@/utils/auth'

const { t, locale } = useI18n()
const getToken = () => AuthManager.getToken()

// ========== 上部：插件介绍 ==========
const extensionVersion = ref('1.1.0')

const steps = computed(() => [
  { title: t('chromeExtension.step1Title'), desc: t('chromeExtension.step1Desc') },
  { title: t('chromeExtension.step2Title'), desc: t('chromeExtension.step2Desc') },
  { title: t('chromeExtension.step3Title'), desc: t('chromeExtension.step3Desc') },
  { title: t('chromeExtension.step4Title'), desc: t('chromeExtension.step4Desc') },
])

function downloadExtension() {
  const link = document.createElement('a')
  link.href = '/tiktok-extension.zip'
  link.download = 'tiktok-extension.zip'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// ========== 下部：采集数据 ==========
const searchForm = reactive({
  keyword: '',
  synced: '',
  dateRange: []
})

const dataList = ref([])
const loading = ref(false)
const selectedIds = ref([])

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

const mapLocale = { zh: 'zh-CN', en: 'en-US', th: 'th-TH' }
const dateTimeLocale = computed(() => mapLocale[locale.value] || 'zh-CN')

const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString(dateTimeLocale.value, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

const getApiUrl = () => '/api'

const fetchDataList = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit
    }
    if (searchForm.keyword) params.keyword = searchForm.keyword
    if (searchForm.synced !== '') params.synced = searchForm.synced
    if (searchForm.dateRange && searchForm.dateRange[0]) params.startDate = new Date(searchForm.dateRange[0]).toISOString()
    if (searchForm.dateRange && searchForm.dateRange[1]) params.endDate = new Date(searchForm.dateRange[1] + 'T23:59:59').toISOString()

    const response = await fetch(`${getApiUrl()}/tiktok-extension-data?${new URLSearchParams(params)}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    const result = await response.json()
    if (result.success && result.data) {
      dataList.value = result.data.dataList || []
      if (result.data.pagination) {
        pagination.total = result.data.pagination.total || 0
        pagination.page = result.data.pagination.page || 1
        pagination.limit = result.data.pagination.limit || 20
      }
    } else {
      ElMessage.error(result?.message || t('chromeExtension.fetchDataFailed'))
    }
  } catch (error) {
    console.error('获取数据失败:', error)
    ElMessage.error(t('chromeExtension.fetchDataFailed') + ': ' + error.message)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => { pagination.page = 1; fetchDataList() }
const handleReset = () => {
  searchForm.keyword = ''
  searchForm.synced = ''
  searchForm.dateRange = []
  pagination.page = 1
  fetchDataList()
}

const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map(item => item._id)
}

const handleSync = async (row) => {
  try {
    await ElMessageBox.confirm(
      t('chromeExtension.confirmSync'),
      t('chromeExtension.syncBtn'),
      { confirmButtonText: t('common.confirm'), cancelButtonText: t('common.cancel'), type: 'warning' }
    )
    const response = await fetch(`${getApiUrl()}/tiktok-extension-data/${row._id}/sync`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    const result = await response.json()
    if (result.success) {
      ElMessage.success(t('chromeExtension.syncSuccess'))
      fetchDataList()
    } else {
      ElMessage.error(result.message || t('chromeExtension.syncSuccess'))
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('同步失败:', error)
      ElMessage.error(t('chromeExtension.syncFailed') + ': ' + error.message)
    }
  }
}

const handleBatchSync = async () => {
  if (selectedIds.value.length === 0) { ElMessage.warning(t('chromeExtension.pleaseSelect')); return }
  try {
    await ElMessageBox.confirm(
      t('chromeExtension.confirmBatchSyncMsg', { count: selectedIds.value.length }),
      t('chromeExtension.confirmBatchSyncTitle'),
      { confirmButtonText: t('common.confirm'), cancelButtonText: t('common.cancel'), type: 'warning' }
    )
    const response = await fetch(`${getApiUrl()}/tiktok-extension-data/batch-sync`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds.value })
    })
    const result = await response.json()
    if (result.success) {
      ElMessage.success(result.message || t('chromeExtension.syncSuccess'))
      selectedIds.value = []
      fetchDataList()
    } else {
      ElMessage.error(result.message || t('chromeExtension.batchSyncFailed'))
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量同步失败:', error)
      ElMessage.error(t('chromeExtension.batchSyncFailed') + ': ' + error.message)
    }
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      t('chromeExtension.confirmDelete'),
      t('chromeExtension.deleteBtn'),
      { confirmButtonText: t('common.confirm'), cancelButtonText: t('common.cancel'), type: 'warning' }
    )
    const response = await fetch(`${getApiUrl()}/tiktok-extension-data/${row._id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    const result = await response.json()
    if (result.success) {
      ElMessage.success(t('chromeExtension.deleteSuccess'))
      fetchDataList()
    } else {
      ElMessage.error(result.message || t('chromeExtension.deleteFailed'))
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error(t('chromeExtension.deleteFailed') + ': ' + error.message)
    }
  }
}

const handleBatchDelete = async () => {
  if (selectedIds.value.length === 0) { ElMessage.warning(t('chromeExtension.pleaseSelect')); return }
  try {
    await ElMessageBox.confirm(
      t('chromeExtension.confirmBatchDeleteMsg', { count: selectedIds.value.length }),
      t('chromeExtension.confirmBatchDeleteTitle'),
      { confirmButtonText: t('common.confirm'), cancelButtonText: t('common.cancel'), type: 'warning' }
    )
    let successCount = 0, failCount = 0
    for (const id of selectedIds.value) {
      try {
        const response = await fetch(`${getApiUrl()}/tiktok-extension-data/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${getToken()}` }
        })
        const result = await response.json()
        if (result.success) successCount++; else failCount++
      } catch { failCount++ }
    }
    ElMessage.success(t('chromeExtension.batchDeleteDone', { success: successCount, fail: failCount }))
    selectedIds.value = []
    fetchDataList()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error(t('chromeExtension.batchDeleteFailed') + ': ' + error.message)
    }
  }
}

const handleSizeChange = (val) => { pagination.limit = val; pagination.page = 1; fetchDataList() }
const handlePageChange = (val) => { pagination.page = val; fetchDataList() }

onMounted(() => { fetchDataList() })

// ========== 信息模版弹层 ==========
const DEFAULT_TEMPLATES = {
  th: 'สวัสดี {昵称}, พวกเราคือ LazyFirst, เห็นว่าคุณมีผู้ติดตาม {粉丝数}, หวังว่าจะได้ร่วมงานกัน!',
  en: 'Hi {昵称}, we are LazyFirst, noticed you have {粉丝数} followers, looking forward to working together!',
  zh: 'Hi {昵称}, 我们是 LazyFirst，关注到你有 {粉丝数} 粉丝，期待合作！'
}
const showTemplateDialog = ref(false)
const activeLang = ref('th')
const templates = reactive({ th: '', en: '', zh: '' })
const templateSaving = ref(false)

const preview = (lang) => {
  const txt = templates[lang] || DEFAULT_TEMPLATES[lang]
  const nickname = lang === 'th' ? 'example_user' : 'example_user'
  const followers = '1.2M'
  return txt.replace(/\{昵称\}/g, nickname).replace(/\{粉丝数\}/g, followers)
}

const openTemplateDialog = async () => {
  showTemplateDialog.value = true
  activeLang.value = 'th'
  try {
    const response = await fetch(`${getApiUrl()}/tiktok-extension-data/message-template`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    const result = await response.json()
    if (result.success && result.templates) {
      templates.th = result.templates.th || ''
      templates.en = result.templates.en || ''
      templates.zh = result.templates.zh || ''
    }
  } catch (error) {
    console.error('获取信息模版失败:', error)
  }
}

const saveTemplate = async () => {
  templateSaving.value = true
  try {
    const response = await fetch(`${getApiUrl()}/tiktok-extension-data/message-template`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ templates: { th: templates.th, en: templates.en, zh: templates.zh } })
    })
    const result = await response.json()
    if (result.success) {
      ElMessage.success(t('chromeExtension.templateSaveSuccess'))
      showTemplateDialog.value = false
    } else {
      ElMessage.error(result.message || t('chromeExtension.templateSaveFailed'))
    }
  } catch (error) {
    console.error('保存信息模版失败:', error)
    ElMessage.error(t('chromeExtension.templateSaveFailed') + ': ' + error.message)
  } finally {
    templateSaving.value = false
  }
}

const resetTemplate = () => {
  templates.th = ''
  templates.en = ''
  templates.zh = ''
}
</script>

<style scoped>
.chrome-extension-page {
  padding: 20px;
}

.section-card {
  margin-bottom: 20px;
}

/* 顶部介绍卡片：标题 + 功能 + 步骤合一 */
.intro-card :deep(.el-card__body) {
  padding: 16px 20px;
}

.intro-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.intro-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.intro-title h2 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.intro-subtitle {
  margin: 4px 0 0 0;
  color: #909399;
  font-size: 12px;
}

.version-tag {
  padding: 3px 8px;
  background: #f3e5f5;
  color: #7b1fa2;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.intro-body {
  display: flex;
  gap: 24px;
  align-items: stretch;
  flex-wrap: wrap;
}

.intro-features {
  flex: 1.2;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feature-mini {
  display: flex;
  align-items: center;
  gap: 10px;
}

.feature-icon-mini {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #e8e8e8;
  color: #909399;
  font-size: 16px;
}

.feature-title {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
  margin-bottom: 1px;
}

.feature-desc {
  font-size: 11px;
  color: #909399;
  line-height: 1.3;
}

/* 安装步骤 — 单列展示，数字底色降级，重点在描述中的关键词 */
.intro-steps {
  flex: 1;
  min-width: 280px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.step-mini {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: #606266;
  line-height: 1.45;
}

.step-num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #e8e8e8;
  color: #909399;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

:deep(.ce-highlight) {
  color: #7b1fa2;
  font-weight: 500;
}

/* 数据表 */
.data-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.data-header-desc {
  color: #909399;
  font-size: 12px;
}

.search-form {
  margin-bottom: 8px;
}

.action-bar {
  margin-bottom: 0;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

/* 头部按钮组 */
.intro-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* 信息模版弹层 */
.placeholder-tips {
  margin: 6px 0 0;
  padding-left: 18px;
  line-height: 1.8;
}

.placeholder-tips code {
  background: #f3e5f5;
  color: #7b1fa2;
  padding: 1px 6px;
  border-radius: 4px;
  font-family: Monaco, Menlo, monospace;
  font-size: 12px;
}

.template-preview-box {
  margin-top: 4px;
  background: #faf5ff;
  border: 1px solid #e8e4ef;
  border-radius: 8px;
  padding: 14px;
}

.template-preview-title {
  font-size: 13px;
  font-weight: 500;
  color: #7b1fa2;
  margin-bottom: 4px;
}

.template-preview-desc {
  font-size: 12px;
  color: #7c6d8f;
  margin-bottom: 8px;
}

.template-preview-content {
  font-size: 13px;
  line-height: 1.6;
  color: #2d1b4e;
  white-space: pre-wrap;
}
</style>
