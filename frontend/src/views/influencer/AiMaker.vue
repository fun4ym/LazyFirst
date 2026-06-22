<template>
  <div class="ai-maker-container">
    <!-- 顶部标题区 -->
    <div class="page-header">
      <h2 class="page-title">
        <el-icon><VideoCamera /></el-icon>
        AI视频生成
      </h2>
      <p class="page-description">选择商品，配置参数，输入提示词，快速生成AI视频</p>
    </div>

    <!-- 商品区（顶部横向展示） -->
    <el-card class="product-section" shadow="never">
      <template #header>
        <div class="section-header">
          <span class="section-title">
            <el-icon><ShoppingBag /></el-icon>
            商品信息
          </span>
          <el-button type="primary" link @click="showProductSelector">
            <el-icon><Edit /></el-icon>
            {{ selectedProduct ? '更换商品' : '选择商品' }}
          </el-button>
        </div>
      </template>

      <!-- 已选择商品 -->
      <div v-if="selectedProduct" class="product-content">
        <div class="product-info">
          <div class="product-name">{{ selectedProduct.name }}</div>
          <div class="product-meta">
            <el-tag size="small" type="info" v-if="selectedProduct.shop?.name">
              <el-icon><Shop /></el-icon>
              {{ selectedProduct.shop.name }}
            </el-tag>
            <el-tag size="small" type="success" v-if="selectedProduct.status === 'active'">活跃</el-tag>
          </div>
        </div>

        <div class="product-media" v-if="hasMedia">
          <div class="media-item" v-if="selectedProduct.mainImage">
            <img :src="selectedProduct.mainImage" alt="主图" />
          </div>
          <div class="media-item video" v-if="selectedProduct.videoUrl">
            <video :src="selectedProduct.videoUrl" preload="metadata"></video>
            <span class="media-badge">视频</span>
          </div>
        </div>
      </div>

      <!-- 未选择商品 -->
      <div v-else class="product-empty">
        <el-empty description="请点击右上角按钮选择商品" :image-size="60" />
      </div>
    </el-card>

    <!-- 中间配置区和描述区（左右分栏） -->
    <el-row :gutter="20" class="main-content">
      <!-- 左侧：配置区（宽度缩减一半） -->
      <el-col :xs="24" :sm="24" :md="8" :lg="8">
        <el-card class="config-section" shadow="never">
          <template #header>
            <div class="section-header">
              <span class="section-title">
                <el-icon><Setting /></el-icon>
                配置参数
              </span>
            </div>
          </template>

          <el-form :model="generationParams" label-width="80px" size="default">
            <!-- 选择角色 -->
            <el-form-item label="角色">
              <div class="role-selector">
                <el-select 
                  v-model="selectedDigitalHuman" 
                  placeholder="选择数字人角色" 
                  class="full-width"
                  clearable
                >
                  <el-option 
                    v-for="human in digitalHumans" 
                    :key="human._id" 
                    :label="human.name" 
                    :value="human._id" 
                  />
                </el-select>
                <el-button type="primary" link @click="showRoleManager">
                  <el-icon><Plus /></el-icon>
                  管理
                </el-button>
              </div>
            </el-form-item>

            <!-- 参考图片 -->
            <el-form-item label="参考图">
              <el-upload
                class="upload-demo"
                action="#"
                :auto-upload="false"
                :limit="1"
                list-type="picture-card"
                :on-change="handleReferenceImage"
              >
                <el-icon><Plus /></el-icon>
              </el-upload>
            </el-form-item>

            <!-- 选择比例 -->
            <el-form-item label="比例">
              <el-radio-group v-model="generationParams.ratio">
                <el-radio-button label="16:9">16:9</el-radio-button>
                <el-radio-button label="9:16">9:16</el-radio-button>
                <el-radio-button label="1:1">1:1</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <!-- 选择时长 -->
            <el-form-item label="时长">
              <el-select v-model="generationParams.duration" class="full-width">
                <el-option label="5秒" :value="5" />
                <el-option label="10秒" :value="10" />
                <el-option label="15秒" :value="15" />
                <el-option label="30秒" :value="30" />
              </el-select>
            </el-form-item>

            <!-- 选择分辨率 -->
            <el-form-item label="分辨率">
              <el-select v-model="generationParams.resolution" class="full-width">
                <el-option label="720p" value="720p" />
                <el-option label="1080p" value="1080p" />
                <el-option label="2K" value="2k" />
              </el-select>
            </el-form-item>

            <!-- 选择风格 -->
            <el-form-item label="风格">
              <el-select v-model="generationParams.style" class="full-width">
                <el-option label="常规" value="normal" />
                <el-option label="活泼" value="lively" />
                <el-option label="优雅" value="elegant" />
                <el-option label="专业" value="professional" />
              </el-select>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 右侧：描述区（占用更多空间） -->
      <el-col :xs="24" :sm="24" :md="16" :lg="16">
        <el-card class="prompt-section" shadow="never">
          <template #header>
            <div class="section-header">
              <span class="section-title">
                <el-icon><EditPen /></el-icon>
                提示词
              </span>
            </div>
          </template>

          <div class="prompt-content">
            <el-input
              v-model="promptText"
              type="textarea"
              :rows="10"
              placeholder="请输入视频生成提示词，描述您希望视频呈现的内容、风格、场景等..."
              resize="vertical"
              class="prompt-input"
            />

            <div class="action-bar">
              <div class="model-selector">
                <span class="model-label">AI模型：</span>
                <el-select 
                  v-model="selectedModel" 
                  placeholder="选择AI模型" 
                  class="model-select"
                  clearable
                >
                  <el-option label="自动选择" value="auto" />
                  <el-option 
                    v-for="model in aiModels" 
                    :key="model._id" 
                    :label="model.name" 
                    :value="model._id" 
                  />
                </el-select>
              </div>

              <el-button 
                type="primary" 
                @click="generateVideo" 
                :loading="generating" 
                class="generate-btn"
                size="large"
              >
                <el-icon><VideoCamera /></el-icon>
                生成视频
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 模态框：商品选择器 -->
    <el-dialog v-model="showProductDialog" title="选择商品" width="800px" @open="loadProductList">
      <div class="product-selector">
        <div class="selector-search">
          <el-input
            v-model="productSearch.keyword"
            placeholder="搜索商品名称、TikTok ID、店铺名..."
            clearable
            @clear="loadProductList"
            @keyup.enter="loadProductList"
            class="search-input"
          >
            <template #append>
              <el-button @click="loadProductList">
                <el-icon><Search /></el-icon>
              </el-button>
            </template>
          </el-input>
          <el-select v-model="productSearch.shopId" placeholder="全部店铺" clearable @change="loadProductList" class="shop-filter">
            <el-option
              v-for="shop in shopOptions"
              :key="shop._id"
              :label="shop.name"
              :value="shop._id"
            />
          </el-select>
        </div>

        <el-table
          :data="productList"
          v-loading="productLoading"
          @row-click="selectProduct"
          highlight-current-row
          class="product-table"
          height="400"
        >
          <el-table-column label="选择" width="60" align="center">
            <template #default="{ row }">
              <el-radio v-model="selectedProductId" :label="row._id" @change="selectProduct(row)">
                {{ '' }}
              </el-radio>
            </template>
          </el-table-column>
          <el-table-column label="主图" width="80" align="center">
            <template #default="{ row }">
              <img v-if="row.mainImage" :src="row.mainImage" class="product-thumb" />
              <el-icon v-else><Picture /></el-icon>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="商品名称" min-width="200" show-overflow-tooltip />
          <el-table-column label="店铺" width="150" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.shop?.name || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="tiktokProductId" label="TikTok ID" width="120" />
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                {{ row.status === 'active' ? '活跃' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="productPagination.page"
            :page-size="productPagination.limit"
            :total="productPagination.total"
            layout="total, prev, pager, next"
            @current-change="loadProductList"
          />
        </div>
      </div>
      <template #footer>
        <el-button @click="showProductDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmProduct" :disabled="!selectedProductId">
          确认选择
        </el-button>
      </template>
    </el-dialog>

    <!-- 模态框：角色管理 -->
    <el-dialog v-model="showRoleDialog" title="角色管理" width="800px">
      <div class="role-manager">
        <!-- 角色卡片列表 -->
        <div class="role-list-section">
          <div class="section-header">
            <h4>数字人列表</h4>
            <el-button type="primary" @click="showRoleForm = true">
              <el-icon><Plus /></el-icon>
              新增角色
            </el-button>
          </div>
          
          <div v-loading="roleLoading" class="role-card-grid">
            <div 
              v-for="role in digitalHumans" 
              :key="role._id" 
              class="role-card"
            >
              <div class="role-card-image">
                <!-- 优先展示 references[0]，降级用 avatar -->
                <template v-if="getRoleDisplayUrl(role)">
                  <img v-if="!getRoleDisplayUrl(role).endsWith('mp4')" :src="getRoleDisplayUrl(role)" class="role-image" />
                  <video v-else :src="getRoleDisplayUrl(role)" class="role-image" controls />
                  <!-- 多图数量提示 -->
                  <div v-if="getRoleRefCount(role) > 1" class="role-image-count">
                    +{{ getRoleRefCount(role) - 1 }}
                  </div>
                </template>
                <div v-else class="role-image-placeholder">
                  <el-icon><User /></el-icon>
                </div>
              </div>
              <div class="role-card-info">
                <div class="role-card-name">{{ role.name }}</div>
                <div class="role-card-actions">
                  <el-button type="primary" link size="small" @click="editRole(role)">
                    <el-icon><Edit /></el-icon>
                    编辑
                  </el-button>
                  <el-button type="danger" link size="small" @click="deleteRole(role)">
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-button>
                </div>
              </div>
            </div>
            
            <!-- 空状态 -->
            <div v-if="digitalHumans.length === 0 && !roleLoading" class="role-empty">
              <el-empty description="暂无角色，点击右上角新增" :image-size="100" />
            </div>
          </div>
        </div>

        <!-- 新增/编辑表单 -->
        <el-dialog
          v-model="showRoleForm"
          :title="editingRole ? '编辑角色' : '新增角色'"
          width="500px"
          append-to-body
        >
          <el-form :model="roleForm" label-width="80px">
            <el-form-item label="名称" required>
              <el-input v-model="roleForm.name" placeholder="请输入角色名称" />
            </el-form-item>
            <el-form-item label="参考图/视频">
              <el-upload
                class="reference-uploader"
                action="#"
                :auto-upload="false"
                :show-file-list="true"
                :file-list="roleForm.referenceFileList"
                :on-change="handleReferenceUpload"
                :on-remove="handleReferenceRemove"
                accept="image/*,video/*"
                multiple
              >
                <el-icon class="reference-uploader-icon"><Plus /></el-icon>
              </el-upload>
              <div class="upload-tip">可上传多个参考图或视频，用于AI生成参考</div>
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="showRoleForm = false">取消</el-button>
            <el-button type="primary" @click="saveRole">
              确认
            </el-button>
          </template>
        </el-dialog>
      </div>
    </el-dialog>

    <!-- 模态框：已生成视频 -->
    <el-dialog v-model="showVideosDialog" title="已生成视频" width="900px">
      <p>已生成视频列表待实现</p>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Picture,
  ArrowLeft,
  ArrowRight,
  User,
  VideoPlay,
  MagicStick,
  VideoCamera,
  Search,
  ShoppingBag,
  Shop,
  Edit,
  Setting,
  Plus,
  EditPen,
  Delete
} from '@element-plus/icons-vue'

// 从URL参数获取productId
import { useRoute } from 'vue-router'
const route = useRoute()
const productId = ref(route.query.productId || '')

// 产品相关
const selectedProduct = ref(null)
const mediaFiles = ref([])
const showProductDialog = ref(false)
const selectedProductId = ref('')

// 商品选择器相关
const productList = ref([])
const productLoading = ref(false)
const productSearch = ref({
  keyword: '',
  shopId: ''
})
const productPagination = ref({
  page: 1,
  limit: 10,
  total: 0
})
const shopOptions = ref([])

// 是否有媒体文件
const hasMedia = computed(() => {
  return selectedProduct.value?.mainImage || 
         selectedProduct.value?.videoUrl || 
         mediaFiles.value.length > 0
})

// 媒体横向滚动
const mediaScroll = ref(null)
const scrollMedia = (direction) => {
  if (!mediaScroll.value) return
  const scrollAmount = 200
  const currentScroll = mediaScroll.value.scrollLeft
  if (direction === 'left') {
    mediaScroll.value.scrollLeft = currentScroll - scrollAmount
  } else {
    mediaScroll.value.scrollLeft = currentScroll + scrollAmount
  }
}

// 处理参考图片上传
const handleReferenceImage = (file) => {
  console.log('参考图片:', file)
  // TODO: 上传参考图片到服务器
}

// 模态框控制
const showRoleDialog = ref(false)
const showVideosDialog = ref(false)

// 角色管理相关
const roleLoading = ref(false)
const showRoleForm = ref(false)
const editingRole = ref(false)
const roleForm = ref({
  name: '',
  reference: '',  // 角色参考图或视频（兼容旧数据）
  referencePreview: '',  // 用于预览上传的参考图/视频（兼容旧数据）
  references: [],  // 多个参考图/视频URL
  referenceFileList: []  // el-upload 的文件列表
})

// AI模型和数字人
const aiModels = ref([])
const digitalHumans = ref([])
const selectedModel = ref('auto')
const selectedDigitalHuman = ref('')
const selectedDigitalHumanObj = computed(() => {
  return digitalHumans.value.find(h => h._id === selectedDigitalHuman.value) || null
})

// 生成参数（设定默认值）
const generationParams = ref({
  ratio: '9:16',  // 默认9:16
  duration: 10,    // 默认10秒
  resolution: '720p',  // 默认720p
  style: 'normal'  // 默认常规
})
const promptText = ref('')
const generating = ref(false)

// 方法
const showProductSelector = () => {
  showProductDialog.value = true
  loadProductList()
  loadShopOptions()
}

const loadProductList = async (page = 1) => {
  productLoading.value = true
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: productPagination.value.limit.toString(),
      status: 'active'
    })
    
    if (productSearch.value.keyword) {
      params.append('keyword', productSearch.value.keyword)
    }
    if (productSearch.value.shopId) {
      params.append('shopId', productSearch.value.shopId)
    }

    const token = localStorage.getItem('token')
    if (!token) {
      ElMessage.error('请先登录')
      return
    }
    const response = await fetch(`/api/products?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const result = await response.json()
    
    if (result.success) {
      const responseData = result.data || {}
      productList.value = responseData.products || []
      productPagination.value.total = responseData.pagination?.total || 0
      productPagination.value.page = page
    } else {
      ElMessage.error(result.message || '加载商品列表失败')
      productList.value = []
    }
  } catch (error) {
    ElMessage.error('网络错误，请稍后重试')
    console.error('加载商品列表失败:', error)
  } finally {
    productLoading.value = false
  }
}

const loadShopOptions = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) return
    
    const response = await fetch('/api/shops?limit=100', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const result = await response.json()
    if (result.success) {
      shopOptions.value = result.data || []
    }
  } catch (error) {
    console.error('加载店铺列表失败:', error)
  }
}

const selectProduct = (row) => {
  selectedProductId.value = row._id
}

const confirmProduct = async () => {
  if (!selectedProductId.value) {
    ElMessage.warning('请先选择一个商品')
    return
  }
  
  const selected = productList.value.find(p => p._id === selectedProductId.value)
  if (selected) {
    selectedProduct.value = { ...selected }
    await loadProduct()
    ElMessage.success(`已选择商品: ${selected.name}`)
  }
  showProductDialog.value = false
}

const showRoleManager = () => {
  showRoleDialog.value = true
  loadDigitalHumans()
}

const showGeneratedVideos = () => {
  showVideosDialog.value = true
}

// 角色管理相关方法
const editRole = (row) => {
  editingRole.value = true
  // 兼容旧数据：优先用 references 数组，没有则降级用 avatar 单个字段
  const refs = (row.references && row.references.length > 0)
    ? [...row.references]
    : (row.avatar ? [row.avatar] : [])
  
  const fileList = refs.map((url, idx) => ({
    name: `参考${idx + 1}${url.endsWith('mp4') ? '.mp4' : '.jpg'}`,
    url: url
  }))
  
  roleForm.value = {
    _id: row._id,
    name: row.name,
    reference: row.avatar || '',
    referencePreview: row.avatar || '',
    references: refs,
    referenceFileList: fileList
  }
  showRoleForm.value = true
}

// 处理参考图/视频上传（支持多文件）
const handleReferenceUpload = (uploadFile, fileList) => {
  // el-upload 的 on-change 回调，fileList 包含所有文件
  // 只处理新上传的文件（raw 存在的，即本地文件）
  const newFiles = fileList.filter(f => f.raw && !f.url)
  
  newFiles.forEach(file => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target.result
      // 添加到 references 数组
      if (!roleForm.value.references) roleForm.value.references = []
      roleForm.value.references.push(base64)
      // 同步更新 referenceFileList（用于 el-upload 展示）
      roleForm.value.referenceFileList.push({
        name: file.name,
        url: base64,
        raw: file.raw
      })
    }
    reader.readAsDataURL(file.raw)
  })
  
  // 如果是编辑时已有 url 的文件（非新上传），同步到 referenceFileList
  const existingFiles = fileList.filter(f => f.url && !f.raw)
  roleForm.value.referenceFileList = [...existingFiles]
  // 重新把新上传的也加进来（上面异步可能还没完成，这里做一次完整同步）
  setTimeout(() => {
    const allUrls = [...(roleForm.value.references || [])]
    const mergedList = []
    allUrls.forEach((url, idx) => {
      mergedList.push({
        name: `参考${idx + 1}${url.endsWith('mp4') ? '.mp4' : '.jpg'}`,
        url: url
      })
    })
    roleForm.value.referenceFileList = mergedList
  }, 100)
}

// 处理参考图/视频移除
const handleReferenceRemove = (file, fileList) => {
  // 从 references 数组中移除对应的 URL
  if (file.url) {
    const idx = roleForm.value.references.indexOf(file.url)
    if (idx > -1) {
      roleForm.value.references.splice(idx, 1)
    }
  }
  roleForm.value.referenceFileList = fileList
}

const deleteRole = async (row) => {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      ElMessage.error('请先登录')
      return
    }

    const response = await fetch(`/api/digital-humans/${row._id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    const result = await response.json()
    if (result.success) {
      ElMessage.success('删除成功')
      loadDigitalHumans()
    } else {
      ElMessage.error(result.message || '删除失败')
    }
  } catch (error) {
    ElMessage.error('网络错误')
  }
}

const saveRole = async () => {
  if (!roleForm.value.name) {
    ElMessage.warning('请输入角色名称')
    return
  }

  try {
    const token = localStorage.getItem('token')
    if (!token) {
      ElMessage.error('请先登录')
      return
    }

    const url = editingRole.value ? `/api/digital-humans/${roleForm.value._id}` : '/api/digital-humans'
    const method = editingRole.value ? 'PUT' : 'POST'

    // 构造提交数据，包含 references 数组
    const submitData = {
      name: roleForm.value.name,
      references: roleForm.value.references || [],
      avatar: (roleForm.value.references && roleForm.value.references.length > 0)
        ? roleForm.value.references[0]
        : (roleForm.value.reference || '')
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(submitData)
    })

    const result = await response.json()
    if (result.success) {
      ElMessage.success(editingRole.value ? '更新成功' : '创建成功')
      showRoleForm.value = false
      loadDigitalHumans()
    } else {
      ElMessage.error(result.message || '操作失败')
    }
  } catch (error) {
    ElMessage.error('网络错误')
  }
}

const generateVideo = async () => {
  if (!selectedProduct.value) {
    ElMessage.warning('请先选择商品')
    return
  }
  if (!promptText.value.trim()) {
    ElMessage.warning('请输入提示词')
    return
  }

  generating.value = true
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      ElMessage.error('请先登录')
      generating.value = false
      return
    }

    const response = await fetch('/api/ai-models/generate-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        productId: selectedProduct.value._id,
        modelId: selectedModel.value === 'auto' ? null : selectedModel.value,
        digitalHumanId: selectedDigitalHuman.value,
        prompt: promptText.value,
        params: generationParams.value
      })
    })

    const result = await response.json()
    if (result.success) {
      ElMessage.success('视频生成任务已提交')
    } else {
      ElMessage.error(result.message || '生成失败')
    }
  } catch (error) {
    ElMessage.error('网络错误')
  } finally {
    generating.value = false
  }
}

// 初始化加载
const loadProduct = async () => {
  if (!productId.value) return
  
  const token = localStorage.getItem('token')
  if (!token) {
    console.warn('未登录，无法加载产品详情')
    return
  }

  try {
    const response = await fetch(`/api/products/${productId.value}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const result = await response.json()
    if (result.success) {
      selectedProduct.value = result.data
      // 加载媒体文件
      const mediaRes = await fetch(`/api/product-media/${productId.value}/media`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const mediaResult = await mediaRes.json()
      if (mediaResult.success) {
        mediaFiles.value = mediaResult.data || []
      }
    }
  } catch (error) {
    console.error('加载产品失败', error)
  }
}

const loadAiModels = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      console.warn('未登录，无法加载AI模型')
      aiModels.value = []
      return
    }

    const response = await fetch('/api/ai-models', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const result = await response.json()
    if (result.success) {
      // 后端返回格式: { data: { models: [...], pagination: {...} } }
      aiModels.value = result.data?.models || []
      // 默认选择 seedance 2.0
      const seedanceModel = aiModels.value.find(m => m.name.toLowerCase().includes('seedance') || m.name.includes('2.0'))
      if (seedanceModel) {
        selectedModel.value = seedanceModel._id
      }
    } else {
      console.error('加载AI模型失败:', result.message)
      aiModels.value = []
    }
  } catch (error) {
    console.error('加载AI模型失败', error)
    aiModels.value = []
  }
}

// 获取角色展示的URL（优先references[0]，降级用avatar）
const getRoleDisplayUrl = (role) => {
  if (role.references && role.references.length > 0) return role.references[0]
  if (role.avatar) return role.avatar
  return ''
}

// 获取角色的参考图数量
const getRoleRefCount = (role) => {
  if (role.references && role.references.length > 0) return role.references.length
  if (role.avatar) return 1
  return 0
}

const loadDigitalHumans = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      console.warn('未登录，无法加载数字人')
      digitalHumans.value = []
      return
    }

    const response = await fetch('/api/digital-humans/active/list', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const result = await response.json()
    if (result.success) {
      digitalHumans.value = result.data || []
    } else {
      console.error('加载数字人失败:', result.message)
      digitalHumans.value = []
    }
  } catch (error) {
    console.error('加载数字人失败', error)
    digitalHumans.value = []
  }
}

onMounted(() => {
  loadProduct()
  loadAiModels()
  loadDigitalHumans()
})

watch(productId, () => {
  loadProduct()
})
</script>

<style scoped>
.ai-maker-container {
  padding: 24px;
  background: #f5f7fa;
  min-height: calc(100vh - 48px);
}

/* 页面标题区 */
.page-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-title .el-icon {
  color: #409eff;
}

.page-description {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

/* 商品区（顶部） */
.product-section {
  margin-bottom: 20px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.product-section :deep(.el-card__header) {
  background: #fafafa;
  border-bottom: 1px solid #e4e7ed;
  padding: 12px 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title .el-icon {
  color: #409eff;
}

.product-content {
  display: flex;
  align-items: center;
  gap: 24px;
}

.product-info {
  flex: 1;
}

.product-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.product-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

.product-media {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.media-item {
  width: 80px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
  position: relative;
}

.media-item img,
.media-item video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #409eff;
  color: white;
  font-size: 10px;
  padding: 2px 4px;
  text-align: center;
}

.product-empty {
  padding: 20px;
}

/* 主内容区（配置区+描述区） */
.main-content {
  margin-top: 20px;
}

/* 配置区 */
.config-section {
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.config-section :deep(.el-card__header) {
  background: #fafafa;
  border-bottom: 1px solid #e4e7ed;
  padding: 12px 20px;
}

.config-section :deep(.el-card__body) {
  padding: 20px;
}

.full-width {
  width: 100%;
}

.role-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 描述区 */
.prompt-section {
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.prompt-section :deep(.el-card__header) {
  background: #fafafa;
  border-bottom: 1px solid #e4e7ed;
  padding: 12px 20px;
}

.prompt-section :deep(.el-card__body) {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.prompt-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.prompt-input {
  flex: 1;
  margin-bottom: 16px;
}

.prompt-input :deep(.el-textarea__inner) {
  min-height: 200px !important;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}

.model-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-label {
  font-size: 14px;
  color: #606266;
  white-space: nowrap;
}

.model-select {
  width: 180px;
}

.generate-btn {
  margin-left: auto;
}

/* 角色管理弹层 */
.role-manager {
  min-height: 400px;
}

/* 角色卡片网格布局 */
.role-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  padding: 16px 0;
}

.role-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;
  background: white;
}

.role-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.role-card-image {
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.role-image-count {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.role-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.role-image-placeholder {
  font-size: 48px;
  color: #c0c4cc;
}

.role-card-info {
  padding: 12px;
}

.role-card-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-card-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.role-empty {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

/* 参考图上传 */
.reference-uploader {
  width: 150px;
  height: 150px;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.reference-uploader:hover {
  border-color: #409eff;
}

.reference-uploader-icon {
  font-size: 28px;
  color: #8c939d;
}

.reference-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

/* 商品选择器 */
.product-selector {
  min-height: 400px;
}

.selector-search {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.search-input {
  flex: 1;
}

.shop-filter {
  width: 200px;
}

.product-table {
  width: 100%;
  cursor: pointer;
}

.product-thumb {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 4px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

/* 响应式 */
@media (max-width: 768px) {
  .ai-maker-container {
    padding: 12px;
  }

  .page-title {
    font-size: 20px;
  }

  .product-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .product-media {
    width: 100%;
  }

  .action-bar {
    flex-direction: column;
    gap: 12px;
  }

  .model-selector {
    width: 100%;
  }

  .model-select {
    flex: 1;
  }

  .generate-btn {
    width: 100%;
    margin-left: 0;
  }
}
</style>
