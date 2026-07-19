<template>
  <div class="message-template-page">
    <el-tabs v-model="activeTab" class="tpl-tabs">
      <!-- BD 私信模板 -->
      <el-tab-pane label="TikTok 私信模板" name="bd">
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
      </el-tab-pane>

      <!-- LINE 欢迎语 / 自动回复 -->
      <el-tab-pane label="LINE 欢迎语 / 自动回复" name="line">
        <el-card v-loading="lineLoading">
          <template #header>
            <div class="page-header">
              <h3>LINE 官方账号模板</h3>
              <span class="header-tip">配置 LINE 加好友欢迎语、带货政策与客服自动回复（OA 级，全公司共用）</span>
            </div>
          </template>

          <el-alert
            type="info"
            :closable="false"
            show-icon
            style="margin-bottom: 20px"
          >
            <template #default>
              以下文案用于 LINE 加好友欢迎、卖家关键词自动回复。支持 <code>{昵称}</code> 占位符。政策/客服由关键词触发（政策：นโยบาย / policy；客服：ติดต่อ / contact）。
            </template>
          </el-alert>

          <el-form label-width="120px" class="template-form line-form">
            <el-form-item label="自动回复开关">
              <el-switch v-model="lineTemplates.autoReplyEnabled" active-text="开启" inactive-text="关闭" />
            </el-form-item>

            <el-divider content-position="left">欢迎语（加好友触发）</el-divider>
            <el-form-item label="泰文">
              <el-input v-model="lineTemplates.welcome.th" type="textarea" :rows="2" maxlength="300" show-word-limit />
            </el-form-item>
            <el-form-item label="英文">
              <el-input v-model="lineTemplates.welcome.en" type="textarea" :rows="2" maxlength="300" show-word-limit />
            </el-form-item>

            <el-divider content-position="left">带货政策（关键词触发）</el-divider>
            <el-form-item label="泰文">
              <el-input v-model="lineTemplates.policy.th" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="每行一条，自动分行展示" />
            </el-form-item>
            <el-form-item label="英文">
              <el-input v-model="lineTemplates.policy.en" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="One item per line" />
            </el-form-item>

            <el-divider content-position="left">客服自动回复（关键词触发）</el-divider>
            <el-form-item label="泰文">
              <el-input v-model="lineTemplates.contactReply.th" type="textarea" :rows="2" maxlength="300" show-word-limit />
            </el-form-item>
            <el-form-item label="英文">
              <el-input v-model="lineTemplates.contactReply.en" type="textarea" :rows="2" maxlength="300" show-word-limit />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :loading="lineSaving" @click="handleSaveLine">保存 LINE 模板</el-button>
              <el-button @click="fetchLineTemplates">重新加载</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import AuthManager from '@/utils/auth'

const { t } = useI18n()
const getToken = () => AuthManager.getToken()

const activeTab = ref('bd')

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

// ===== LINE 模板 =====
const lineLoading = ref(false)
const lineSaving = ref(false)
const lineTemplates = reactive({
  autoReplyEnabled: true,
  welcome: { th: '', en: '' },
  policy: { th: '', en: '' },
  contactReply: { th: '', en: '' }
})

const applyLineTemplates = (data) => {
  if (!data) return
  lineTemplates.autoReplyEnabled = data.autoReplyEnabled !== false
  lineTemplates.welcome = { th: data.welcome?.th || '', en: data.welcome?.en || '' }
  lineTemplates.policy = { th: data.policy?.th || '', en: data.policy?.en || '' }
  lineTemplates.contactReply = { th: data.contactReply?.th || '', en: data.contactReply?.en || '' }
}

const fetchLineTemplates = async () => {
  lineLoading.value = true
  try {
    const response = await fetch(`${getApiUrl()}/line/templates`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    const result = await response.json()
    if (result.success) {
      applyLineTemplates(result.templates)
    } else {
      ElMessage.error(result.message || '获取 LINE 模板失败')
    }
  } catch (error) {
    console.error('获取 LINE 模板失败:', error)
    ElMessage.error('网络请求失败: ' + error.message)
  } finally {
    lineLoading.value = false
  }
}

const handleSaveLine = async () => {
  lineSaving.value = true
  try {
    const response = await fetch(`${getApiUrl()}/line/templates`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ templates: { ...lineTemplates } })
    })
    const result = await response.json()
    if (result.success) {
      ElMessage.success('LINE 模板已保存')
      applyLineTemplates(result.templates)
    } else {
      ElMessage.error(result.message || '保存失败')
    }
  } catch (error) {
    console.error('保存 LINE 模板失败:', error)
    ElMessage.error('网络请求失败: ' + error.message)
  } finally {
    lineSaving.value = false
  }
}

onMounted(() => {
  fetchTemplate()
  fetchLineTemplates()
})
</script>

<style scoped>
.message-template-page {
  padding: 20px;
}

.tpl-tabs {
  background: #fff;
  padding: 0 16px;
  border-radius: 8px;
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

.line-form {
  max-width: 720px;
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
