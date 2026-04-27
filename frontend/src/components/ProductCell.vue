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
import { computed, ref, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import ShopIcon from './ShopIcon.vue'
import request from '@/utils/request'

// 公开页面列表（无需登录）
const publicPages = ['/samples/public', '/recruitments/public', '/products/public']

// 检查当前路由是否为公开页面
const isPublicPage = () => {
  return publicPages.some(page => window.location.pathname.startsWith(page))
}

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
  },
  // 是否禁止自动获取图片（公开页面使用）
  disableAutoFetch: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click', 'copy-field'])

// 商品图片缓存（模块作用域，所有实例共享）
const productImageCache = ref({})
// 正在加载的请求映射，避免重复请求同一商品
const pendingRequests = ref({})

// 获取商品图片
const fetchProductImage = async () => {
  const tiktokProductId = props.product.tiktokProductId || props.product.productId
  if (!tiktokProductId) {
    return ''
  }

  // ★ 公开页面或禁用自动获取时，不请求API
  if (isPublicPage() || props.disableAutoFetch) {
    return ''
  }

  
  // 如果缓存中已有，直接返回
  if (productImageCache.value[tiktokProductId]) {
    return productImageCache.value[tiktokProductId]
  }
  
  // 如果已经有正在进行的请求，等待它完成
  if (pendingRequests.value[tiktokProductId]) {
    return pendingRequests.value[tiktokProductId]
  }
  
  // 创建新的请求
  const requestPromise = (async () => {
    try {
      const res = await request.get('/products', {
        params: {
          search: tiktokProductId,
          limit: 1
        }
      })
      // 处理不同的响应结构
      let productArray = []
      if (Array.isArray(res.data)) {
        // 如果响应直接是数组
        productArray = res.data
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        // 标准分页格式 { data: [...], pagination: {...} }
        productArray = res.data.data
      } else if (res.data?.products && Array.isArray(res.data.products)) {
        // 商品格式 { products: [...], pagination: {...} }
        productArray = res.data.products
      }
      if (productArray.length > 0) {
        const product = productArray[0]
        // 优先使用 image，否则使用 productImage、images[0] 或 productImages[0]
        const imageUrl = product.image || 
                        product.productImage ||
                        (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '') ||
                        (Array.isArray(product.productImages) && product.productImages.length > 0 ? product.productImages[0] : '')
        if (imageUrl) {
          // 处理图片URL
          const processedUrl = processImageUrl(imageUrl)
          // 使用新对象替换以确保响应性
          productImageCache.value = {
            ...productImageCache.value,
            [tiktokProductId]: processedUrl
          }
          return processedUrl
        } else {
        }
      } else {
      }
    } catch (error) {
      console.error('[ProductCell] 获取商品图片失败:', error)
      console.error('[ProductCell] 错误详情:', error.response?.data || error.message)
      console.error('[ProductCell] 请求URL:', error.config?.url)
      console.error('[ProductCell] 请求参数:', error.config?.params)
    } finally {
      // 请求完成后从 pendingRequests 中移除
      delete pendingRequests.value[tiktokProductId]
    }
    return ''
  })()
  
  // 保存请求 promise
  pendingRequests.value[tiktokProductId] = requestPromise
  return await requestPromise
}

// 监听 product.tiktokProductId 变化
watch(() => props.product.tiktokProductId || props.product.productId, async (newId) => {
  if (newId && !props.disableAutoFetch) {
    await fetchProductImage()
  }
})

// 组件挂载时尝试获取图片
onMounted(async () => {
  if ((props.product.tiktokProductId || props.product.productId) && !props.disableAutoFetch) {
    await fetchProductImage()
  }
})

// 处理图片URL，如果是相对路径则添加基础URL
const processImageUrl = (url) => {
  if (!url) return ''
  
  
  // 如果是完整URL，直接返回
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }
  
  // 如果是相对路径，添加API基础URL
  if (url.startsWith('/')) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
    // 避免重复添加基础URL
    if (baseUrl && !url.startsWith(baseUrl)) {
      const fullUrl = `${baseUrl}${url}`
      return fullUrl
    }
  }
  
  return url
}

const imageSrc = computed(() => {
  let url = ''
  
  // 优先使用直接传递的图片
  if (props.product.image) {
    url = props.product.image
  } else if (props.product.productImage) {
    url = props.product.productImage
  } else if (Array.isArray(props.product.images) && props.product.images.length > 0) {
    url = props.product.images[0]
  } else if (Array.isArray(props.product.productImages) && props.product.productImages.length > 0) {
    url = props.product.productImages[0]
  } else {
    // 尝试从缓存中获取
    const tiktokProductId = props.product.tiktokProductId || props.product.productId
    if (tiktokProductId && productImageCache.value[tiktokProductId]) {
      url = productImageCache.value[tiktokProductId]
    } else {
    }
  }
  
  return processImageUrl(url)
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
  emit('copy-field', props.copyField, idToCopy)
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