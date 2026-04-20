<template>
  <div class="product-cell">
    <el-image
      v-if="imageSrc"
      :src="imageSrc"
      fit="cover"
      class="product-thumb"
      :preview-src-list="[imageSrc]"
      :initial-index="0"
      hide-on-click-modal
    />
    <div v-else class="product-thumb-placeholder"></div>
    <div class="product-info">
      <div class="product-id purple">
        <span>{{ displayId }}</span>
        <el-icon class="copy-icon" @click.stop="copyId" :title="$t('common.copy')">
          <CopyDocument />
        </el-icon>
      </div>
      <el-tooltip :content="product.name" placement="top">
        <div class="product-name" @click="handleProductClick">
          {{ truncateText(product.name, 50) }}
        </div>
      </el-tooltip>
      <div class="shop-name" v-if="product.shopName">
        <ShopIcon class="shop-svg-icon" />
        {{ product.shopName }}
      </div>
      <div class="shop-name" v-else>--</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import ShopIcon from './ShopIcon.vue'

const props = defineProps({
  product: {
    type: Object,
    required: true,
    default: () => ({})
  },
  // 要复制的ID字段名，默认为tiktokProductId，回退到productId
  copyField: {
    type: String,
    default: 'tiktokProductId'
  },
  // 点击商品名称时的回调
  onClick: {
    type: Function,
    default: null
  }
})

const emit = defineEmits(['click'])

const imageSrc = computed(() => {
  if (props.product.image) return props.product.image
  if (Array.isArray(props.product.images) && props.product.images.length > 0) return props.product.images[0]
  if (Array.isArray(props.product.productImages) && props.product.productImages.length > 0) return props.product.productImages[0]
  return ''
})

const displayId = computed(() => {
  // 优先显示tiktokProductId，否则显示productId
  return props.product.tiktokProductId || props.product.productId || props.product.id || '--'
})

const copyId = async () => {
  const idToCopy = props.product[props.copyField] || props.product.tiktokProductId || props.product.productId || props.product.id
  if (!idToCopy) {
    ElMessage.warning('无可用ID可复制')
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

const handleProductClick = () => {
  if (props.onClick) {
    props.onClick(props.product)
  } else {
    emit('click', props.product)
  }
}

const truncateText = (text, maxLength) => {
  if (!text) return '--'
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
</script>

<style scoped>
/* 复用现有样式，仅添加copy-icon样式 */
.product-id {
  display: flex;
  align-items: center;
  gap: 8px;
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

.product-name {
  cursor: pointer;
}
</style>