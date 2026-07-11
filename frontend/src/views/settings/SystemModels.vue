<template>
  <div class="system-models-page">
    <el-card v-loading="loading">
      <template #header>
        <div class="page-header">
          <h3>系统模型</h3>
          <span class="header-tip">动态读取Mongoose模型结构及主外键关系</span>
        </div>
      </template>

      <!-- 错误提示 -->
      <el-alert v-if="errorMsg" :title="errorMsg" type="error" show-icon :closable="false" style="margin-bottom: 16px" />

      <el-tabs v-if="!errorMsg" v-model="activeTab" class="model-tabs">
        <el-tab-pane label="数据表结构" name="tables">
          <el-tabs v-model="activeTable" tab-position="left" class="inner-tabs">
            <el-tab-pane
              v-for="table in tableList"
              :key="table.name"
              :label="table.name"
              :name="table.name"
            >
          <div class="table-info">
            <h4>{{ table.name }} - {{ table.description }}</h4>
          </div>

          <el-table :data="table.fields" stripe border size="small" class="field-table">
            <el-table-column prop="field" label="字段名" width="200">
              <template #default="{ row }">
                <span class="field-name">{{ row.field }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="type" label="类型" width="120" />
            <el-table-column prop="required" label="必填" width="60" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.required" type="danger" size="small">是</el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="ref" label="关联表" width="120">
              <template #default="{ row }">
                <el-link v-if="row.ref" type="primary" underline="never">
                  {{ row.ref }}
                </el-link>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="default" label="默认值" width="100">
              <template #default="{ row }">
                <span class="default-value">{{ row.default || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="说明" min-width="200" />
          </el-table>
            </el-tab-pane>
          </el-tabs>
        </el-tab-pane>

        <!-- 主外键关系页签 -->
        <el-tab-pane label="主外键关系" name="relations">
          <div class="relations-section">
            <el-alert
              title="数据模型主外键关系说明"
              type="info"
              :closable="false"
              show-icon
              style="margin-bottom: 20px"
            >
              <template #default>
                以下展示各数据表之间的主键(PK)与外键(FK)关联关系。箭头方向表示引用关系：A → B 表示A表的某个字段引用B表的主键。
              </template>
            </el-alert>

            <el-table :data="relations" stripe border size="small">
              <el-table-column prop="sourceTable" label="源表" width="180">
                <template #default="{ row }">
                  <el-tag type="primary" size="small">{{ row.sourceTable }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="sourceField" label="源字段" width="180">
                <template #default="{ row }">
                  <span class="field-name">{{ row.sourceField }}</span>
                </template>
              </el-table-column>
              <el-table-column label="关系" width="80" align="center">
                <template #default="{ row }">
                  <span class="relation-arrow">→</span>
                </template>
              </el-table-column>
              <el-table-column prop="targetTable" label="目标表" width="180">
                <template #default="{ row }">
                  <el-tag type="success" size="small">{{ row.targetTable }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="targetField" label="目标字段" width="120">
                <template #default="{ row }">
                  <span class="field-name">{{ row.targetField }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="type" label="类型" width="80">
                <template #default="{ row }">
                  <el-tag :type="row.type === 'FK' ? 'warning' : 'danger'" size="small">{{ row.type }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="description" label="说明" min-width="200" />
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import AuthManager from '@/utils/auth'

const { t } = useI18n()
const getToken = () => AuthManager.getToken()

const activeTab = ref('tables')
const activeTable = ref('User')
const loading = ref(true)
const errorMsg = ref('')

const getApiUrl = () => '/api'

// 从后端动态加载的数据
const tableData = ref([])
const relationsData = ref([])

// 加载系统模型数据
const fetchSystemModels = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    const response = await fetch(`${getApiUrl()}/system-models`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    })
    const result = await response.json()
    if (result.success && result.data) {
      tableData.value = result.data.tables || []
      relationsData.value = result.data.relations || []
    } else {
      errorMsg.value = result.message || '获取系统模型失败'
      ElMessage.error(errorMsg.value)
    }
  } catch (error) {
    console.error('获取系统模型失败:', error)
    errorMsg.value = '网络请求失败: ' + error.message
    ElMessage.error(errorMsg.value)
  } finally {
    loading.value = false
  }
}

// 主外键关系 - 后端已排序
const relations = computed(() => {
  return relationsData.value
})

// 数据表结构 - 后端已排序
const tableList = computed(() => {
  return tableData.value
})

onMounted(() => {
  fetchSystemModels()
})
</script>

<style scoped>
.system-models-page {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-header h3 {
  margin: 0;
}

.header-tip {
  font-size: 12px;
  color: #909399;
}

.model-tabs {
  min-height: 500px;
}

.model-tabs :deep(.el-tabs__content) {
  padding: 0 20px;
}

.table-info {
  margin-bottom: 16px;
}

.table-info h4 {
  margin: 0;
  color: #303133;
}

.field-table {
  margin-top: 12px;
}

.field-name {
  font-family: 'Monaco', 'Menlo', monospace;
  color: #409eff;
  font-weight: 500;
}

.default-value {
  font-family: 'Monaco', 'Menlo', monospace;
  color: #909399;
  font-size: 12px;
}

.relations-section {
  padding: 10px;
}

.relation-arrow {
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
}

.inner-tabs {
  height: 600px;
}

.inner-tabs :deep(.el-tabs__content) {
  height: 100%;
  overflow-y: auto;
}

.inner-tabs :deep(.el-tab-pane) {
  height: 100%;
  overflow-y: auto;
  padding-right: 8px;
}

.inner-tabs .table-info {
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1;
  margin-bottom: 12px;
}
</style>
