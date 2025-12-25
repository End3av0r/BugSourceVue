<template>
  <div class="latest-vulnerabilities">
    <a-card title="最新漏洞数据" :bordered="false">
      <template #extra>
        <a-button type="primary" @click="refreshData">
          <template #icon><reload-outlined /></template>
          刷新
        </a-button>
      </template>
      
      <a-table
        :columns="columns"
        :data-source="vulnerabilities"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        rowKey="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'hazardLevel'">
            <a-tag :color="getHazardLevelColor(record.hazardLevel)">
              {{ record.hazardLevel }}
            </a-tag>
          </template>
          
          <template v-if="column.key === 'tags'">
            <VulnTagManager
              :vuln-id="record.id"
              :tags="record.tag || []"
              title=""
              :compact="true"
              @tags-updated="(newTags) => handleTagsUpdated(record, newTags)"
              @tag-added="handleTagAdded"
              @tag-deleted="handleTagDeleted"
            />
          </template>
          
          <template v-if="column.key === 'action'">
            <a-button type="link" @click="viewDetail(record.id)">查看详情</a-button>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { getLatestVulnerabilities } from '../api/vulnerability'
import VulnTagManager from '../components/VulnTagManager.vue'

const router = useRouter()
const loading = ref(false)
const vulnerabilities = ref([]) // 用于表格展示的当前页数据
const allVulnerabilities = ref([]) // 用于存储从服务器获取的完整数据（最多1000条）
const MAX_DATA_LIMIT = 1000 // 限制仅加载最新的1000条数据

// 表格列定义
const columns = [
  {
    title: 'CNVD编号',
    dataIndex: 'cnvdId',
    key: 'cnvdId',
    width: 150
  },
  {
    title: 'CVE编号',
    dataIndex: 'cveId',
    key: 'cveId',
    width: 150
  },
  {
    title: '漏洞标题',
    dataIndex: 'cnTitle',
    key: 'cnTitle',
    ellipsis: true
  },
  {
    title: '发布时间',
    dataIndex: 'pubDate',
    key: 'pubDate',
    width: 120,
    sorter: true
  },
  {
    title: '危害等级',
    dataIndex: 'hazardLevel',
    key: 'hazardLevel',
    width: 100
  },
  {
    title: '标签',
    key: 'tags',
    width: 200
  },
  {
    title: '操作',
    key: 'action',
    width: 100
  }
]

// 分页配置
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0, // 这个值将由loadData动态设置
  showSizeChanger: false, // 禁用每页条数切换
  showQuickJumper: true,
  showTotal: (total) => `共 ${total} 条数据（仅展示最新1000条）`
})

// 获取危害等级对应的颜色
const getHazardLevelColor = (level) => {
  const colors = {
    '高': 'red',
    '中': 'orange',
    '低': 'green',
    '未知': 'blue'
  }
  return colors[level] || 'blue'
}

// 根据当前页码和每页大小，更新表格显示的数据
const updateCurrentPageData = () => {
  const start = (pagination.current - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  vulnerabilities.value = allVulnerabilities.value.slice(start, end)
}

// 从服务器加载数据（主要在第一次或刷新时调用）
const loadData = async () => {
  // 只有在第一页或者刷新时，才向服务器请求数据
  if (pagination.current === 1 || allVulnerabilities.value.length === 0) {
    loading.value = true
    try {
      // 假设API支持一个limit参数来获取最新的N条数据
      // 如果API不支持，可能需要调整，但逻辑核心不变：一次性获取所有数据
      const response = await getLatestVulnerabilities(MAX_DATA_LIMIT, 0)
      
      if (response.data && response.data.code === '0000') {
        const fetchedData = response.data.data || []
        // 存储完整数据
        allVulnerabilities.value = fetchedData
        // 设置总条数，这是让分页器正确显示的关键
        pagination.total = Math.min(fetchedData.length, MAX_DATA_LIMIT)
      } else {
        allVulnerabilities.value = []
        pagination.total = 0
      }
    } catch (error) {
      console.error('加载最新漏洞数据失败:', error)
      allVulnerabilities.value = []
      pagination.total = 0
    } finally {
      loading.value = false
    }
  }
  
  // 无论是否从服务器加载，都更新当前页的显示数据
  updateCurrentPageData()
}

// 刷新数据
const refreshData = () => {
  pagination.current = 1 // 重置到第一页
  allVulnerabilities.value = [] // 清空旧数据，以触发重新请求
  loadData()
}

// 表格分页、排序、筛选变化时触发
const handleTableChange = (pag) => {
  // 更新分页参数
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize // 虽然禁用了切换，但逻辑上保留
  
  // 直接在前端切换页码，不重新请求服务器
  updateCurrentPageData()
}

// 查看详情
const viewDetail = (id) => {
  router.push(`/detail/${id}`)
}

// 处理标签更新
const handleTagsUpdated = (record, newTags) => {
  record.tag = newTags
  // 同时更新allVulnerabilities中对应的记录
  const index = allVulnerabilities.value.findIndex(item => item.id === record.id)
  if (index > -1) {
    allVulnerabilities.value[index].tag = newTags
  }
}

// 处理标签添加事件
const handleTagAdded = (tag) => {
  console.log('标签添加成功:', tag)
  // 重新加载数据
  setTimeout(() => {
    refreshData()
  }, 500)
}

// 处理标签删除事件
const handleTagDeleted = (tag) => {
  console.log('标签删除成功:', tag)
  // 重新加载数据
  setTimeout(() => {
    refreshData()
  }, 500)
}

// 页面挂载时加载初始数据
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.latest-vulnerabilities {
  padding: 0 12px;
}
</style>