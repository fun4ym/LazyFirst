<template>
  <div class="products-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>合作产品</h3>
        </div>
      </template>

      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 合作产品页签 -->
        <el-tab-pane label="合作产品" name="products">
          <ProductTab ref="productTabRef" />
        </el-tab-pane>

        <!-- 店铺页签 -->
        <el-tab-pane label="店铺" name="shops">
          <ShopTab ref="shopTabRef" />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ProductTab from './ProductTab.vue'
import ShopTab from './ShopTab.vue'

const activeTab = ref('products')
const productTabRef = ref(null)
const shopTabRef = ref(null)

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
