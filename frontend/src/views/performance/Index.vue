<template>
  <div class="performance-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>业绩报表</h3>
        </div>
      </template>

      <!-- BD工作量图 -->
      <div class="chart-section">
        <div class="chart-header">
          <h4>BD工作量趋势</h4>
          <div class="chart-controls">
            <el-radio-group v-model="timeRange" @change="handleTimeRangeChange">
              <el-radio-button value="7">过去7天</el-radio-button>
              <el-radio-button value="14">过去14天</el-radio-button>
              <el-radio-button value="month">本自然月</el-radio-button>
            </el-radio-group>
            <el-date-picker
              v-model="customDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              @change="handleCustomDateChange"
              style="width: 280px; margin-left: 12px"
            />
          </div>
        </div>
        <div class="chart-container">
          <div ref="lineChartRef" style="width: 100%; height: 400px"></div>
          <div v-if="showPie" ref="pieChartRef" style="width: 100%; height: 300px; margin-top: 20px"></div>
        </div>
      </div>

      <!-- BD排名 -->
      <div class="ranking-section">
        <div class="ranking-header">
          <h4>{{ selectedDate ? selectedDate : displayDate }} BD排名</h4>
        </div>
        <el-row :gutter="20">
          <el-col :span="12">
            <div class="ranking-card">
              <h5>🏆 申样数排名</h5>
              <el-table :data="sampleRankingTop" stripe :row-class-name="getRowClassName">
                <el-table-column type="index" label="排名" width="100" align="center">
                  <template #default="{ $index }">
                    <div class="rank-badge" :class="'rank-' + ($index + 1)">
                      <span v-if="$index === 0">🥇</span>
                      <span v-else-if="$index === 1">🥈</span>
                      <span v-else-if="$index === 2">🥉</span>
                      <span v-else>{{ $index + 1 }}</span>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="salesman" label="BD">
                  <template #default="{ row }">
                    <span class="bd-name">{{ row.salesman }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="sampleCount" label="申样数" width="120" align="center">
                  <template #default="{ row }">
                    <span :class="getCountClass(row.sampleCount, true)">{{ row.sampleCount }}</span>
                  </template>
                </el-table-column>
              </el-table>
              <h5 style="margin-top: 24px; color: #999">💤 申样数后三名</h5>
              <el-table :data="sampleRankingBottom" stripe>
                <el-table-column type="index" label="排名" width="100" align="center" />
                <el-table-column prop="salesman" label="BD" />
                <el-table-column prop="sampleCount" label="申样数" width="120" align="center">
                  <template #default="{ row }">
                    <span :class="getCountClass(row.sampleCount, false)">{{ row.sampleCount }}</span>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="ranking-card">
              <h5>🏆 成单数排名</h5>
              <el-table :data="orderRankingTop" stripe>
                <el-table-column type="index" label="排名" width="100" align="center">
                  <template #default="{ $index }">
                    <div class="rank-badge" :class="'rank-' + ($index + 1)">
                      <span v-if="$index === 0">🥇</span>
                      <span v-else-if="$index === 1">🥈</span>
                      <span v-else-if="$index === 2">🥉</span>
                      <span v-else>{{ $index + 1 }}</span>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="salesman" label="BD">
                  <template #default="{ row }">
                    <span class="bd-name">{{ row.salesman }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="orderGeneratedCount" label="成单数" width="120" align="center">
                  <template #default="{ row }">
                    <span :class="getCountClass(row.orderGeneratedCount, true)">{{ row.orderGeneratedCount }}</span>
                  </template>
                </el-table-column>
              </el-table>
              <h5 style="margin-top: 24px; color: #999">💤 成单数后三名</h5>
              <el-table :data="orderRankingBottom" stripe>
                <el-table-column type="index" label="排名" width="100" align="center" />
                <el-table-column prop="salesman" label="BD" />
                <el-table-column prop="orderGeneratedCount" label="成单数" width="120" align="center">
                  <template #default="{ row }">
                    <span :class="getCountClass(row.orderGeneratedCount, false)">{{ row.orderGeneratedCount }}</span>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import request from '@/utils/request'

const lineChartRef = ref(null)
const pieChartRef = ref(null)
const timeRange = ref('7')
const customDateRange = ref(null)
const lineChartInstance = ref(null)
const pieChartInstance = ref(null)
const selectedDate = ref(null)
const showPie = ref(false)
const dailyDataMap = ref({})

const sampleRankingTop = ref([])
const sampleRankingBottom = ref([])
const orderRankingTop = ref([])
const orderRankingBottom = ref([])

const displayDate = computed(() => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toLocaleDateString('zh-CN')
})

const handleTimeRangeChange = () => {
  customDateRange.value = null
  loadChartData()
}

const handleCustomDateChange = () => {
  timeRange.value = 'custom'
  loadChartData()
}

const getDateRange = () => {
  const today = new Date()
  let startDate, endDate

  if (timeRange.value === 'custom' && customDateRange.value) {
    startDate = new Date(customDateRange.value[0])
    endDate = new Date(customDateRange.value[1])
  } else if (timeRange.value === 'month') {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1)
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  } else {
    const days = parseInt(timeRange.value)
    endDate = new Date(today)
    endDate.setDate(endDate.getDate() - 1)
    startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - days + 1)
  }

  startDate.setHours(0, 0, 0, 0)
  endDate.setHours(23, 59, 59, 999)

  return { startDate, endDate }
}

const loadChartData = async () => {
  const { startDate, endDate } = getDateRange()

  // 使用本地日期格式，避免时区问题
  const formatDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  try {
    const params = {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate)
    }

    const res = await request.get('/bd-daily', { params })
    const bdDailies = res.bdDailies || []

    console.log('原始数据示例:', bdDailies.slice(0, 3).map(d => ({ date: d.date, salesman: d.salesman })))

    // 按日期和BD分组统计
    const dailyStats = {}
    dailyDataMap.value = {}
    bdDailies.forEach(item => {
      const dateObj = new Date(item.date)
      const date = `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`
      const fullDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`

      if (!dailyStats[date]) {
        dailyStats[date] = { date, fullDate, totalSamples: 0, totalOrders: 0, byBD: {} }
      }
      dailyStats[date].totalSamples += item.sampleCount || 0
      dailyStats[date].totalOrders += item.orderGeneratedCount || 0

      if (!dailyStats[date].byBD[item.salesman]) {
        dailyStats[date].byBD[item.salesman] = { sampleCount: 0, orderCount: 0 }
      }
      dailyStats[date].byBD[item.salesman].sampleCount += item.sampleCount || 0
      dailyStats[date].byBD[item.salesman].orderCount += item.orderGeneratedCount || 0
    })

    dailyDataMap.value = dailyStats
    console.log('按日期统计结果:', Object.keys(dailyStats).length, '天')
    console.log('日期列表:', Object.keys(dailyStats))

    // 排序日期
    const sortedDates = Object.keys(dailyStats).sort((a, b) => {
      const dateA = new Date('2024/' + a)
      const dateB = new Date('2024/' + b)
      return dateA - dateB
    })

    const dates = sortedDates
    const sampleData = dates.map(d => dailyStats[d].totalSamples)
    const orderData = dates.map(d => dailyStats[d].totalOrders)

    updateLineChart(dates, sampleData, orderData, dailyStats)

    // 默认展示最新一天的饼图
    if (dates.length > 0) {
      const latestDate = dates[dates.length - 1]
      const latestDayData = dailyStats[latestDate]
      selectedDate.value = latestDayData.fullDate
      showPie.value = true

      nextTick(() => {
        if (pieChartRef.value && !pieChartInstance.value) {
          pieChartInstance.value = echarts.init(pieChartRef.value)
        }
        updatePieChart(latestDayData)
      })
    }
  } catch (error) {
    console.error('Load chart data error:', error)
  }
}

const updateLineChart = (dates, sampleData, orderData, dailyStats) => {
  if (!lineChartInstance.value) return

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['申样数', '成单数'],
      top: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      name: '数量'
    },
    series: [
      {
        name: '申样数',
        type: 'line',
        data: sampleData,
        smooth: true,
        itemStyle: {
          color: '#7b1fa2'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(123, 31, 162, 0.3)' },
              { offset: 1, color: 'rgba(123, 31, 162, 0.05)' }
            ]
          }
        }
      },
      {
        name: '成单数',
        type: 'line',
        data: orderData,
        smooth: true,
        itemStyle: {
          color: '#00bcd4'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0, 188, 212, 0.3)' },
              { offset: 1, color: 'rgba(0, 188, 212, 0.05)' }
            ]
          }
        }
      }
    ]
  }

  lineChartInstance.value.setOption(option)

  // 移除所有旧的事件监听
  lineChartInstance.value.off('showTip')
  lineChartInstance.value.off('globalout')

  // 使用 tooltip 事件
  lineChartInstance.value.getZr().off('mousemove')

  // 添加鼠标移动事件到 ZRender 层
  lineChartInstance.value.getZr().on('mousemove', (params) => {
    const pointInPixel = [params.offsetX, params.offsetY]
    if (lineChartInstance.value.containPixel('grid', pointInPixel)) {
      const pointInGrid = lineChartInstance.value.convertFromPixel('grid', pointInPixel)
      const xIndex = Math.round(pointInGrid[0])

      if (xIndex >= 0 && xIndex < dates.length) {
        const date = dates[xIndex]

        if (date && dailyStats[date]) {
          selectedDate.value = dailyStats[date].fullDate
          showPie.value = true

          nextTick(() => {
            if (pieChartRef.value && !pieChartInstance.value) {
              pieChartInstance.value = echarts.init(pieChartRef.value)
            }
            updatePieChart(dailyStats[date])
          })

          loadRankingData(dailyStats[date].fullDate)
        }
      }
    }
  })
}

const updatePieChart = (dayData) => {
  console.log('updatePieChart调用，dayData:', dayData, 'pieChartInstance.value:', pieChartInstance.value)

  if (!pieChartInstance.value || !dayData) {
    console.log('updatePieChart退出：缺少实例或数据')
    return
  }

  const { byBD } = dayData
  console.log('byBD数据:', byBD)

  // 申样数饼图 - 取前三
  const sampleData = Object.entries(byBD)
    .map(([bd, data]) => ({ name: bd, value: data.sampleCount }))
    .sort((a, b) => b.value - a.value)

  let sampleTop3 = sampleData.slice(0, 3)
  const sampleOther = sampleData.slice(3).reduce((sum, item) => sum + item.value, 0)
  if (sampleOther > 0) {
    sampleTop3.push({ name: '其它', value: sampleOther })
  }

  // 成单数饼图 - 取前三
  const orderData = Object.entries(byBD)
    .map(([bd, data]) => ({ name: bd, value: data.orderCount }))
    .sort((a, b) => b.value - a.value)

  let orderTop3 = orderData.slice(0, 3)
  const orderOther = orderData.slice(3).reduce((sum, item) => sum + item.value, 0)
  if (orderOther > 0) {
    orderTop3.push({ name: '其它', value: orderOther })
  }

  console.log('申样数饼图数据:', sampleTop3)
  console.log('成单数饼图数据:', orderTop3)

  const option = {
    title: {
      text: '申样数分布',
      left: '25%',
      top: 10
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 40
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['30%', '60%'],
        data: sampleTop3,
        label: {
          formatter: '{b}: {c}'
        }
      },
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['75%', '60%'],
        data: orderTop3,
        label: {
          formatter: '{b}: {c}'
        }
      }
    ]
  }

  // 修改第二个系列的标题
  option.series[1].title = {
    text: '成单数分布',
    left: '75%',
    top: 10
  }

  pieChartInstance.value.setOption(option)
  console.log('饼图已更新')
}

const loadRankingData = async (dateStr) => {
  if (!dateStr) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    dateStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
  }

  try {
    const res = await request.get('/bd-daily', {
      params: { date: dateStr }
    })

    const bdDailies = res.bdDailies || []

    // 申样数排名
    const sortedBySamples = [...bdDailies].sort((a, b) => (b.sampleCount || 0) - (a.sampleCount || 0))
    sampleRankingTop.value = sortedBySamples.slice(0, 3).filter(item => item.salesman !== '未分配')
    sampleRankingBottom.value = sortedBySamples.reverse().slice(0, 3).filter(item => item.salesman !== '未分配')

    // 成单数排名
    const sortedByOrders = [...bdDailies].sort((a, b) => (b.orderGeneratedCount || 0) - (a.orderGeneratedCount || 0))
    orderRankingTop.value = sortedByOrders.slice(0, 3).filter(item => item.salesman !== '未分配')
    orderRankingBottom.value = sortedByOrders.reverse().slice(0, 3).filter(item => item.salesman !== '未分配')
  } catch (error) {
    console.error('Load ranking data error:', error)
  }
}

const getRowClassName = ({ rowIndex }) => {
  if (rowIndex === 0) return 'top-row-1'
  if (rowIndex === 1) return 'top-row-2'
  return ''
}

const getRankClass = (index, isTop) => {
  if (!isTop) return 'rank-normal'
  if (index === 0) return 'rank-1'
  if (index === 1) return 'rank-2'
  if (index === 2) return 'rank-3'
  return 'rank-normal'
}

const getCountClass = (count, isTop) => {
  if (isTop) {
    if (count >= 10) return 'count-high'
    if (count >= 5) return 'count-medium'
  } else {
    if (count <= 1) return 'count-low'
    if (count <= 3) return 'count-medium-low'
  }
  return ''
}

onMounted(() => {
  nextTick(() => {
    if (lineChartRef.value) {
      lineChartInstance.value = echarts.init(lineChartRef.value)
    }
    if (pieChartRef.value) {
      pieChartInstance.value = echarts.init(pieChartRef.value)
    }
    loadChartData()
    loadRankingData()

    window.addEventListener('resize', () => {
      lineChartInstance.value?.resize()
      pieChartInstance.value?.resize()
    })
  })
})
</script>

<style scoped>
.performance-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 12px;
}

.page-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #4a148c;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-header h3::before {
  content: '';
  display: block;
  width: 4px;
  height: 20px;
  background: linear-gradient(180deg, #7b1fa2 0%, #9c27b0 100%);
  border-radius: 2px;
}

.chart-section {
  margin-bottom: 32px;
  background: linear-gradient(135deg, #faf5ff 0%, #fff 100%);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(74, 20, 140, 0.08);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.chart-header h4 {
  font-size: 16px;
  font-weight: 600;
  color: #4a148c;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-header h4::before {
  content: '📊';
  font-size: 18px;
}

.chart-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chart-container {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.ranking-section {
  margin-top: 32px;
}

.ranking-header h4 {
  font-size: 16px;
  font-weight: 600;
  color: #4a148c;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ranking-header h4::before {
  content: '🏆';
  font-size: 18px;
}

.ranking-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid #f0f0f0;
  height: 100%;
  transition: all 0.3s ease;
}

.ranking-card:hover {
  box-shadow: 0 4px 20px rgba(74, 20, 140, 0.12);
  transform: translateY(-2px);
}

.ranking-card h5 {
  font-size: 15px;
  font-weight: 600;
  color: #4a148c;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.rank-badge {
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.rank-1 {
  font-size: 28px;
  color: #ffd700;
  text-shadow: 0 2px 8px rgba(255, 215, 0, 0.6);
  animation: shine 2s ease-in-out infinite;
}

@keyframes shine {
  0%, 100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.2);
  }
}

.rank-2 {
  font-size: 24px;
  color: #c0c0c0;
  text-shadow: 0 1px 4px rgba(192, 192, 192, 0.6);
}

.rank-3 {
  font-size: 22px;
  color: #cd7f32;
  text-shadow: 0 1px 3px rgba(205, 127, 50, 0.5);
}

.rank-normal {
  color: #999;
  font-size: 16px;
}

.bd-name {
  font-weight: 500;
  color: #333;
  transition: all 0.3s ease;
}

.bd-name:hover {
  color: #7b1fa2;
}

.count-high {
  color: #52c41a;
  font-weight: bold;
  font-size: 24px;
  text-shadow: 0 1px 3px rgba(82, 196, 26, 0.4);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.count-medium {
  color: #1890ff;
  font-weight: bold;
  font-size: 18px;
}

.count-low {
  color: #b0b0b0;
  font-weight: 500;
}

.count-medium-low {
  color: #c0c0c0;
}

:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

:deep(.top-row-1) {
  background: linear-gradient(135deg, #fff9e6 0%, #fff7d1 100%) !important;
  box-shadow: inset 0 0 0 2px rgba(255, 215, 0, 0.3);
}

:deep(.top-row-2) {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
}

:deep(.el-table__body tr:hover > td) {
  background-color: rgba(123, 31, 162, 0.08) !important;
}

:deep(.el-table__row) {
  transition: all 0.3s ease;
  cursor: pointer;
}

:deep(.top-row-1 .bd-name) {
  font-size: 15px;
  font-weight: bold;
  color: #d4380d;
}

:deep(.el-table th) {
  background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
  color: #4a148c;
  font-weight: 600;
}

:deep(.el-table td) {
  padding: 12px 0;
}

:deep(.el-date-picker) {
  --el-date-editor-width: 280px;
}

:deep(.el-radio-button__inner) {
  font-weight: 500;
}

:deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: linear-gradient(135deg, #7b1fa2 0%, #9c27b0 100%);
  border-color: #7b1fa2;
}
</style>
