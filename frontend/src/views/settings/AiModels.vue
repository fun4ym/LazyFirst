<template>
  <div class="ai-models-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>{{ $t('menu.aiModels') }}</h3>
          <el-button type="primary" @click="showCreateDialog" v-if="hasPermission('aiModels:create')">
            <el-icon><Plus /></el-icon>
            {{ $t('aiModel.add') }}
          </el-button>
        </div>
      </template>

      <!-- 搜索筛选 -->
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item :label="$t('common.search')">
          <el-input
            v-model="searchForm.search"
            :placeholder="$t('aiModel.searchPlaceholder')"
            clearable
            style="width: 200px"
          />
        </el-form-item>

        <el-form-item :label="$t('aiModel.type')">
          <el-select v-model="searchForm.type" :placeholder="$t('common.all')" clearable>
            <el-option
              v-for="type in typeOptions"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="$t('aiModel.provider')">
          <el-select v-model="searchForm.provider" :placeholder="$t('common.all')" clearable>
            <el-option
              v-for="provider in providerOptions"
              :key="provider.value"
              :label="provider.label"
              :value="provider.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="$t('common.status')">
          <el-select v-model="searchForm.status" :placeholder="$t('common.all')" clearable>
            <el-option :label="$t('status.active')" value="active" />
            <el-option :label="$t('status.inactive')" value="inactive" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="loadModels">{{ $t('common.search') }}</el-button>
          <el-button @click="resetSearch">{{ $t('common.reset') }}</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table :data="models" v-loading="loading" border>
        <el-table-column prop="name" :label="$t('aiModel.name')" width="180" />
        <el-table-column :label="$t('aiModel.type')" width="140">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)" size="small">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="provider" :label="$t('aiModel.provider')" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="row.provider === 'openai' ? 'success' : row.provider === 'hunyuan' ? 'warning' : 'info'">
              {{ getProviderLabel(row.provider) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('aiModel.config')" width="200">
          <template #default="{ row }">
            <div class="config-summary">
              <div v-if="row.config.apiKey">
                <span class="label">API Key:</span>
                <span class="value">{{ maskApiKey(row.config.apiKey) }}</span>
              </div>
              <div v-if="row.config.apiSecret">
                <span class="label">API Secret:</span>
                <span class="value">{{ maskApiKey(row.config.apiSecret) }}</span>
              </div>
              <div v-if="row.config.baseUrl">
                <span class="label">Base URL:</span>
                <span class="value truncate">{{ row.config.baseUrl }}</span>
              </div>
              <div v-if="row.config.modelId">
                <span class="label">Model ID:</span>
                <span class="value">{{ row.config.modelId }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="description" :label="$t('aiModel.description')" min-width="200" show-overflow-tooltip />
        <el-table-column :label="$t('common.status')" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? $t('status.active') : $t('status.inactive') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('aiModel.default')" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isDefault" type="warning" size="small">{{ $t('aiModel.default') }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" :label="$t('common.createTime')" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.operation')" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="showEditDialog(row)" v-if="hasPermission('aiModels:update')">{{ $t('common.edit') }}</el-button>
            <el-button link type="danger" @click="handleDelete(row)" v-if="hasPermission('aiModels:delete')">{{ $t('common.delete') }}</el-button>
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
        @size-change="loadModels"
        @current-change="loadModels"
      />
    </el-card>

    <!-- 新建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? $t('aiModel.editTitle') : $t('aiModel.createTitle')"
      width="700px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
      >
        <el-form-item :label="$t('aiModel.name')" prop="name">
          <el-input v-model="form.name" :placeholder="$t('aiModel.namePlaceholder')" />
        </el-form-item>

        <el-form-item :label="$t('aiModel.type')" prop="type">
          <el-select v-model="form.type" :placeholder="$t('aiModel.selectType')" style="width: 100%">
            <el-option
              v-for="type in typeOptions"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="$t('aiModel.provider')" prop="provider">
          <el-select v-model="form.provider" :placeholder="$t('aiModel.selectProvider')" style="width: 100%">
            <el-option
              v-for="provider in providerOptions"
              :key="provider.value"
              :label="provider.label"
              :value="provider.value"
            />
          </el-select>
        </el-form-item>

        <el-divider>{{ $t('aiModel.apiConfig') }}</el-divider>

        <el-form-item :label="$t('aiModel.apiKey')">
          <el-input v-model="form.config.apiKey" type="password" show-password autocomplete="new-password" />
          <div class="form-tip">{{ $t('aiModel.apiKeyTip') }}</div>
        </el-form-item>

        <el-form-item :label="$t('aiModel.apiSecret')">
          <el-input v-model="form.config.apiSecret" type="password" show-password autocomplete="new-password" />
          <div class="form-tip">{{ $t('aiModel.apiSecretTip') }}</div>
        </el-form-item>

        <el-form-item :label="$t('aiModel.baseUrl')">
          <el-input v-model="form.config.baseUrl" :placeholder="$t('aiModel.baseUrlPlaceholder')" />
          <div class="form-tip">{{ $t('aiModel.baseUrlTip') }}</div>
        </el-form-item>

        <el-form-item :label="$t('aiModel.modelId')">
          <el-input v-model="form.config.modelId" :placeholder="$t('aiModel.modelIdPlaceholder')" />
        </el-form-item>

        <el-form-item :label="$t('aiModel.maxTokens')">
          <el-input-number v-model="form.config.maxTokens" :min="1" :max="100000" style="width: 100%" />
        </el-form-item>

        <el-form-item :label="$t('aiModel.temperature')">
          <el-slider v-model="form.config.temperature" :min="0" :max="2" :step="0.1" show-input />
        </el-form-item>

        <el-form-item :label="$t('aiModel.extraConfig')">
          <el-input
            v-model="extraConfigJson"
            type="textarea"
            :rows="4"
            :placeholder="$t('aiModel.extraConfigPlaceholder')"
            @blur="parseExtraConfig"
          />
          <div class="form-tip">{{ $t('aiModel.extraConfigTip') }}</div>
        </el-form-item>

        <el-divider />

        <el-form-item :label="$t('aiModel.description')">
          <el-input v-model="form.description" type="textarea" :rows="3" :placeholder="$t('aiModel.descriptionPlaceholder')" />
        </el-form-item>

        <el-form-item :label="$t('common.status')" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="active">{{ $t('status.active') }}</el-radio>
            <el-radio value="inactive">{{ $t('status.inactive') }}</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item :label="$t('aiModel.defaultModel')">
          <el-checkbox v-model="form.isDefault">
            {{ $t('aiModel.setAsDefault') }}
          </el-checkbox>
          <div class="form-tip">{{ $t('aiModel.defaultModelTip') }}</div>
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
import { ref, reactive, onMounted, computed } from 'vue'
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
const models = ref([])

const searchForm = reactive({
  search: '',
  type: '',
  provider: '',
  status: ''
})

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

const form = reactive({
  name: '',
  type: 'video_generation',
  provider: 'custom',
  config: {
    apiKey: '',
    apiSecret: '',
    baseUrl: '',
    modelId: '',
    maxTokens: 2048,
    temperature: 0.7,
    extra: {}
  },
  description: '',
  status: 'active',
  isDefault: false
})

const extraConfigJson = ref('')

const typeOptions = [
  { value: 'video_generation', label: t('aiModel.typeVideo') },
  { value: 'text_generation', label: t('aiModel.typeText') },
  { value: 'image_generation', label: t('aiModel.typeImage') },
  { value: 'multimodal', label: t('aiModel.typeMultimodal') }
]

const providerOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'stability', label: 'Stability AI' },
  { value: 'hunyuan', label: '腾讯混元' },
  { value: 'custom', label: t('aiModel.providerCustom') }
]

const getTypeTagType = (type) => {
  const map = {
    video_generation: 'danger',
    text_generation: 'success',
    image_generation: 'warning',
    multimodal: 'info'
  }
  return map[type] || 'info'
}

const getTypeLabel = (type) => {
  const option = typeOptions.find(opt => opt.value === type)
  return option ? option.label : type
}

const getProviderLabel = (provider) => {
  const option = providerOptions.find(opt => opt.value === provider)
  return option ? option.label : provider
}

const maskApiKey = (key) => {
  if (!key || key.length < 8) return '***'
  return key.substring(0, 4) + '****' + key.substring(key.length - 4)
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

const rules = {
  name: [
    { required: true, message: t('aiModel.inputName') || t('common.input') + t('aiModel.name'), trigger: 'blur' }
  ],
  type: [
    { required: true, message: t('aiModel.selectType'), trigger: 'change' }
  ],
  provider: [
    { required: true, message: t('aiModel.selectProvider'), trigger: 'change' }
  ],
  status: [
    { required: true, message: t('common.selectStatus'), trigger: 'change' }
  ]
}

const loadModels = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm
    }
    const res = await request.get('/ai-models', { params })
    models.value = res.models || res.data || []
    pagination.total = res.pagination?.total || res.total || 0
  } catch (error) {
    console.error('Load AI models error:', error)
    ElMessage.error(t('aiModel.loadFailed'))
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
    type: row.type,
    provider: row.provider,
    config: {
      apiKey: row.config?.apiKey || '',
      apiSecret: row.config?.apiSecret || '',
      baseUrl: row.config?.baseUrl || '',
      modelId: row.config?.modelId || '',
      maxTokens: row.config?.maxTokens || 2048,
      temperature: row.config?.temperature || 0.7,
      extra: row.config?.extra || {}
    },
    description: row.description || '',
    status: row.status,
    isDefault: row.isDefault || false
  })
  extraConfigJson.value = JSON.stringify(row.config?.extra || {}, null, 2)
}

const resetForm = () => {
  Object.assign(form, {
    name: '',
    type: 'video_generation',
    provider: 'custom',
    config: {
      apiKey: '',
      apiSecret: '',
      baseUrl: '',
      modelId: '',
      maxTokens: 2048,
      temperature: 0.7,
      extra: {}
    },
    description: '',
    status: 'active',
    isDefault: false
  })
  extraConfigJson.value = ''
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

const resetSearch = () => {
  Object.assign(searchForm, { search: '', type: '', provider: '', status: '' })
  loadModels()
}

const parseExtraConfig = () => {
  try {
    if (extraConfigJson.value.trim()) {
      form.config.extra = JSON.parse(extraConfigJson.value)
    } else {
      form.config.extra = {}
    }
  } catch (error) {
    ElMessage.error(t('aiModel.invalidJson'))
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      // 确保 extra 字段是对象
      if (typeof form.config.extra !== 'object' || form.config.extra === null) {
        form.config.extra = {}
      }

      const data = { ...form }
      if (isEdit.value) {
        await request.put(`/ai-models/${data._id}`, data)
        ElMessage.success(t('aiModel.updateSuccess'))
      } else {
        await request.post('/ai-models', data)
        ElMessage.success(t('aiModel.createSuccess'))
      }
      dialogVisible.value = false
      loadModels()
    } catch (error) {
      console.error('Submit AI model error:', error)
      ElMessage.error(error.response?.data?.message || t('aiModel.submitFailed'))
    } finally {
      submitting.value = false
    }
  })
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      t('aiModel.confirmDelete', { name: row.name }),
      t('aiModel.confirmTitle'),
      { type: 'warning' }
    )
    await request.delete(`/ai-models/${row._id}`)
    ElMessage.success(t('aiModel.deleteSuccess'))
    loadModels()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete AI model error:', error)
    }
  }
}

onMounted(() => {
  loadModels()
})
</script>

<style scoped>
.ai-models-page {
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

.config-summary {
  font-size: 12px;
  line-height: 1.4;
}

.config-summary .label {
  color: #909399;
  margin-right: 4px;
}

.config-summary .value {
  font-family: 'Monaco', 'Menlo', monospace;
  color: #303133;
}

.config-summary .truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
  display: inline-block;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.el-divider {
  margin: 20px 0;
}
</style>