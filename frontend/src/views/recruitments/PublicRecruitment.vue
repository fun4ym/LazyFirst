<template>
  <div class="public-recruitment-page">
    <!-- 加载中 -->
    <div v-if="loading" class="loading-container">
      <el-icon class="loading-spin" :size="40"><Loading /></el-icon>
      <p>{{ $t('common.loading') }}</p>
    </div>

    <!-- 错误提示 -->
    <div v-else-if="error" class="error-container">
      <el-result icon="error" :title="$t('samplePublic.accessFailed')" :sub-title="error">
        <template #extra>
          <el-button type="primary" @click="loadData">{{ $t('samplePublic.retry') }}</el-button>
        </template>
      </el-result>
    </div>

    <!-- 正常内容 - 根据 layoutStyle 渲染对应风格 -->
    <template v-else-if="recruitment">
      <WarmStyle
        v-if="layoutStyle === 'warm'"
        :recruitment="recruitment"
        :theme-color="themeColor"
      />
      <SweetStyle
        v-else-if="layoutStyle === 'sweet'"
        :recruitment="recruitment"
        :theme-color="themeColor"
      />
      <TechStyle
        v-else-if="layoutStyle === 'tech'"
        :recruitment="recruitment"
        :theme-color="themeColor"
      />
      <!-- 默认使用温暖风 -->
      <WarmStyle
        v-else
        :recruitment="recruitment"
        :theme-color="themeColor"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

// 懒加载风格组件
const WarmStyle = defineAsyncComponent(() =>
  import('./components/WarmStyle.vue')
)
const SweetStyle = defineAsyncComponent(() =>
  import('./components/SweetStyle.vue')
)
const TechStyle = defineAsyncComponent(() =>
  import('./components/TechStyle.vue')
)

const { t } = useI18n()

const route = useRoute()

const loading = ref(true)
const error = ref('')
const recruitment = ref(null)
const identificationCode = ref('')
const themeColor = ref('#775999')
const layoutStyle = ref('warm') // 默认温暖风

// 获取API基础URL
const getApiBase = () => {
  return window.location.origin
}

// 加载数据
const loadData = async () => {
  const y = route.query.y
  if (!y) {
    error.value = t('samplePublic.missingCode')
    loading.value = false
    return
  }

  identificationCode.value = y
  loading.value = true
  error.value = ''

  try {
    const res = await axios.get(`${getApiBase()}/api/public/recruitment?y=${y}`)
    if (res.data?.success) {
      recruitment.value = res.data.data
      // 从数据库加载主题色
      if (res.data.data.pageStyle?.themeColor) {
        themeColor.value = res.data.data.pageStyle.themeColor
      }
      // 从数据库加载布局风格
      if (res.data.data.pageStyle?.layoutStyle) {
        layoutStyle.value = res.data.data.pageStyle.layoutStyle
      }
    } else {
      error.value = res.data?.message || t('samplePublic.loadFailed')
    }
  } catch (err) {
    if (err.response?.status === 403) {
      error.value = t('recruitment.disabled')
    } else if (err.response?.status === 404) {
      error.value = t('samplePublic.accessFailed')
    } else {
      error.value = t('samplePublic.networkError')
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.public-recruitment-page {
  min-height: 100vh;
  max-width: 480px;
  margin: 0 auto;
  padding: 0;
  box-sizing: border-box;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: #909399;
}

.loading-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 错误状态 */
.error-container {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
</style>
