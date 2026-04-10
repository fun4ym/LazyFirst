<template>
  <div class="dashboard">
    <!-- BD用户选择器和日期选择器 -->
    <div class="bd-selector">
      <span class="selector-label">选择BD：</span>
      <el-select
        v-model="selectedBDId"
        placeholder="请选择BD用户"
        @change="handleBDChange"
        style="width: 250px"
      >
        <el-option label="全部（团队）" value="" />
        <el-option label="未分配" value="unassigned" />
        <el-option
          v-for="bd in bdUsers"
          :key="bd._id"
          :label="bd.realName || bd.username"
          :value="bd._id"
        />
      </el-select>
      <span class="selector-label" style="margin-left: 20px;">统计日期：</span>
      <el-date-picker
        v-model="selectedDate"
        type="date"
        placeholder="选择日期"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        :disabled-date="disabledFutureDate"
        style="width: 180px"
        @change="handleDateChange"
      />
    </div>

    <!-- BD数据概览 -->
    <template v-if="bdStats">
      <!-- 统计日期提示 -->
      <div class="stats-date-info">
        <el-icon class="date-icon"><Calendar /></el-icon>
        <span>{{ $t('dashboard.currentStats') }}：{{ formatDate(bdStats.statsDate) }}</span>
      </div>

      <!-- 数据卡片 -->
      <el-row :gutter="20" class="stat-cards-row">
        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-item">
              <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <el-icon><Box /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ bdStats.yesterdayStats.sampleCount }}</div>
                <div class="stat-label">{{ $t('dashboard.sampleCount') }}</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-item">
              <div class="stat-icon" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">
                <el-icon><ShoppingCart /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ bdStats.yesterdayStats.orderCount }}</div>
                <div class="stat-label">{{ $t('dashboard.orderCount') }}</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-item">
              <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                <el-icon><Money /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">฿{{ formatMoney(bdStats.yesterdayCommission?.estimated || 0) }}</div>
                <div class="stat-label">{{ $t('dashboard.yesterdayCommission') }}</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-item">
              <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                <el-icon><Money /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">฿{{ formatMoney(bdStats.monthlyCommission.estimated) }}</div>
                <div class="stat-label">{{ $t('dashboard.monthCommission') }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 占比饼图 -->
      <el-row :gutter="20" class="pie-charts-row">
        <el-col :span="12">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header-title">
                <span>{{ $t('dashboard.samplePercentage') }}</span>
              </div>
            </template>
            <div class="pie-chart-container">
              <pie-chart
                :data="samplePieData"
                :percentage="bdStats.percentage.sample"
                :label="$t('dashboard.sampleCount')"
              />
              <div class="team-info">
                <p>个人: {{ bdStats.yesterdayStats.sampleCount }} 条</p>
                <p>团队: {{ bdStats.teamStats.sampleCount }} 条</p>
                <p>占比: {{ bdStats.percentage.sample }}%</p>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="12">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header-title">
                <span>订单数团队占比</span>
              </div>
            </template>
            <div class="pie-chart-container">
              <pie-chart
                :data="orderPieData"
                :percentage="bdStats.percentage.order"
                label="订单数"
              />
              <div class="team-info">
                <p>个人: {{ bdStats.yesterdayStats.orderCount }} 单</p>
                <p>团队: {{ bdStats.teamStats.orderCount }} 单</p>
                <p>占比: {{ bdStats.percentage.order }}%</p>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 趋势图表 -->
      <el-row :gutter="20" class="trend-charts-row">
        <el-col :span="24">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header-with-controls">
                <div class="card-header-title">
                  <span>{{ $t('dashboard.sampleTrend') }}</span>
                </div>
                <el-radio-group v-model="sampleTrendRange" size="default">
                  <el-radio-button value="7days">{{ $t('dashboard.day7') }}</el-radio-button>
                  <el-radio-button value="14days">{{ $t('dashboard.day14') }}</el-radio-button>
                  <el-radio-button value="30days">30天</el-radio-button>
                  <el-radio-button value="monthly">{{ $t('dashboard.naturalMonth') }}</el-radio-button>
                </el-radio-group>
              </div>
            </template>
            <trend-chart
              :data="sampleTrendData"
              :dates="sampleTrendDates"
              type="sample"
            />
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="trend-charts-row">
        <el-col :span="24">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header-with-controls">
                <div class="card-header-title">
                  <span>{{ $t('dashboard.orderTrend') }}</span>
                </div>
                <el-radio-group v-model="orderTrendRange" size="default">
                  <el-radio-button value="7days">{{ $t('dashboard.day7') }}</el-radio-button>
                  <el-radio-button value="14days">{{ $t('dashboard.day14') }}</el-radio-button>
                  <el-radio-button value="30days">30天</el-radio-button>
                  <el-radio-button value="monthly">{{ $t('dashboard.naturalMonth') }}</el-radio-button>
                </el-radio-group>
              </div>
            </template>
            <trend-chart
              :data="orderTrendData"
              :dates="orderTrendDates"
              type="order"
            />
          </el-card>
        </el-col>
      </el-row>

      <!-- 近一周成单列表 -->
      <el-row :gutter="20" class="recent-orders-row">
        <el-col :span="24">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header-with-tag">
                <div class="card-header-title">
                  <span>{{ $t('dashboard.recentOrders') }} ({{ $t('dashboard.recentOrderCount', { total: bdStats.recentOrders.total }) }})</span>
                </div>
                <el-tag type="success" size="default">{{ bdStats.user.name }}</el-tag>
              </div>
            </template>
            <el-table :data="bdStats.recentOrders.list" border stripe>
              <el-table-column prop="orderId" :label="$t('dashboard.orderId')" width="200" />
              <el-table-column prop="influencer" :label="$t('order.influencer')" width="180" />
              <el-table-column prop="product" :label="$t('order.product')" />
              <el-table-column :label="$t('order.createTime')" width="180">
                <template #default="{ row }">
                  {{ formatDate(row.createTime) }}
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-if="bdStats.recentOrders.list.length === 0" :description="$t('dashboard.noData')" />
          </el-card>
        </el-col>
      </el-row>
    </template>

    <!-- 未选择BD提示 -->
    <template v-else>
      <el-card>
        <el-empty description="请选择BD用户查看数据" />
      </el-card>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineComponent, h, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import request from '@/utils/request'
import AuthManager from '@/utils/auth'
import { Box, ShoppingCart, Money, Calendar } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// 日期选择 - 默认前一天
const getDefaultDate = () => {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return date
}
const selectedDate = ref(getDefaultDate())

const selectedBDId = ref('')
const bdUsers = ref([])
const bdStats = ref(null)
const sampleTrendRange = ref('7days')
const orderTrendRange = ref('7days')

// 加载BD用户列表
const loadBDUsers = async () => {
  if (!AuthManager.hasPermission('users:read')) {
    console.log('无users:read权限，跳过加载BD用户')
    return
  }
  try {
    // 先查角色列表，找到BD角色的ID
    const rolesRes = await request.get('/roles', {
      params: { limit: 100 }
    })
    const roles = rolesRes.data || rolesRes.roles || []
    const bdRole = roles.find(r => r.name === 'BD')
    
    if (!bdRole) {
      console.error('未找到BD角色')
      bdUsers.value = []
      return
    }
    
    // 再用BD角色ID查询用户
    const res = await request.get('/users', {
      params: {
        roleId: bdRole._id,
        status: 'active'
      }
    })
    bdUsers.value = res.data || res.users || []
  } catch (error) {
    console.error('加载BD用户列表失败:', error)
  }
}

const handleBDChange = () => {
  console.log('[BDDashboard] handleBDChange, selectedBDId:', selectedBDId.value)
  if (selectedBDId.value === 'unassigned') {
    loadBDStats(null, 'unassigned')
  } else if (selectedBDId.value) {
    loadBDStats(selectedBDId.value)
  } else {
    // 全部（团队）数据
    loadBDStats(null, 'all')
  }
}

const handleDateChange = () => {
  console.log('[BDDashboard] handleDateChange, selectedDate:', selectedDate.value)
  // 日期改变时重新加载数据
  if (selectedBDId.value === 'unassigned') {
    loadBDStats(null, 'unassigned')
  } else if (selectedBDId.value) {
    loadBDStats(selectedBDId.value)
  } else {
    loadBDStats(null, 'all')
  }
}

// 禁用未来日期
const disabledFutureDate = (time) => {
  return time.getTime() > Date.now()
}

const sampleTrendData = computed(() => {
  if (!bdStats.value?.trendStats) return []
  const key = sampleTrendRange.value
  const dataKey = key === '7days' ? 'samples7Days' : key === '14days' ? 'samples14Days' : key === '30days' ? 'samples30Days' : 'samplesMonthly'
  const trendData = bdStats.value.trendStats[dataKey]
  return [
    { name: '个人', data: trendData?.user || [], type: 'line', itemStyle: { color: '#7b1fa2' } },
    { name: '团队', data: trendData?.team || [], type: 'bar', itemStyle: { color: '#e8e4ef' } }
  ]
})

const sampleTrendDates = computed(() => {
  if (!bdStats.value?.trendStats) return []
  const key = sampleTrendRange.value
  const dataKey = key === '7days' ? 'samples7Days' : key === '14days' ? 'samples14Days' : key === '30days' ? 'samples30Days' : 'samplesMonthly'
  return bdStats.value.trendStats[dataKey]?.dates || []
})

const orderTrendData = computed(() => {
  if (!bdStats.value?.trendStats) return []
  const key = orderTrendRange.value
  const dataKey = key === '7days' ? 'orders7Days' : key === '14days' ? 'orders14Days' : key === '30days' ? 'orders30Days' : 'ordersMonthly'
  const trendData = bdStats.value.trendStats[dataKey]
  return [
    { name: '个人', data: trendData?.user || [], type: 'line', itemStyle: { color: '#0288d1' } },
    { name: '团队', data: trendData?.team || [], type: 'bar', itemStyle: { color: '#e3f2fd' } }
  ]
})

const orderTrendDates = computed(() => {
  if (!bdStats.value?.trendStats) return []
  const key = orderTrendRange.value
  const dataKey = key === '7days' ? 'orders7Days' : key === '14days' ? 'orders14Days' : key === '30days' ? 'orders30Days' : 'ordersMonthly'
  return bdStats.value.trendStats[dataKey]?.dates || []
})

const samplePieData = computed(() => {
  if (!bdStats.value) return []
  const user = bdStats.value.yesterdayStats.sampleCount
  const team = bdStats.value.teamStats.sampleCount
  const others = Math.max(0, team - user)
  return [
    { name: '个人', value: user, itemStyle: { color: '#7b1fa2' } },
    { name: '团队其他', value: others, itemStyle: { color: '#e8e4ef' } }
  ]
})

const orderPieData = computed(() => {
  if (!bdStats.value) return []
  const user = bdStats.value.yesterdayStats.orderCount
  const team = bdStats.value.teamStats.orderCount
  const others = Math.max(0, team - user)
  return [
    { name: '个人', value: user, itemStyle: { color: '#0288d1' } },
    { name: '团队其他', value: others, itemStyle: { color: '#e8e4ef' } }
  ]
})

const formatMoney = (value) => {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const formatDate = (date) => {
  if (!date) return '--'
  const d = new Date(date)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${month}/${day}`
}

const loadBDStats = async (userId, special) => {
  try {
    const params = {}
    if (special === 'unassigned') {
      params.special = 'unassigned'
    } else if (special === 'all') {
      // 全部数据 - 调用当前登录用户（需要是BD角色）
      // 不传userId，让后端使用当前登录用户
    } else if (userId) {
      params.userId = userId
    }
    // 添加日期参数
    if (selectedDate.value) {
      const dateStr = selectedDate.value
      if (typeof dateStr === 'object') {
        params.date = `${dateStr.getFullYear()}-${String(dateStr.getMonth() + 1).padStart(2, '0')}-${String(dateStr.getDate()).padStart(2, '0')}`
      } else {
        params.date = dateStr
      }
    }
    console.log('[BDDashboard] loadBDStats params:', params)
    const res = await request.get('/dashboard/bd-stats', { params })
    console.log('[BDDashboard] loadBDStats response:', res)
    bdStats.value = res.data || res
  } catch (error) {
    console.error('Load BD stats error:', error)
    if (error.response?.status === 403) {
      // 如果当前用户不是BD，可能无法查看团队数据
      ElMessage.warning('当前用户无权限查看此数据')
    } else {
      ElMessage.error('加载数据概览失败')
    }
  }
}

// 饼图组件
const PieChart = defineComponent({
  name: 'PieChart',
  props: {
    data: {
      type: Array,
      required: true
    },
    percentage: {
      type: Number,
      required: true
    },
    label: {
      type: String,
      default: '占比'
    }
  },
  setup(props) {
    const chartRef = ref(null)
    let chartInstance = null

    const updateChart = () => {
      if (!chartRef.value) return
      import('echarts').then(echarts => {
        if (!chartInstance) {
          chartInstance = echarts.init(chartRef.value)
        }
        chartInstance.setOption({
          series: [
            {
              type: 'pie',
              radius: ['40%', '70%'],
              avoidLabelOverlap: false,
              label: {
                show: true,
                position: 'center',
                formatter: '{b}\n{d}%',
                fontSize: 16,
                fontWeight: 'bold'
              },
              emphasis: {
                label: {
                  show: true
                }
              },
              labelLine: {
                show: false
              },
              data: props.data
            }
          ]
        })
      })
    }

    onMounted(() => {
      updateChart()
    })

    watch(() => props.data, () => {
      updateChart()
    })

    return () => h('div', { ref: chartRef, style: { width: '200px', height: '200px' } })
  }
})

// 趋势图组件
const TrendChart = defineComponent({
  name: 'TrendChart',
  props: {
    data: {
      type: Array,
      required: true
    },
    dates: {
      type: Array,
      required: true
    },
    type: {
      type: String,
      default: 'sample'
    }
  },
  setup(props) {
    const chartRef = ref(null)
    let chartInstance = null

    const updateChart = (echarts) => {
      if (!chartRef.value) return

      if (!chartInstance) {
        chartInstance = echarts.init(chartRef.value)
      }

      const color = props.type === 'sample' ? '#7b1fa2' : '#0288d1'

      const series = props.data.map(item => ({
        name: item.name,
        type: item.type,
        data: item.data,
        itemStyle: { color: item.itemStyle?.color || color },
        lineStyle: { width: 3 },
        symbol: 'circle',
        symbolSize: 6
      }))

      chartInstance.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          }
        },
        legend: {
          data: props.data.map(d => d.name),
          top: 10
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '50px',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: props.dates,
          axisLabel: {
            rotate: 45
          }
        },
        yAxis: {
          type: 'value',
          name: props.type === 'sample' ? '申样数' : '订单数'
        },
        series: series
      }, { notMerge: false })
    }

    onMounted(() => {
      import('echarts').then(echarts => {
        updateChart(echarts)
      })
    })

    watch([() => props.data, () => props.dates], () => {
      import('echarts').then(echarts => {
        updateChart(echarts)
      })
    }, { deep: true })

    return () => h('div', { ref: chartRef, style: { width: '100%', height: '400px' } })
  }
})

onMounted(() => {
  loadBDUsers()
  // 默认加载全部（团队）数据
  loadBDStats(null, 'all')
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.bd-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}

.selector-label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
}

.stats-date-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  background: linear-gradient(135deg, #e8ecef 0%, #d4d8e0 100%);
  border-radius: 12px;
  margin-bottom: 20px;
  color: #2c3e50;
  font-size: 15px;
  font-weight: 600;
  border: 1px solid #d0d4dc;
}

.date-icon {
  font-size: 18px;
  color: #546e7a;
}

.stat-card {
  border-radius: 12px;
  border: 1px solid #e8ecef;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.12);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 24px 20px;
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 6px;
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.stat-label {
  font-size: 13px;
  color: #6c757d;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.pie-chart-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40px;
  padding: 28px 20px;
}

.team-info {
  text-align: left;
  min-width: 160px;
}

.team-info p {
  margin: 12px 0;
  font-size: 14px;
  color: #495057;
  font-weight: 500;
}

.team-info p:last-child {
  font-size: 22px;
  font-weight: 700;
  color: #667eea;
  margin-top: 18px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

::deep(.el-card__header) {
  border-bottom: 1px solid #e8ecef;
  padding: 18px 22px;
  font-weight: 600;
  color: #2c3e50;
}

::deep(.el-card__body) {
  padding: 0;
}

.stat-cards-row, .pie-charts-row, .trend-charts-row, .recent-orders-row {
  margin-bottom: 20px;
}

.card-header-title {
  font-size: 15px;
  font-weight: 600;
  color: #2c3e50;
}

.card-header-with-controls, .card-header-with-tag {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

::deep(.el-radio-group) {
  display: flex;
  gap: 4px;
}

::deep(.el-radio-button__inner) {
  border-radius: 6px;
  font-weight: 500;
  font-size: 13px;
}

::deep(.el-tag) {
  font-weight: 600;
  font-size: 13px;
}

::deep(.el-table) {
  font-size: 13px;
}

::deep(.el-table th) {
  font-weight: 600;
  color: #2c3e50;
}
</style>
