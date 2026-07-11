<template>
  <div class="message-template-page">
    <el-card v-loading="loading">
      <template #header>
        <div class="page-header">
          <h3>私信模板</h3>
          <span class="header-tip">配置你的 TikTok 私信默认文案，插件「send message」将自动套用</span>
        </div>
      </template>

      <el-alert
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      >
        <template #default>
          模板按<strong>当前登录账号</strong>分别保存，互不影响。支持以下占位符，发送时自动替换：
          <ul class="placeholder-tips">
            <li><code>{昵称}</code> → 达人昵称</li>
            <li><code>{粉丝数}</code> → 达人粉丝数（自动缩写，如 1.2M）</li>
          </ul>
        </template>
      </el-alert>

      <el-form label-width="80px" class="template-form">
        <el-form-item label="模板内容">
          <el-input
            v-model="template"
            type="textarea"
            :rows="6"
            maxlength="500"
            show-word-limit
            placeholder="例如：Hi {昵称}, 我们是 LazyFirst，专注 TikTok 带货，看到你有 {粉丝数} 粉丝，期待合作！"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave">保存模板</el-button>
          <el-button @click="handleReset">重置为默认</el-button>
        </el-form-item>
      </el-form>

      <el-divider>实时预览</el-divider>
      <div class="preview-box">
        <div class="preview-title">向达人 <strong>@example_user</strong>（粉丝 1.2M）发送时：</div>
        <div class="preview-content">{{ previewText }}</div>
      </div>
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

const template = ref('')
const loading = ref(false)
const saving = ref(false)

const DEFAULT_TEMPLATE = 'Hi {昵称}, 我们是 LazyFirst，关注到你有 {粉丝数} 粉丝，期待合作！'

const previewText = computed(() => {
  const tpl = template.value || DEFAULT_TEMPLATE
  return tpl
    .replace(/\{昵称\}/g, 'example_user')
    .replace(/\{粉丝数\}/g, '1.2M')
})

const getApiUrl = () => '/api'

const fetchTemplate = async () => {
  loading.value = true
  try {
    const response = await fetch(`${getApiUrl()}/tiktok-extension-data/message-template`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    const result = await response.json()
    if (result.success) {
      template.value = result.template || ''
    } else {
      ElMessage.error(result.message || '获取模板失败')
    }
  } catch (error) {
    console.error('获取私信模板失败:', error)
    ElMessage.error('网络请求失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    const response = await fetch(`${getApiUrl()}/tiktok-extension-data/message-template`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ template: template.value })
    })
    const result = await response.json()
    if (result.success) {
      ElMessage.success('私信模板已保存')
      template.value = result.template || ''
    } else {
      ElMessage.error(result.message || '保存失败')
    }
  } catch (error) {
    console.error('保存私信模板失败:', error)
    ElMessage.error('网络请求失败: ' + error.message)
  } finally {
    saving.value = false
  }
}

const handleReset = () => {
  template.value = ''
}

onMounted(() => {
  fetchTemplate()
})
</script>

<style scoped>
.message-template-page {
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

.placeholder-tips {
  margin: 8px 0 0;
  padding-left: 18px;
  line-height: 1.8;
}

.placeholder-tips code {
  background: #f3e5f5;
  color: #7b1fa2;
  padding: 1px 6px;
  border-radius: 4px;
  font-family: Monaco, Menlo, monospace;
}

.template-form {
  max-width: 640px;
}

.preview-box {
  max-width: 640px;
  background: #faf5ff;
  border: 1px solid #e8e4ef;
  border-radius: 8px;
  padding: 16px;
}

.preview-title {
  font-size: 12px;
  color: #7c6d8f;
  margin-bottom: 8px;
}

.preview-content {
  font-size: 13px;
  line-height: 1.6;
  color: #2d1b4e;
  white-space: pre-wrap;
}
</style>
