<template>
  <div class="product-stats">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>商品统计</h2>
      <p class="page-description">查看商品成交数据、申样统计和多维度排行分析</p>
    </div>

    <!-- 时间筛选区域 -->
    <el-card class="filter-card" shadow="hover">
      <div class="filter-section">
        <div class="filter-row">
          <div class="filter-item">
            <label>时间范围</label>
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 280px"
            />
          </div>
          <div class="filter-item">
            <label>快捷选择</label>
            <el-radio-group v-model="quickDate" @change="handleQuickDate">
              <el-radio-button value="thisWeek">本周</el-radio-button>
              <el-radio-button value="thisMonth">本月</el-radio-button>
              <el-radio-button value="thisQuarter">本季度</el-radio-button>
              <el-radio-button value="lastMonth">上月</el-radio-button>
            </el-radio-group>
          </div>
          <div class="filter-actions">
            <el-button type="primary" @click="handleSearch" :loading="loading">
              <el-icon><Search /></el-icon>查询
            </el-button>
            <el-button @click="handleReset">
              <el-icon><RefreshLeft /></el-icon>重置
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 统计Tab切换 -->
    <el-card class="stats-card" shadow="hover" style="margin-top: 20px">
      <el-tabs v-model="activeTab" class="stats-tabs">
        <!-- Tab 1: 成交量统计 -->
        <el-tab-pane label="成交量统计" name="orders">
          <template #label>
            <span class="tab-label">
              <el-icon><ShoppingCart /></el-icon>
              成交量统计
            </span>
          </template>

          <!-- 概览数据卡片 -->
          <el-row :gutter="20" class="overview-cards">
            <el-col :span="6">
              <div class="overview-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
                <div class="overview-icon">
                  <el-icon><Document /></el-icon>
                </div>
                <div class="overview-content">
                  <div class="overview-value">{{ orderOverview.totalOrders }}</div>
                  <div class="overview-label">总订单数</div>
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="overview-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
                <div class="overview-icon">
                  <el-icon><Money /></el-icon>
                </div>
                <div class="overview-content">
                  <div class="overview-value">${{ formatMoney(orderOverview.totalGMV) }}</div>
                  <div class="overview-label">总GMV</div>
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="overview-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
                <div class="overview-icon">
                  <el-icon><User /></el-icon>
                </div>
                <div class="overview-content">
                  <div class="overview-value">{{ orderOverview.totalProducts }}</div>
                  <div class="overview-label">成交商品数</div>
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="overview-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)">
                <div class="overview-icon">
                  <el-icon><TrendCharts /></el-icon>
                </div>
                <div class="overview-content">
                  <div class="overview-value">${{ formatMoney(orderOverview.avgOrderValue) }}</div>
                  <div class="overview-label">平均客单价</div>
                </div>
              </div>
            </el-col>
          </el-row>

          <!-- 商品成交排行 -->
          <el-row :gutter="20" style="margin-top: 20px">
            <el-col :span="24">
              <el-card shadow="never">
                <template #header>
                  <div class="section-header">
                    <span>商品成交排行（按订单数）</span>
                    <span class="section-hint">点击商品行查看订单构成详情</span>
                  </div>
                </template>
                <el-table 
                  :data="productOrderRanking" 
                  border 
                  stripe 
                  highlight-current-row 
                  @row-click="handleProductClick"
                  v-loading="loading"
                >
                  <el-table-column type="index" label="排名" width="60" align="center" />
                  <el-table-column label="商品信息" min-width="300">
                    <template #default="{ row }">
                      <div style="display: flex; align-items: center; gap: 10px">
                        <el-avatar 
                          :src="row.productImage || '/default-product.png'" 
                          :size="50" 
                          shape="square"
                          style="flex-shrink: 0"
                        >
                          {{ (row.productName || '').charAt(0) }}
                        </el-avatar>
                        <div style="flex: 1; min-width: 0">
                          <div style="font-size: 12px; color: #999; margin-bottom: 4px">
                            ID: {{ row.productId || row._id || '-' }}
                          </div>
                          <el-tooltip 
                            :content="row.productName || '-'" 
                            placement="top-start"
                            :show-after="500"
                            :hide-after="0"
                          >
                            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer">
                              {{ row.productName || '-' }}
                            </div>
                          </el-tooltip>
                        </div>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column prop="orderCount" label="订单数" width="120" align="center" sortable />
                  <el-table-column prop="gmv" label="GMV" width="140" align="right" sortable>
                    <template #default="{ row }">
                      ${{ formatMoney(row.gmv) }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="bdCount" label="参与BD数" width="120" align="center">
                    <template #default="{ row }">
                      <el-tag size="small" type="info">{{ row.bdCount }} 人</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="influencerCount" label="带货达人数" width="120" align="center">
                    <template #default="{ row }">
                      <el-tag size="small" type="success">{{ row.influencerCount }} 人</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="100" align="center" fixed="right">
                    <template #default="{ row }">
                      <el-button type="primary" link size="small" @click.stop="handleProductClick(row)">
                        查看构成
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </el-card>
            </el-col>
          </el-row>

          <!-- 商品订单构成弹窗 -->
          <el-dialog 
            v-model="productDetailVisible" 
            :title="`订单构成 - ${selectedProduct?.productName || ''}`" 
            width="800px"
          >
            <div v-if="selectedProduct" class="product-detail-content">
              <div class="detail-summary">
                <el-tag size="large" type="primary">总订单数：{{ selectedProduct.orderCount }}</el-tag>
                <el-tag size="large" type="success" style="margin-left: 12px">总GMV：${{ formatMoney(selectedProduct.gmv) }}</el-tag>
                <el-tag size="large" type="warning" style="margin-left: 12px">参与BD：{{ selectedProduct.bdCount }} 人</el-tag>
                <el-tag size="large" type="info" style="margin-left: 12px">带货达人：{{ selectedProduct.influencerCount }} 人</el-tag>
              </div>
              <el-table :data="productOrderDetail" border stripe style="margin-top: 20px" v-loading="detailLoading">
                <el-table-column type="index" label="序号" width="60" align="center" />
                <el-table-column prop="influencerName" label="达人名称" min-width="130" />
                <el-table-column prop="influencerUsername" label="用户名" width="130" />
                <el-table-column prop="bdName" label="归属BD" width="100" />
                <el-table-column prop="orderCount" label="订单数" width="100" align="center" sortable />
                <el-table-column prop="gmv" label="GMV" width="120" align="right" sortable>
                  <template #default="{ row }">
                    ${{ formatMoney(row.gmv) }}
                  </template>
                </el-table-column>
                <el-table-column prop="gmvPercent" label="GMV占比" width="100" align="center">
                  <template #default="{ row }">
                    <el-progress :percentage="row.gmvPercent" :stroke-width="8" :color="'#7b1fa2'" />
                  </template>
                </el-table-column>
              </el-table>
            </div>
            <template #footer>
              <el-button @click="productDetailVisible = false">关闭</el-button>
            </template>
          </el-dialog>

          <!-- BD贡献排行 -->
          <el-row :gutter="20" style="margin-top: 20px">
            <el-col :span="24">
              <el-card shadow="never">
                <template #header>
                  <div class="section-header">
                    <span>BD贡献排行</span>
                  </div>
                </template>
                <el-table :data="bdContribution" border stripe v-loading="loading">
                  <el-table-column type="index" label="排名" width="60" align="center" />
                  <el-table-column prop="bdName" label="BD姓名" width="120" />
                  <el-table-column prop="orderCount" label="订单数" width="120" align="center" sortable />
                  <el-table-column prop="gmv" label="GMV" width="140" align="right" sortable>
                    <template #default="{ row }">
                      ${{ formatMoney(row.gmv) }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="productCount" label="成交商品数" width="120" align="center" />
                  <el-table-column prop="influencerCount" label="管理达人数" width="120" align="center" />
                  <el-table-column prop="gmvPercent" label="GMV占比" min-width="200">
                    <template #default="{ row }">
                      <el-progress :percentage="row.gmvPercent" :stroke-width="10" :color="'#7b1fa2'" />
                    </template>
                  </el-table-column>
                </el-table>
              </el-card>
            </el-col>
          </el-row>

          <!-- 达人销售排行 -->
          <el-row :gutter="20" style="margin-top: 20px">
            <el-col :span="24">
              <el-card shadow="never">
                <template #header>
                  <div class="section-header">
                    <span>达人销售排行</span>
                  </div>
                </template>
                <el-table :data="influencerRanking" border stripe v-loading="loading">
                  <el-table-column type="index" label="排名" width="60" align="center" />
                  <el-table-column prop="influencerName" label="达人名称" min-width="120" />
                  <el-table-column prop="username" label="用户名" width="130" />
                  <el-table-column prop="orderCount" label="订单数" width="100" align="center" sortable />
                  <el-table-column prop="gmv" label="GMV" width="140" align="right" sortable>
                    <template #default="{ row }">
                      ${{ formatMoney(row.gmv) }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="productCount" label="带货商品数" width="110" align="center" />
                  <el-table-column prop="bdName" label="对接BD" width="100" />
                </el-table>
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>

        <!-- Tab 2: 申样统计 -->
        <el-tab-pane label="申样统计" name="samples">
          <template #label>
            <span class="tab-label">
              <el-icon><Box /></el-icon>
              申样统计
            </span>
          </template>

          <!-- 概览数据卡片 -->
          <el-row :gutter="20" class="overview-cards">
            <el-col :span="6">
              <div class="overview-card" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%)">
                <div class="overview-icon">
                  <el-icon><DocumentCopy /></el-icon>
                </div>
                <div class="overview-content">
                  <div class="overview-value">{{ sampleOverview.totalApplications }}</div>
                  <div class="overview-label">总申样数</div>
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="overview-card" style="background: linear-gradient(135deg, #30cfd0 0%, #330867 100%)">
                <div class="overview-icon">
                  <el-icon><Promotion /></el-icon>
                </div>
                <div class="overview-content">
                  <div class="overview-value">{{ sampleOverview.totalShipped }}</div>
                  <div class="overview-label">总寄出数</div>
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="overview-card" style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)">
                <div class="overview-icon" style="color: #666">
                  <el-icon><DataLine /></el-icon>
                </div>
                <div class="overview-content">
                  <div class="overview-value" style="color: #333">{{ sampleOverview.avgSampleRate }}%</div>
                  <div class="overview-label" style="color: #666">平均申样率</div>
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="overview-card" style="background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)">
                <div class="overview-icon">
                  <el-icon><Goods /></el-icon>
                </div>
                <div class="overview-content">
                  <div class="overview-value">{{ sampleOverview.totalProducts }}</div>
                  <div class="overview-label">申样商品数</div>
                </div>
              </div>
            </el-col>
          </el-row>

          <!-- 商品申样统计 -->
          <el-row :gutter="20" style="margin-top: 20px">
            <el-col :span="24">
              <el-card shadow="never">
                <template #header>
                  <div class="section-header">
                    <span>商品申样统计</span>
                  </div>
                </template>
                <el-table :data="productSampleStats" border stripe max-height="500" v-loading="loading">
                  <el-table-column type="index" label="排名" width="60" align="center" />
                  <el-table-column label="商品信息" min-width="300">
                    <template #default="{ row }">
                      <div style="display: flex; align-items: center; gap: 10px">
                        <el-avatar 
                          :src="row.productImage || '/default-product.png'" 
                          :size="50" 
                          shape="square"
                          style="flex-shrink: 0"
                        >
                          {{ (row.productName || '').charAt(0) }}
                        </el-avatar>
                        <div style="flex: 1; min-width: 0">
                          <div style="font-size: 12px; color: #999; margin-bottom: 4px">
                            ID: {{ row.productId || row._id || '-' }}
                          </div>
                          <el-tooltip 
                            :content="row.productName || '-'" 
                            placement="top-start"
                            :show-after="500"
                            :hide-after="0"
                          >
                            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer">
                              {{ row.productName || '-' }}
                            </div>
                          </el-tooltip>
                        </div>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column prop="applicationCount" label="申样数" width="100" align="center" sortable />
                  <el-table-column prop="shippedCount" label="寄出数" width="100" align="center" sortable />
                  <el-table-column prop="sampleRate" label="申样率" width="100" align="center" sortable>
                    <template #default="{ row }">
                      <el-tag :type="getSampleRateType(row.sampleRate)">
                        {{ row.sampleRate }}%
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="bdCount" label="参与BD数" width="100" align="center">
                    <template #default="{ row }">
                      <el-tag size="small" type="info">{{ row.bdCount }} 人</el-tag>
                    </template>
                  </el-table-column>
                </el-table>
              </el-card>
            </el-col>
          </el-row>

          <!-- BD申样统计 -->
          <el-row :gutter="20" style="margin-top: 20px">
            <el-col :span="24">
              <el-card shadow="never">
                <template #header>
                  <div class="section-header">
                    <span>BD申样统计</span>
                  </div>
                </template>
                <el-table :data="bdSampleStats" border stripe max-height="500" v-loading="loading">
                  <el-table-column type="index" label="排名" width="60" align="center" />
                  <el-table-column prop="bdName" label="BD姓名" min-width="100" />
                  <el-table-column prop="applicationCount" label="申样数" width="100" align="center" sortable />
                  <el-table-column prop="shippedCount" label="寄出数" width="100" align="center" sortable />
                  <el-table-column prop="sampleRate" label="申样率" width="100" align="center" sortable>
                    <template #default="{ row }">
                      <el-tag :type="getSampleRateType(row.sampleRate)">
                        {{ row.sampleRate }}%
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="productCount" label="申样商品数" width="110" align="center" />
                </el-table>
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import {
  Search,
  RefreshLeft,
  ShoppingCart,
  Document,
  Money,
  User,
  TrendCharts,
  Box,
  DocumentCopy,
  Promotion,
  DataLine,
  Goods
} from '@element-plus/icons-vue'

// 时间筛选
const dateRange = ref([])
const quickDate = ref('thisMonth')
const activeTab = ref('orders')

// 商品详情弹窗
const productDetailVisible = ref(false)
const selectedProduct = ref(null)
const productOrderDetail = ref([])

// 加载状态
const loading = ref(false)
const detailLoading = ref(false)

// 数据 - 订单概览
const orderOverview = ref({
  totalOrders: 0,
  totalGMV: 0,
  totalProducts: 0,
  avgOrderValue: 0
})

// 数据 - 商品成交排行
const productOrderRanking = ref([])

// 数据 - BD贡献排行
const bdContribution = ref([])

// 数据 - 达人销售排行
const influencerRanking = ref([])

// 数据 - 申样概览
const sampleOverview = ref({
  totalApplications: 0,
  totalShipped: 0,
  avgSampleRate: 0,
  totalProducts: 0
})

// 数据 - 商品申样统计
const productSampleStats = ref([])

// 数据 - BD申样统计
const bdSampleStats = ref([])

// 获取companyId
const getCompanyId = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  // 兼容不同格式：companyId 可能是字符串或对象
  if (user.companyId) {
    // 如果是对象（populate），取 _id
    if (typeof user.companyId === 'object' && user.companyId._id) {
      return user.companyId._id
    }
    // 如果是字符串或ObjectId
    return user.companyId.toString()
  }
  // 兼容 company 字段
  if (user.company) {
    if (typeof user.company === 'object' && user.company._id) {
      return user.company._id
    }
    return user.company.toString()
  }
  return ''
}

// 快捷日期选择
const handleQuickDate = (value) => {
  const now = new Date()
  let start, end
  
  switch (value) {
    case 'thisWeek':
      const day = now.getDay() || 7
      start = new Date(now.setDate(now.getDate() - day + 1))
      end = new Date()
      break
    case 'thisMonth':
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date()
      break
    case 'thisQuarter':
      const quarter = Math.floor(now.getMonth() / 3)
      start = new Date(now.getFullYear(), quarter * 3, 1)
      end = new Date()
      break
    case 'lastMonth':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      end = new Date(now.getFullYear(), now.getMonth(), 0)
      break
  }
  
  dateRange.value = [
    start.toISOString().split('T')[0],
    end.toISOString().split('T')[0]
  ]
}

// 获取日期参数
const getDateParams = () => {
  if (dateRange.value && dateRange.value.length === 2) {
    return {
      startDate: dateRange.value[0],
      endDate: dateRange.value[1]
    }
  }
  return {}
}

// 查询概览数据
const fetchOverview = async () => {
  try {
    const companyId = getCompanyId()
    if (!companyId) {
      ElMessage.error('未获取到公司信息')
      return
    }
    
    const params = { companyId, ...getDateParams() }
    const res = await request.get('/product-stats/overview', { params })
    
    if (res && res.orders) {
      orderOverview.value = {
        totalOrders: res.orders.totalOrders || 0,
        totalGMV: res.orders.totalGMV || 0,
        totalProducts: res.orders.totalProducts || 0,
        avgOrderValue: res.orders.avgOrderValue || 0
      }
    }
    
    if (res && res.samples) {
      sampleOverview.value = {
        totalApplications: res.samples.totalApplications || 0,
        totalShipped: res.samples.totalShipped || 0,
        avgSampleRate: res.samples.avgSampleRate || 0,
        totalProducts: res.samples.totalProducts || 0
      }
    }
  } catch (error) {
    console.error('获取概览数据失败:', error)
    ElMessage.error('获取概览数据失败')
  }
}

// 查询商品成交排行
const fetchProductRanking = async () => {
  try {
    const companyId = getCompanyId()
    if (!companyId) return
    
    const params = { companyId, ...getDateParams(), sortBy: 'orderCount' }
    const res = await request.get('/product-stats/product-ranking', { params })
    
    if (Array.isArray(res)) {
      productOrderRanking.value = res.map(item => ({
        ...item,
        gmv: item.gmv || 0,
        orderCount: item.orderCount || 0
      }))
    }
  } catch (error) {
    console.error('获取商品成交排行失败:', error)
    ElMessage.error('获取商品成交排行失败')
  }
}

// 查询BD贡献排行
const fetchBdRanking = async () => {
  try {
    const companyId = getCompanyId()
    if (!companyId) return
    
    const params = { companyId, ...getDateParams() }
    const res = await request.get('/product-stats/bd-ranking', { params })
    
    if (Array.isArray(res)) {
      bdContribution.value = res.map(item => ({
        ...item,
        gmv: item.gmv || 0,
        orderCount: item.orderCount || 0,
        gmvPercent: item.gmvPercent || 0
      }))
    }
  } catch (error) {
    console.error('获取BD贡献排行失败:', error)
    ElMessage.error('获取BD贡献排行失败')
  }
}

// 查询达人销售排行
const fetchInfluencerRanking = async () => {
  try {
    const companyId = getCompanyId()
    if (!companyId) return
    
    const params = { companyId, ...getDateParams() }
    const res = await request.get('/product-stats/influencer-ranking', { params })
    
    if (Array.isArray(res)) {
      influencerRanking.value = res.map(item => ({
        ...item,
        gmv: item.gmv || 0,
        orderCount: item.orderCount || 0
      }))
    }
  } catch (error) {
    console.error('获取达人销售排行失败:', error)
    ElMessage.error('获取达人销售排行失败')
  }
}

// 查询申样统计
const fetchSampleStats = async () => {
  try {
    const companyId = getCompanyId()
    if (!companyId) return
    
    const params = { companyId, ...getDateParams() }
    const res = await request.get('/product-stats/sample-stats', { params })
    
    if (res && res.productStats) {
      productSampleStats.value = res.productStats
    }
    
    if (res && res.bdStats) {
      bdSampleStats.value = res.bdStats
    }
  } catch (error) {
    console.error('获取申样统计失败:', error)
    ElMessage.error('获取申样统计失败')
  }
}

// 查询
const handleSearch = async () => {
  loading.value = true
  try {
    await Promise.all([
      fetchOverview(),
      fetchProductRanking(),
      fetchBdRanking(),
      fetchInfluencerRanking(),
      fetchSampleStats()
    ])
    ElMessage.success('查询成功')
  } catch (error) {
    ElMessage.error('查询失败')
  } finally {
    loading.value = false
  }
}

// 重置
const handleReset = () => {
  dateRange.value = []
  quickDate.value = 'thisMonth'
  handleQuickDate('thisMonth')
  handleSearch()
}

// 点击商品查看订单构成
const handleProductClick = async (row) => {
  selectedProduct.value = row
  productDetailVisible.value = true
  detailLoading.value = true
  
  try {
    const companyId = getCompanyId()
    if (!companyId) return
    
    // 使用productId（TikTok商品ID）查询
    const params = { 
      companyId, 
      ...getDateParams(),
      productId: row.productId || row._id
    }
    
    const res = await request.get(`/product-stats/product-detail/${row.productId}`, { params })
    
    if (Array.isArray(res)) {
      productOrderDetail.value = res
    } else {
      productOrderDetail.value = []
    }
  } catch (error) {
    console.error('获取商品订单构成失败:', error)
    ElMessage.error('获取商品订单构成失败')
    productOrderDetail.value = []
  } finally {
    detailLoading.value = false
  }
}

// 格式化金额
const formatMoney = (value) => {
  if (!value && value !== 0) return '0.00'
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// 申样率标签类型
const getSampleRateType = (rate) => {
  if (rate >= 90) return 'success'
  if (rate >= 80) return ''
  if (rate >= 70) return 'warning'
  return 'danger'
}

onMounted(async () => {
  // 初始化为本月
  handleQuickDate('thisMonth')
  // 自动查询数据
  await handleSearch()
})
</script>

<style scoped>
.product-stats {
  padding: 20px;
  background: #faf5ff;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #4a148c;
  font-size: 24px;
}

.page-description {
  margin: 0;
  color: #888;
  font-size: 14px;
}

.filter-card {
  border-radius: 12px;
  border: 1px solid #e8ecef;
}

.filter-section {
  padding: 10px 0;
}

.filter-row {
  display: flex;
  align-items: flex-end;
  gap: 20px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-item label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.filter-actions {
  display: flex;
  gap: 10px;
  margin-left: auto;
  padding-bottom: 2px;
}

.stats-card {
  border-radius: 12px;
  border: 1px solid #e8ecef;
}

.stats-tabs {
  margin-top: 10px;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
}

.overview-cards {
  margin-bottom: 20px;
}

.overview-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.overview-card:hover {
  transform: translateY(-4px);
}

.overview-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.overview-content {
  flex: 1;
}

.overview-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 4px;
}

.overview-label {
  font-size: 13px;
  opacity: 0.9;
}

.section-header {
  font-size: 15px;
  font-weight: 600;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 16px;
}

.section-hint {
  font-size: 12px;
  font-weight: 400;
  color: #999;
}

.product-name-link {
  color: #7b1fa2;
  cursor: pointer;
  font-weight: 500;
}

.product-name-link:hover {
  color: #4a148c;
  text-decoration: underline;
}

/* 弹窗内商品详情样式 */
.product-detail-content {
  padding: 0;
}

.detail-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 0;
}

:deep(.el-table) {
  font-size: 13px;
}

:deep(.el-table th) {
  font-weight: 600;
  color: #2c3e50;
  background: #f8f9fa;
}

:deep(.el-card__header) {
  padding: 15px 20px;
  border-bottom: 1px solid #e8ecef;
}

:deep(.el-radio-group) {
  display: flex;
  gap: 4px;
}

:deep(.el-tabs__item) {
  font-size: 15px;
  font-weight: 500;
}

:deep(.el-tag) {
  font-weight: 600;
}
</style>
