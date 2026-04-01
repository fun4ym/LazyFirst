<template>
  <div class="initialization-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>初始化</h3>
          <span class="header-tip">本模块仅限GoodMe系统切换时导入原始数据</span>
        </div>
      </template>

      <el-tabs v-model="activeTab" class="init-tabs">
        <!-- 导入店铺 -->
        <el-tab-pane label="导入店铺" name="shop">
          <div class="import-section">
            <div class="section-header">
              <span class="section-title">店铺数据导入</span>
              <el-button type="danger" size="small" @click="clearShops" :loading="clearingShops">
                清除
              </el-button>
            </div>
            <el-alert
              title="导入说明"
              type="info"
              :closable="false"
              show-icon
              style="margin-bottom: 16px"
            >
              <template #default>
                上传Excel文件( gm-shop.xls )进行店铺数据导入
              </template>
            </el-alert>
            <el-upload
              ref="shopUploadRef"
              class="upload-demo"
              :action="uploadAction"
              :data="uploadData('shop')"
              :auto-upload="false"
              :on-change="(file) => handleFileChange(file, 'shop')"
              :on-success="(response) => handleUploadSuccess(response, 'shop')"
              :on-error="handleUploadError"
              :on-preview="handlePreview"
              :limit="1"
              accept=".xls,.xlsx"
            >
              <el-button type="primary" size="small">选择文件</el-button>
              <template #tip>
                <div class="upload-tip">只能上传xls/xlsx文件</div>
              </template>
            </el-upload>
            <div class="upload-actions" v-if="shopFile">
              <el-button type="success" @click="submitUpload('shop')" :loading="uploadingShop">
                导入
              </el-button>
              <el-button @click="resetUpload('shop')">重置</el-button>
            </div>
            <div v-if="shopResult" class="result-info" :class="shopResult.success ? 'success' : 'error'">
              {{ shopResult.message }}
            </div>
          </div>
        </el-tab-pane>

        <!-- 导入商品 -->
        <el-tab-pane label="导入商品" name="product">
          <div class="import-section">
            <div class="section-header">
              <span class="section-title">商品数据导入</span>
              <el-button type="danger" size="small" @click="clearProducts" :loading="clearingProducts">
                清除
              </el-button>
            </div>
            <el-alert
              title="导入说明"
              type="info"
              :closable="false"
              show-icon
              style="margin-bottom: 16px"
            >
              <template #default>
                上传Excel文件( gm-goods.xls )进行商品数据导入
              </template>
            </el-alert>
            <el-upload
              ref="productUploadRef"
              class="upload-demo"
              :action="uploadAction"
              :data="uploadData('product')"
              :auto-upload="false"
              :on-change="(file) => handleFileChange(file, 'product')"
              :on-success="(response) => handleUploadSuccess(response, 'product')"
              :on-error="handleUploadError"
              :limit="1"
              accept=".xls,.xlsx"
            >
              <el-button type="primary" size="small">选择文件</el-button>
              <template #tip>
                <div class="upload-tip">只能上传xls/xlsx文件</div>
              </template>
            </el-upload>
            <div class="upload-actions" v-if="productFile">
              <el-button type="success" @click="submitUpload('product')" :loading="uploadingProduct">
                导入
              </el-button>
              <el-button @click="resetUpload('product')">重置</el-button>
            </div>
            <div v-if="productResult" class="result-info" :class="productResult.success ? 'success' : 'error'">
              {{ productResult.message }}
            </div>
          </div>
        </el-tab-pane>

        <!-- 导入达人 -->
        <el-tab-pane label="导入达人" name="influencer">
          <div class="import-section">
            <div class="section-header">
              <span class="section-title">达人数据导入</span>
              <el-button type="danger" size="small" @click="clearInfluencers" :loading="clearingInfluencers">
                清除
              </el-button>
            </div>
            <el-alert
              title="导入说明"
              type="info"
              :closable="false"
              show-icon
              style="margin-bottom: 16px"
            >
              <template #default>
                上传Excel文件( gm-tk_expert.xls )进行达人数据导入
              </template>
            </el-alert>
            <el-upload
              ref="influencerUploadRef"
              class="upload-demo"
              :action="uploadAction"
              :data="uploadData('influencer')"
              :auto-upload="false"
              :on-change="(file) => handleFileChange(file, 'influencer')"
              :on-success="(response) => handleUploadSuccess(response, 'influencer')"
              :on-error="handleUploadError"
              :limit="1"
              accept=".xls,.xlsx"
            >
              <el-button type="primary" size="small">选择文件</el-button>
              <template #tip>
                <div class="upload-tip">只能上传xls/xlsx文件</div>
              </template>
            </el-upload>
            <div class="upload-actions" v-if="influencerFile">
              <el-button type="success" @click="submitUpload('influencer')" :loading="uploadingInfluencer">
                导入
              </el-button>
              <el-button @click="resetUpload('influencer')">重置</el-button>
            </div>
            <div v-if="influencerResult" class="result-info" :class="influencerResult.success ? 'success' : 'error'">
              {{ influencerResult.message }}
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const { t } = useI18n()
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL === '' ? '' : (import.meta.env.VITE_API_BASE_URL || '')

const activeTab = ref('shop')

// 上传相关
const uploadAction = computed(() => `${API_BASE_URL}/api/initialization/upload`)
const companyId = '69a7aad8da66cd5145a5f06f'

// 店铺导入
const shopUploadRef = ref(null)
const shopFile = ref(null)
const uploadingShop = ref(false)
const clearingShops = ref(false)
const shopResult = ref(null)

// 商品导入
const productUploadRef = ref(null)
const productFile = ref(null)
const uploadingProduct = ref(false)
const clearingProducts = ref(false)
const productResult = ref(null)

// 达人导入
const influencerUploadRef = ref(null)
const influencerFile = ref(null)
const uploadingInfluencer = ref(false)
const clearingInfluencers = ref(false)
const influencerResult = ref(null)

// 文件类型验证
const expectedFileNames = {
  shop: 'gm-shop.xls',
  product: 'gm-goods.xls',
  influencer: 'gm-tk_expert.xls'
}

function uploadData(type) {
  return {
    type,
    companyId
  }
}

function handleFileChange(file, type) {
  const rawFile = file.raw
  if (!rawFile) return

  // 验证文件名
  const fileName = rawFile.name.toLowerCase()
  const expected = expectedFileNames[type].toLowerCase()

  if (fileName !== expected && !fileName.includes(expected.replace('.xls', ''))) {
    ElMessage.error(`文件名必须为 ${expectedFileNames[type]}，当前文件：${rawFile.name}`)
    if (type === 'shop') {
      shopFile.value = null
      shopUploadRef.value?.clearFiles()
    } else if (type === 'product') {
      productFile.value = null
      productUploadRef.value?.clearFiles()
    } else if (type === 'influencer') {
      influencerFile.value = null
      influencerUploadRef.value?.clearFiles()
    }
    return
  }

  if (type === 'shop') {
    shopFile.value = rawFile
    shopResult.value = null
  } else if (type === 'product') {
    productFile.value = rawFile
    productResult.value = null
  } else if (type === 'influencer') {
    influencerFile.value = rawFile
    influencerResult.value = null
  }
}

function submitUpload(type) {
  let uploadRef, file
  if (type === 'shop') {
    uploadRef = shopUploadRef
    file = shopFile
    uploadingShop.value = true
  } else if (type === 'product') {
    uploadRef = productUploadRef
    file = productFile
    uploadingProduct.value = true
  } else if (type === 'influencer') {
    uploadRef = influencerUploadRef
    file = influencerFile
    uploadingInfluencer.value = true
  }

  if (!file.value) {
    ElMessage.warning('请先选择文件')
    return
  }

  // 使用FormData上传
  const formData = new FormData()
  formData.append('file', file.value)
  formData.append('type', type)
  formData.append('companyId', companyId)

  const token = localStorage.getItem('token')
  axios.post(`${API_BASE_URL}/api/initialization/import`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': `Bearer ${token}`
    }
  })
    .then(res => {
      if (res.data.success) {
        if (type === 'shop') {
          shopResult.value = { success: true, message: res.data.message || '店铺导入成功' }
        } else if (type === 'product') {
          productResult.value = { success: true, message: res.data.message || '商品导入成功' }
        } else if (type === 'influencer') {
          influencerResult.value = { success: true, message: res.data.message || '达人导入成功' }
        }
        ElMessage.success(res.data.message || '导入成功')
      } else {
        if (type === 'shop') {
          shopResult.value = { success: false, message: res.data.message || '店铺导入失败' }
        } else if (type === 'product') {
          productResult.value = { success: false, message: res.data.message || '商品导入失败' }
        } else if (type === 'influencer') {
          influencerResult.value = { success: false, message: res.data.message || '达人导入失败' }
        }
        ElMessage.error(res.data.message || '导入失败')
      }
    })
    .catch(err => {
      const msg = err.response?.data?.message || '上传失败，请重试'
      if (type === 'shop') {
        shopResult.value = { success: false, message: msg }
      } else if (type === 'product') {
        productResult.value = { success: false, message: msg }
      } else if (type === 'influencer') {
        influencerResult.value = { success: false, message: msg }
      }
      ElMessage.error(msg)
    })
    .finally(() => {
      uploadingShop.value = false
      uploadingProduct.value = false
      uploadingInfluencer.value = false
    })
}

function resetUpload(type) {
  if (type === 'shop') {
    shopFile.value = null
    shopResult.value = null
    shopUploadRef.value?.clearFiles()
  } else if (type === 'product') {
    productFile.value = null
    productResult.value = null
    productUploadRef.value?.clearFiles()
  } else if (type === 'influencer') {
    influencerFile.value = null
    influencerResult.value = null
    influencerUploadRef.value?.clearFiles()
  }
}

function handlePreview(file) {
  console.log('preview', file)
}

function handleUploadSuccess(response, type) {
  console.log('upload success', response, type)
}

function handleUploadError(err) {
  console.error('upload error', err)
  ElMessage.error('上传失败，请重试')
}

// 清除数据
async function clearShops() {
  try {
    await ElMessageBox.confirm('确定要删除所有店铺数据吗？此操作不可恢复！', '警告', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    clearingShops.value = true
    const token = localStorage.getItem('token')
    const res = await axios.delete(`${API_BASE_URL}/api/shops/clear-all`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.data.success) {
      ElMessage.success('店铺数据已清空')
      shopResult.value = { success: true, message: '店铺数据已清空' }
    } else {
      ElMessage.error(res.data.message || '清除失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('清除失败')
    }
  } finally {
    clearingShops.value = false
  }
}

async function clearProducts() {
  try {
    await ElMessageBox.confirm('确定要删除所有商品数据吗？此操作不可恢复！', '警告', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    clearingProducts.value = true
    const token = localStorage.getItem('token')
    const res = await axios.delete(`${API_BASE_URL}/api/products/clear-all`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.data.success) {
      ElMessage.success('商品数据已清空')
      productResult.value = { success: true, message: '商品数据已清空' }
    } else {
      ElMessage.error(res.data.message || '清除失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('清除失败')
    }
  } finally {
    clearingProducts.value = false
  }
}

async function clearInfluencers() {
  try {
    await ElMessageBox.confirm('确定要删除所有达人数据吗？此操作不可恢复！', '警告', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    clearingInfluencers.value = true
    const token = localStorage.getItem('token')
    const res = await axios.delete(`${API_BASE_URL}/api/influencers/clear-all`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.data.success) {
      ElMessage.success('达人数据已清空')
      influencerResult.value = { success: true, message: '达人数据已清空' }
    } else {
      ElMessage.error(res.data.message || '清除失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('清除失败')
    }
  } finally {
    clearingInfluencers.value = false
  }
}
</script>

<style scoped>
.initialization-page {
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
  color: #e6a23c;
  font-weight: 500;
}

.init-tabs {
  min-height: 400px;
}

.import-section {
  padding: 20px;
  background: #fafafa;
  border-radius: 4px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.upload-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.upload-actions {
  margin-top: 16px;
  display: flex;
  gap: 12px;
}

.result-info {
  margin-top: 16px;
  padding: 12px;
  border-radius: 4px;
  font-size: 14px;
}

.result-info.success {
  background: #f0f9eb;
  color: #67c23a;
  border: 1px solid #e1f3d8;
}

.result-info.error {
  background: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fde2e2;
}
</style>
