<template>
  <div class="dashboard-container">
    <!-- 1. 核心统计卡片：今日/本周/本月新增 -->
    <a-row :gutter="[24, 24]" class="stat-row">
      <a-col :xs="24" :sm="12" :md="8">
        <a-card class="stat-card" :bordered="false">
          <a-statistic 
            title="今日新增漏洞" 
            :value="stats.today"
            :value-style="{ color: '#1890ff' }"
          >
            <template #suffix>
              <span>个</span>
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :md="8">
        <a-card class="stat-card" :bordered="false">
          <a-statistic 
            title="本周新增漏洞" 
            :value="stats.week"
            :value-style="{ color: '#45b7d1' }"
          >
            <template #suffix>
              <span>个</span>
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="24" :md="8">
        <a-card class="stat-card" :bordered="false">
          <a-statistic 
            title="本月新增漏洞" 
            :value="stats.month"
            :value-style="{ color: '#52c41a' }"
          >
            <template #suffix>
              <span>个</span>
            </template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

     <a-row :gutter="[24, 24]" class="chart-row">
      <!-- 威胁程度饼状图 -->
      <a-col :xs="24" :lg="12">
        <a-card title="各威胁程度漏洞占比（总）" :bordered="false" class="chart-card">
          <div ref="hazardPieChartRef" class="chart-container"></div>
        </a-card>
      </a-col>

      <!-- 标签统计饼状图 -->
      <a-col :xs="24" :lg="12">
        <a-card title="各标签漏洞数量占比（总）" :bordered="false" class="chart-card">
          <div ref="tagPieChartRef" class="chart-container"></div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 3. 图表区域：每日新增趋势（Tabs） + 近12月折线图 -->
    <a-row :gutter="[24, 24]" class="chart-row">
      <!-- 每日新增趋势（带标签页） -->
      <a-col :xs="24" :lg="24">
        <a-card title="每日新增漏洞趋势" :bordered="false" class="chart-card">
          <a-tabs v-model:activeKey="dailyTabKey">
            <a-tab-pane key="7days" tab="近7天">
              <div ref="dailyChartRef" class="chart-container"></div>
            </a-tab-pane>
            <a-tab-pane key="30days" tab="近30天">
              <div ref="thirtyDaysChartRef" class="chart-container"></div>
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </a-col>

      <!-- 近12月每月新增折线图 -->
      <a-col :xs="24" :lg="24">
        <a-card title="近12个月每月新增漏洞数量" :bordered="false" class="chart-card">
          <div ref="monthlyChartRef" class="chart-container"></div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import {
  getDailyNewVuln,
  getMonthlyNewVuln,
  getVulnerabilityHazardStats,
  getTagCount
} from '../api/vulnerability'

// 1. 统计数据存储
const stats = reactive({
  today: 0,    // 今日新增
  week: 0,     // 本周新增
  month: 0     // 本月新增
})

// 2. 图表DOM引用
const thirtyDaysChartRef = ref(null)  // 近30天曲线图
const dailyChartRef = ref(null)       // 近7天柱状图
const monthlyChartRef = ref(null)     // 近12月折线图
const hazardPieChartRef = ref(null)   // 威胁程度饼状图
const tagPieChartRef = ref(null)      // 标签统计饼状图

// 2.1 图表实例引用
let thirtyDaysChartInstance = null    // 近30天图表实例
let dailyChartInstance = null         // 近7天图表实例

// 2.2 Tabs 状态
const dailyTabKey = ref('7days')      // 每日趋势标签页状态
const thirtyDaysDataLoaded = ref(false)  // 近30天数据是否已加载
const thirtyDaysLoading = ref(false)     // 近30天数据加载中

// 3. 辅助函数：生成本地时区日期（YYYY-MM-DD）
const getLocalDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 3.1 辅助函数：补全近N天的数据（确保每天都有记录，缺失的补0）
const fillMissingDays = (data, days) => {
  const result = []
  const today = new Date()

  // 生成近N天的日期列表
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const dateStr = getLocalDate(date)

    // 查找该日期的数据
    const found = data.find(item => item.date === dateStr)

    result.push({
      date: dateStr,
      count: found ? found.count : 0
    })
  }

  return result
}

// 3.2 辅助函数：补全近N个月的数据（确保每月都有记录，缺失的补0）
const fillMissingMonths = (data, months) => {
  const result = []
  const today = new Date()

  // 生成近N个月的月份列表
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const monthStr = `${year}-${month}`

    // 查找该月份的数据
    const found = data.find(item => {
      const itemMonth = (item.month || '').slice(0, 7)
      return itemMonth === monthStr
    })

    result.push({
      month: monthStr,
      count: found ? found.count : 0
    })
  }

  return result
}

// 4. 初始化近30天曲线图
const initThirtyDaysChart = (thirtyDaysData) => {
  if (!thirtyDaysChartRef.value) return
  const chart = echarts.init(thirtyDaysChartRef.value)
  thirtyDaysChartInstance = chart  // 保存图表实例

  const xData = thirtyDaysData.map(item => item.date || '')
  const yData = thirtyDaysData.map(item => item.count ? Number(item.count) : 0)

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: '#ddd',
      borderWidth: 1,
      textStyle: { color: '#333' },
      formatter: '{b}<br/>新增漏洞：{c} 个'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: {
        interval: 'auto',
        rotate: 30,
        color: '#333',
        fontSize: 12,
        fontWeight: 500
      },
      axisLine: { lineStyle: { color: '#d9d9d9' } }
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLabel: {
        formatter: '{value} 个',
        color: '#333',
        fontSize: 13,
        fontWeight: 500
      },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
      axisLine: { lineStyle: { color: '#d9d9d9' } }
    },
    series: [
      {
        name: '每日新增',
        type: 'line',
        data: yData,
        smooth: true,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
            { offset: 1, color: 'rgba(24, 144, 255, 0)' }
          ])
        },
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2, color: '#1890ff' },
        itemStyle: { color: '#1890ff' },
        emphasis: { scale: true }
      }
    ]
  }

  chart.setOption(option)
  const handleResize = () => chart.resize()
  window.addEventListener('resize', handleResize)
  onUnmounted(() => window.removeEventListener('resize', handleResize))
}

// 5. 初始化近7天柱状图
const initDailyChart = (dailyData) => {
  if (!dailyChartRef.value) return
  const chart = echarts.init(dailyChartRef.value)
  dailyChartInstance = chart  // 保存图表实例

  const xData = dailyData.map(item => item.date || '')
  const yData = dailyData.map(item => item.count ? Number(item.count) : 0)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: '#e5e6eb',
      borderWidth: 1,
      textStyle: { color: '#333' },
      formatter: '{b}<br/>新增漏洞：{c} 个'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: {
        rotate: 30,
        interval: 0,
        color: '#333',
        fontSize: 13,
        fontWeight: 500
      },
      axisLine: { lineStyle: { color: '#d9d9d9' } }
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLabel: {
        formatter: '{value} 个',
        color: '#333',
        fontSize: 13,
        fontWeight: 500
      },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
      axisLine: { lineStyle: { color: '#d9d9d9' } }
    },
    series: [
      {
        name: '每日新增漏洞',
        type: 'bar',
        data: yData,
        barWidth: '50%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#1890ff' },
            { offset: 1, color: '#40a9ff' }
          ]),
          borderRadius: [4, 4, 0, 0]
        },
        emphasis: {
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#096dd9' },
              { offset: 1, color: '#1890ff' }
            ]),
            shadowBlur: 6,
            shadowColor: 'rgba(24, 144, 255, 0.2)'
          }
        }
      }
    ]
  }

  chart.setOption(option)
  const handleResize = () => chart.resize()
  window.addEventListener('resize', handleResize)
  onUnmounted(() => window.removeEventListener('resize', handleResize))
}

// 5. 初始化近12月折线图
const initMonthlyChart = (monthlyData) => {
  if (!monthlyChartRef.value) return
  const chart = echarts.init(monthlyChartRef.value)

  const xData = monthlyData.map(item => item.month || item.date || '')
  const yData = monthlyData.map(item => item.count ? Number(item.count) : 0)

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: '#ddd',
      borderWidth: 1,
      textStyle: { color: '#333' },
      formatter: '{b}<br/>新增漏洞：{c} 个'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: {
        interval: 0,
        color: '#333',
        fontSize: 13,
        fontWeight: 500
      },
      axisLine: { lineStyle: { color: '#d9d9d9' } }
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLabel: {
        formatter: '{value} 个',
        color: '#333',
        fontSize: 13,
        fontWeight: 500
      },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
      axisLine: { lineStyle: { color: '#d9d9d9' } }
    },
    series: [
      {
        name: '每月新增',
        type: 'line',
        data: yData,
        smooth: true,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(82, 196, 26, 0.3)' },
            { offset: 1, color: 'rgba(82, 196, 26, 0)' }
          ])
        },
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 3, color: '#52c41a' },
        itemStyle: { color: '#52c41a' },
        emphasis: { scale: true }
      }
    ]
  }

  chart.setOption(option)
  const handleResize = () => chart.resize()
  window.addEventListener('resize', handleResize)
  onUnmounted(() => window.removeEventListener('resize', handleResize))
}

// 6. 初始化威胁程度饼状图
const initHazardPieChart = (hazardData) => {
  if (!hazardPieChartRef.value) return
  const chart = echarts.init(hazardPieChartRef.value)

  const pieData = hazardData.map(item => ({
    name: item.name || item.type,
    value: item.value || item.count
  }))

  const total = pieData.reduce((sum, item) => sum + item.value, 0)

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} 个 ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 10,
      top: 'center',
      formatter: (name) => {
        const item = pieData.find(i => i.name === name)
        const percent = item ? ((item.value / total) * 100).toFixed(1) : 0
        return `${name} (${percent}%)`
      }
    },
    series: [
      {
        name: '威胁程度',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: { show: false, position: 'center' },
        emphasis: {
          label: { show: true, fontSize: 20, fontWeight: 'bold' }
        },
        labelLine: { show: false },
        data: pieData,
        color: ['#cf1322', '#faad14', '#52c41a', '#1890ff']
      }
    ]
  }

  chart.setOption(option)
  const handleResize = () => chart.resize()
  window.addEventListener('resize', handleResize)
  onUnmounted(() => window.removeEventListener('resize', handleResize))
}

// 初始化标签统计饼状图
const initTagPieChart = (tagData) => {
  if (!tagPieChartRef.value) return;
  const chart = echarts.init(tagPieChartRef.value);

  // 只显示前10个标签，避免图例过多
  const topTags = tagData.slice(0, 10);

  const pieData = topTags.map(item => ({
    name: item.tag || item.name,
    value: Number(item.count || item.value || 0)
  }));

  const total = pieData.reduce((sum, item) => sum + item.value, 0);

  const option = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: '#ddd',
      borderWidth: 1,
      textStyle: { color: '#333' },
      formatter: '{b}<br/>漏洞数量：{c} 个<br/>占比：{d}%'
    },
    legend: {
      orient: 'vertical',
      left: 10,
      top: 'center',
      textStyle: {
        fontSize: 13,
        color: '#333'
      },
      formatter: (name) => {
        const item = pieData.find(i => i.name === name);
        const percent = item ? ((item.value / total) * 100).toFixed(1) : 0;
        return `${name} (${percent}%)`;
      }
    },
    series: [
      {
        name: '标签统计',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 18,
            fontWeight: 'bold'
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        labelLine: {
          show: false
        },
        data: pieData,
        color: ['#52c41a', '#faad14', '#1890ff', '#722ed1', '#eb2f96', '#13c2c2', '#fa8c16', '#2f54eb', '#f5222d', '#a0d911']
      }
    ]
  };

  chart.setOption(option);

  const handleResize = () => chart.resize();
  window.addEventListener('resize', handleResize);
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
  });
};

// 7. 核心数据加载逻辑
const loadData = async () => {
  try {
    // 第一步：加载近7天每日数据
    const dailyRes = await getDailyNewVuln(7)
    const dailyList = dailyRes.data?.data || []

    // 补全近7天数据，确保每天都有记录
    const completeDailyList = fillMissingDays(dailyList, 7)

    stats.week = completeDailyList.reduce((sum, item) => sum + (item.count ? Number(item.count) : 0), 0)

    const today = getLocalDate(new Date())
    const todayItem = completeDailyList.find(item => item.date === today)
    stats.today = todayItem ? Number(todayItem.count) : 0

    initDailyChart(completeDailyList)

    // 第二步：加载近12月每月数据
    const monthlyRes = await getMonthlyNewVuln(12)
    const monthlyList = monthlyRes.data?.data || []

    // 补全近12个月数据，确保每月都有记录
    const completeMonthlyList = fillMissingMonths(monthlyList, 12)

    const currentMonth = getLocalDate(new Date()).slice(0, 7)
    const currentMonthItem = completeMonthlyList.find(item => {
      const itemMonth = (item.month || '').slice(0, 7)
      return itemMonth === currentMonth
    })
    stats.month = currentMonthItem ? Number(currentMonthItem.count) : 0

    initMonthlyChart(completeMonthlyList)

    // 第三步：加载威胁程度统计数据
    const hazardRes = await getVulnerabilityHazardStats()
    const hazardList = hazardRes.data?.data || []
    if (hazardList.length > 0) {
      initHazardPieChart(hazardList)
    }

    // 第四步：加载标签统计数据
    const tagRes = await getTagCount();
    const tagList = tagRes.data?.data || [];
    console.log("标签统计数据:", tagList);

    // 初始化标签统计饼状图
    if (tagList.length > 0) {
      initTagPieChart(tagList);
    }

  } catch (error) {
    console.error('Dashboard数据加载失败:', error)
    stats.today = stats.week = stats.month = 0
  }
}

// 7.1 加载近30天数据
const loadThirtyDaysData = async () => {
  if (thirtyDaysDataLoaded.value || thirtyDaysLoading.value) {
    return
  }

  thirtyDaysLoading.value = true
  try {
    const thirtyDaysRes = await getDailyNewVuln(30)
    const thirtyDaysList = thirtyDaysRes.data?.data || []

    // 补全近30天数据，确保每天都有记录
    const completeThirtyDaysList = fillMissingDays(thirtyDaysList, 30)

    initThirtyDaysChart(completeThirtyDaysList)
    thirtyDaysDataLoaded.value = true

    await nextTick()
    if (thirtyDaysChartInstance) {
      thirtyDaysChartInstance.resize()
    }
  } catch (error) {
    console.error('近30天数据加载失败:', error)
  } finally {
    thirtyDaysLoading.value = false
  }
}

// 8. 监听 Tab 切换，按需加载数据
watch(dailyTabKey, async (newKey) => {
  if (newKey === '30days') {
    await loadThirtyDaysData()
  }
})

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.dashboard-container {
  padding: 24px;
  background-color: #fafafa;
  max-width: 100%;
  overflow-x: hidden;
}

.stat-row {
  margin-bottom: 24px;
}

.stat-card {
  height: 100%;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.chart-row {
  margin-bottom: 24px;
}

.chart-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.chart-container {
  height: 350px;
  padding: 16px;
  width: 100%;
  box-sizing: border-box;
}

:deep(.ant-card-head) {
  border-bottom: 1px solid #f0f0f0;
  padding: 16px 24px;
}

:deep(.ant-card-body) {
  padding: 24px;
  overflow: hidden;
}

:deep(.ant-statistic-title) {
  font-size: 16px;
  color: rgba(0, 0, 0, 0.7);
  margin-bottom: 12px;
}

:deep(.ant-statistic-content) {
  font-size: 28px;
  font-weight: 500;
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 16px;
  }

  .chart-container {
    height: 350px; /* 图表高度 */
    width: 100%;   /* 宽度占满父容器 */
  }

  :deep(.ant-card-body) {
    padding: 16px;
  }

  :deep(.ant-statistic-content) {
    font-size: 24px;
  }
}
</style>