<template>
  <div class="init-import-page">
    <el-card class="header-card">
      <h2>初始化导入</h2>
      <p class="desc">本模块仅限GoodMe系统切换时导入原始数据</p>
    </el-card>

    <el-tabs v-model="activeTab" type="border-card" class="import-tabs">
      <!-- 1. 导入类目 -->
      <el-tab-pane label="导入类目" name="category">
        <div class="tab-content">
          <el-alert
            title="说明"
            type="info"
            :closable="false"
            show-icon
            class="info-alert"
          >
            <p>上传Excel文件，文件需包含"字典标签"列，系统将自动提取中英文分别导入。</p>
          </el-alert>

          <el-upload
            class="upload-area"
            :action="`${API_BASE_URL}/api/init-import/category`"
            :headers="uploadHeaders"
            :before-upload="beforeUpload"
            :on-success="handleSuccess"
            :on-error="handleError"
            :show-file-list="false"
            accept=".xls,.xlsx"
          >
            <el-button type="primary" :loading="uploading">
              <el-icon><Upload /></el-icon>
              上传Excel文件
            </el-button>
          </el-upload>

          <div v-if="importResult" class="result-tip" :class="importResult.success ? 'success' : 'error'">
            {{ importResult.message }}
          </div>
        </div>
      </el-tab-pane>

      <!-- 2. 导入店铺 -->
      <el-tab-pane label="导入店铺" name="shop">
        <div class="tab-content">
          <el-alert
            title="说明"
            type="info"
            :closable="false"
            show-icon
            class="info-alert"
          >
            <p>上传Excel文件（gm-shop.xls格式），包含shop_name、shop_no、address等列。</p>
          </el-alert>

          <div class="action-row">
            <el-button type="danger" @click="clearShops" :loading="clearingShops">
              <el-icon><Delete /></el-icon>
              清除现有店铺
            </el-button>

            <el-upload
              class="upload-area"
              :action="`${API_BASE_URL}/api/init-import/shops`"
              :headers="uploadHeaders"
              :before-upload="beforeUpload"
              :on-success="handleSuccess"
              :on-error="handleError"
              :show-file-list="false"
              accept=".xls,.xlsx"
            >
              <el-button type="primary" :loading="uploading">
                <el-icon><Upload /></el-icon>
                上传Excel文件
              </el-button>
            </el-upload>
          </div>

          <div v-if="importResult" class="result-tip" :class="importResult.success ? 'success' : 'error'">
            {{ importResult.message }}
          </div>
          <div v-if="clearResult" class="result-tip" :class="clearResult.success ? 'success' : 'error'">
            {{ clearResult.message }}
          </div>
        </div>
      </el-tab-pane>

      <!-- 3. 导入商品 -->
      <el-tab-pane label="导入商品" name="product">
        <div class="tab-content">
          <el-alert
            title="说明"
            type="info"
            :closable="false"
            show-icon
            class="info-alert"
          >
            <p>上传Excel文件（gm-goods.xls格式），包含goods_no、productName、shop_id等列。</p>
          </el-alert>

          <div class="action-row">
            <el-button type="danger" @click="clearProducts" :loading="clearingProducts">
              <el-icon><Delete /></el-icon>
              清除现有商品
            </el-button>

            <el-upload
              class="upload-area"
              :action="`${API_BASE_URL}/api/init-import/products`"
              :headers="uploadHeaders"
              :before-upload="beforeUpload"
              :on-success="handleSuccess"
              :on-error="handleError"
              :show-file-list="false"
              accept=".xls,.xlsx"
            >
              <el-button type="primary" :loading="uploading">
                <el-icon><Upload /></el-icon>
                上传Excel文件
              </el-button>
            </el-upload>
          </div>

          <div v-if="importResult" class="result-tip" :class="importResult.success ? 'success' : 'error'">
            {{ importResult.message }}
          </div>
          <div v-if="clearResult" class="result-tip" :class="clearResult.success ? 'success' : 'error'">
            {{ clearResult.message }}
          </div>
        </div>
      </el-tab-pane>

      <!-- 4. 导入达人 -->
      <el-tab-pane label="导入达人" name="influencer">
        <div class="tab-content">
          <el-alert
            title="说明"
            type="info"
            :closable="false"
            show-icon
            class="info-alert"
          >
            <p>上传Excel文件（gm-tk_expert.xls格式），包含expert_account、expert_name等列。</p>
          </el-alert>

          <div class="action-row">
            <el-button type="danger" @click="clearInfluencers" :loading="clearingInfluencers">
              <el-icon><Delete /></el-icon>
              清除现有达人
            </el-button>

            <el-upload
              class="upload-area"
              :action="`${API_BASE_URL}/api/init-import/influencers`"
              :headers="uploadHeaders"
              :before-upload="beforeUpload"
              :on-success="handleSuccess"
              :on-error="handleError"
              :show-file-list="false"
              accept=".xls,.xlsx"
            >
              <el-button type="primary" :loading="uploading">
                <el-icon><Upload /></el-icon>
                上传Excel文件
              </el-button>
            </el-upload>
          </div>

          <div v-if="importResult" class="result-tip" :class="importResult.success ? 'success' : 'error'">
            {{ importResult.message }}
          </div>
          <div v-if="clearResult" class="result-tip" :class="clearResult.success ? 'success' : 'error'">
            {{ clearResult.message }}
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, Delete } from '@element-plus/icons-vue'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

const activeTab = ref('category')
const uploading = ref(false)
const clearingShops = ref(false)
const clearingProducts = ref(false)
const clearingInfluencers = ref(false)
const importResult = ref(null)
const clearResult = ref(null)

const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
}))

const beforeUpload = () => {
  uploading.value = true
  importResult.value = null
  clearResult.value = null
}

const handleSuccess = (response) => {
  uploading.value = false
  if (response.success) {
    importResult.value = { success: true, message: response.message }
    ElMessage.success(response.message)
  } else {
    importResult.value = { success: false, message: response.message }
    ElMessage.error(response.message)
  }
}

const handleError = (error) => {
  uploading.value = false
  const msg = error.response?.data?.message || '上传失败'
  importResult.value = { success: false, message: msg }
  ElMessage.error(msg)
}

const clearShops = async () => {
  clearingShops.value = true
  clearResult.value = null
  try {
    const token = localStorage.getItem('token')
    const res = await axios.delete(`${API_BASE_URL}/api/init-import/shops/clear`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    clearResult.value = { success: true, message: res.data.message }
    ElMessage.success(res.data.message)
  } catch (error) {
    const msg = error.response?.data?.message || '清除失败'
    clearResult.value = { success: false, message: msg }
    ElMessage.error(msg)
  } finally {
    clearingShops.value = false
  }
}

const clearProducts = async () => {
  clearingProducts.value = true
  clearResult.value = null
  try {
    const token = localStorage.getItem('token')
    const res = await axios.delete(`${API_BASE_URL}/api/init-import/products/clear`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    clearResult.value = { success: true, message: res.data.message }
    ElMessage.success(res.data.message)
  } catch (error) {
    const msg = error.response?.data?.message || '清除失败'
    clearResult.value = { success: false, message: msg }
    ElMessage.error(msg)
  } finally {
    clearingProducts.value = false
  }
}

const clearInfluencers = async () => {
  clearingInfluencers.value = true
  clearResult.value = null
  try {
    const token = localStorage.getItem('token')
    const res = await axios.delete(`${API_BASE_URL}/api/init-import/influencers/clear`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    clearResult.value = { success: true, message: res.data.message }
    ElMessage.success(res.data.message)
  } catch (error) {
    const msg = error.response?.data?.message || '清除失败'
    clearResult.value = { success: false, message: msg }
    ElMessage.error(msg)
  } finally {
    clearingInfluencers.value = false
  }
}
</script>

<style scoped>
.init-import-page {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.header-card h2 {
  margin: 0 0 10px 0;
  color: #303133;
}

.desc {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.import-tabs {
  min-height: 400px;
}

.tab-content {
  padding: 20px;
}

.info-alert {
  margin-bottom: 20px;
}

.info-alert p {
  margin: 5px 0 0 0;
  font-size: 14px;
}

.action-row {
  display: flex;
  gap: 15px;
  align-items: center;
}

.upload-area {
  display: inline-block;
}

.result-tip {
  margin-top: 15px;
  padding: 12px;
  border-radius: 4px;
  font-size: 14px;
}

.result-tip.success {
  background: #f0f9eb;
  color: #67c23a;
  border: 1px solid #e1f3d8;
}

.result-tip.error {
  background: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fde2e2;
}
</style>
