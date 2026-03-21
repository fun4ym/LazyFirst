<template>
  <div class="products-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>{{ $t('menu.products') }}</h3>
        </div>
      </template>

      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 合作产品页签 -->
        <el-tab-pane :label="$t('product.productList')" name="products">
          <ProductTab ref="productTabRef" />
        </el-tab-pane>

        <!-- 店铺页签 -->
        <el-tab-pane :label="$t('order.shop')" name="shops">
          <ShopTab ref="shopTabRef" />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import ProductTab from './ProductTab.vue'
import ShopTab from './ShopTab.vue'

const { t } = useI18n()
const route = useRoute()
const activeTab = ref('products')
const productTabRef = ref(null)
const shopTabRef = ref(null)

// 根据路由meta设置默认tab
onMounted(() => {
  if (route.meta.activeTab) {
    activeTab.value = route.meta.activeTab
    // 加载对应tab的数据
    setTimeout(() => {
      if (activeTab.value === 'shops' && shopTabRef.value) {
        shopTabRef.value.loadData()
      } else if (activeTab.value === 'products' && productTabRef.value) {
        productTabRef.value.loadData()
      }
    }, 100)
  }
})

// 监听路由变化
watch(() => route.meta.activeTab, (newTab) => {
  if (newTab) {
    activeTab.value = newTab
  }
})

const handleTabChange = (tabName) => {
  if (tabName === 'products' && productTabRef.value) {
    productTabRef.value.loadData()
  } else if (tabName === 'shops' && shopTabRef.value) {
    shopTabRef.value.loadData()
  }
}
</script>

<style scoped>
.products-page {
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
</style>
