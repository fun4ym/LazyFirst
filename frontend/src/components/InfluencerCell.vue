<template>
  <div class="influencer-cell">
    <div class="influencer-id-row">
      <span class="tiktok-id">{{ influencer.tiktokId || influencer.tiktokUsername || '--' }}</span>
      <el-icon class="copy-icon" @click.stop="copyId" :title="$t('common.copy')">
        <CopyDocument />
      </el-icon>
    </div>
    <div class="influencer-stats">
      <div class="stat-item" v-if="showGmv && influencer.latestGmv">
        <span class="stat-label">{{ $t('influencer.gmv') }}</span>
        <span class="stat-value">{{ formatNumber(influencer.latestGmv) }}</span>
      </div>
      <div class="stat-item" v-if="showFollowers && influencer.latestFollowers">
        <span class="stat-label">{{ $t('influencer.followers') }}</span>
        <span class="stat-value">{{ formatNumber(influencer.latestFollowers) }}</span>
      </div>
      <div class="stat-item" v-if="showAvgViews && influencer.avgVideoViews">
        <span class="stat-label">{{ $t('influencer.avgViews') }}</span>
        <span class="stat-value">{{ formatNumber(influencer.avgVideoViews) }}</span>
      </div>
      <div class="stat-item" v-if="showMonthlySales && influencer.monthlySalesCount">
        <span class="stat-label">{{ $t('influencer.monthlySales') }}</span>
        <span class="stat-value">{{ formatNumber(influencer.monthlySalesCount) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  influencer: {
    type: Object,
    required: true,
    default: () => ({})
  },
  // 控制显示哪些统计项
  showGmv: {
    type: Boolean,
    default: true
  },
  showFollowers: {
    type: Boolean,
    default: true
  },
  showAvgViews: {
    type: Boolean,
    default: true
  },
  showMonthlySales: {
    type: Boolean,
    default: true
  }
})

const { t } = useI18n()

const copyId = async () => {
  const idToCopy = props.influencer.tiktokId || props.influencer.tiktokUsername
  if (!idToCopy) {
    ElMessage.warning('无可用TikTok ID可复制')
    return
  }
  try {
    await navigator.clipboard.writeText(idToCopy)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
}

const formatNumber = (num) => {
  if (num === undefined || num === null) return '--'
  // 如果数字大于等于10000，显示为"1.2万"格式
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  // 添加千位分隔符
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
</script>

<style scoped>
.influencer-cell {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.influencer-id-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tiktok-id {
  font-size: 13px;
  font-weight: 500;
  color: #9C27B0;
}

.copy-icon {
  font-size: 14px;
  color: #9C27B0;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.copy-icon:hover {
  opacity: 1;
}

.influencer-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
  border-radius: 4px;
  font-size: 11px;
}

.stat-label {
  color: #6a1b9a;
  font-weight: 500;
}

.stat-value {
  color: #303133;
  font-weight: 600;
}
</style>