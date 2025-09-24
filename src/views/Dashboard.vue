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
        <a-card title="各威胁程度漏洞占比" :bordered="false" class="chart-card">
          <div ref="hazardPieChartRef" class="chart-container"></div>
        </a-card>
      </a-col>
      
      <!-- 漏洞类型饼状图 -->
      <a-col :xs="24" :lg="12">
        <a-card title="各漏洞类型占比" :bordered="false" class="chart-card"> <!-- 建议修改卡片标题 -->
          <div ref="typeBarChartRef" class="chart-container"></div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 3. 图表区域：近7天柱状图 + 近12月折线图 -->
    <a-row :gutter="[24, 24]" class="chart-row">
      <!-- 近7天每日新增柱状图 -->
      <a-col :xs="24" :lg="24">
        <a-card title="近7天每日新增漏洞数量" :bordered="false" class="chart-card">
          <div ref="dailyChartRef" class="chart-container"></div>
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
import { ref, onMounted, reactive, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { 
  getDailyNewVuln, 
  getMonthlyNewVuln, 
  getVulnerabilityHazardStats,
  getVulnerabilityTypeCount // <-- 新增
} from '../api/vulnerability'

// 1. 统计数据存储
const stats = reactive({
  today: 0,    // 今日新增
  week: 0,     // 本周新增
  month: 0     // 本月新增
})

// 2. 图表DOM引用
const dailyChartRef = ref(null)       // 近7天柱状图
const monthlyChartRef = ref(null)     // 近12月折线图
const hazardPieChartRef = ref(null)   // 威胁程度饼状图
const typeBarChartRef = ref(null)     // 漏洞类型柱状图

// 3. 辅助函数：生成本地时区日期（YYYY-MM-DD）
const getLocalDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 4. 初始化近7天柱状图
const initDailyChart = (dailyData) => {
  if (!dailyChartRef.value) return
  const chart = echarts.init(dailyChartRef.value)

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
        textStyle: { fontSize: 12 }
      },
      axisLine: { lineStyle: { color: '#f0f0f0' } }
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLabel: {
        formatter: '{value} 个',
        textStyle: { fontSize: 12 }
      },
      splitLine: { lineStyle: { color: '#f7f8fa' } },
      axisLine: { lineStyle: { color: '#f0f0f0' } }
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

  const xData = monthlyData.map(item => item.date || '')
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
      axisLabel: { interval: 0 }
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLabel: { formatter: '{value} 个' }
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


const initTypePieChart = (typeData) => { // <-- 函数名重命名，更符合逻辑
  if (!typeBarChartRef.value) return;
  const chart = echarts.init(typeBarChartRef.value);

  // 处理数据，格式化为 [{name: '类型名', value: 数量}, ...]
  const pieData = typeData.map(item => ({
    name: item.name || item.type,
    value: item.count || item.value || 0
  }));

  // 计算总数，用于在 label 中显示百分比
  const total = pieData.reduce((sum, item) => sum + item.value, 0);

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} 个 ({d}%)' // {b}名称, {c}数值, {d}百分比
    },
    legend: {
      orient: 'vertical',
      left: 10,
      top: 'center',
      formatter: (name) => {
        const item = pieData.find(i => i.name === name);
        const percent = item ? ((item.value / total) * 100).toFixed(1) : 0;
        return `${name} (${percent}%)`;
      }
    },
    series: [
      {
        name: '漏洞类型',
        type: 'pie', // <-- 核心修改：将 'bar' 改为 'pie'
        radius: ['40%', '70%'], // 环形图，内半径40%，外半径70%
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
            fontSize: 20,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: pieData,
        // 自定义颜色，与威胁程度饼图区分开
        color: ['#1890ff', '#40a9ff', '#6ba5ff', '#94bfff', '#bedeff'] 
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
    
    stats.week = dailyList.reduce((sum, item) => sum + (item.count ? Number(item.count) : 0), 0)
    
    const today = getLocalDate(new Date())
    const todayItem = dailyList.find(item => item.date === today)
    stats.today = todayItem ? Number(todayItem.count) : 0

    initDailyChart(dailyList)

    // 第二步：加载近12月每月数据
    const monthlyRes = await getMonthlyNewVuln(12)
    const monthlyList = monthlyRes.data?.data || []
    
    const currentMonth = getLocalDate(new Date()).slice(0, 7)
    const currentMonthItem = monthlyList.find(item => {
      const itemMonth = (item.month || '').slice(0, 7)
      return itemMonth === currentMonth
    })
    stats.month = currentMonthItem ? Number(currentMonthItem.count) : 0

    initMonthlyChart(monthlyList)

    // 第三步：加载威胁程度统计数据
    const hazardRes = await getVulnerabilityHazardStats()
    const hazardList = hazardRes.data?.data || []
    if (hazardList.length > 0) {
      initHazardPieChart(hazardList)
    }
    
    // --------------------------
    // 第四步：加载漏洞类型数量统计数据
    // --------------------------
    const typeRes = await getVulnerabilityTypeCount();
    const typeList = typeRes.data?.data || [];
    console.log("漏洞类型数量数据:", typeList);

    // 初始化漏洞类型柱状图
    if (typeList.length > 0) {
      initTypePieChart(typeList);
    }

  } catch (error) {
    console.error('Dashboard数据加载失败:', error)
    stats.today = stats.week = stats.month = 0
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.dashboard-container {
  padding: 24px;
  background-color: #fafafa;
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
  display: flex;
  flex-wrap: nowrap; /* 禁止换行 */
  gap: 24px;         /* 设置间距 */
}

.chart-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.chart-container {
  height: 350px;
  padding: 16px;
}

:deep(.ant-card-head) {
  border-bottom: 1px solid #f0f0f0;
  padding: 16px 24px;
}

:deep(.ant-card-body) {
  padding: 24px;
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