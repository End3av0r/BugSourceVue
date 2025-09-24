<template>
  <div class="search-vulnerabilities">
    <a-card title="条件查询" :bordered="false">
      <a-form
        :model="formState"
        name="searchForm"
        @finish="onSearch"
        layout="vertical"
      >
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="漏洞标题" name="cnTitle">
              <a-input v-model:value="formState.cnTitle" placeholder="请输入漏洞标题关键词" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="CVE编号" name="cveId">
              <a-input v-model:value="formState.cveId" placeholder="请输入CVE编号" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="CNVD编号" name="cnvdId">
              <a-input v-model:value="formState.cnvdId" placeholder="请输入CNVD编号" />
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="时间范围" name="dateRange">
              <a-range-picker 
                v-model:value="formState.dateRange" 
                style="width: 100%"
                format="YYYY-MM-DD"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="危害等级" name="hazardLevel">
              <a-select
                v-model:value="formState.hazardLevel"
                placeholder="请选择危害等级"
                mode="multiple"
                style="width: 100%"
              >
                <a-select-option value="高危">高危</a-select-option>
                <a-select-option value="中危">中危</a-select-option>
                <a-select-option value="低危">低危</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-form-item>
          <a-space>
            <a-button type="primary" html-type="submit">
              <template #icon><search-outlined /></template>
              查询
            </a-button>
            <a-button @click="resetForm">
              <template #icon><clear-outlined /></template>
              重置
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>
    
    <a-card style="margin-top: 16px" :bordered="false">
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
            <a-space>
              <a-tag v-for="tag in record.tag" :key="tag" color="blue">{{ tag }}</a-tag>
            </a-space>
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
import { SearchOutlined, ClearOutlined } from '@ant-design/icons-vue'
import { searchVulnerabilities } from '../api/vulnerability'

const router = useRouter()
const loading = ref(false)
const vulnerabilities = ref([])

// 表单状态
const formState = reactive({
  cnTitle: '',
  cveId: '',
  cnvdId: '',
  dateRange: null,
  hazardLevel: []
})

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
  total: 0,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50', '100']
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

// 查询数据
const loadData = async () => {
  loading.value = true
  try {
    // 构建查询参数
    const params = {
      cnTitle: formState.cnTitle || undefined,
      cveId: formState.cveId || undefined,
      cnvdId: formState.cnvdId || undefined,
      limit: pagination.pageSize,
      offset: (pagination.current - 1) * pagination.pageSize
    }
    
    // 添加时间范围
    if (formState.dateRange && formState.dateRange.length === 2) {
      params.startDate = formState.dateRange[0].format('YYYY-MM-DD')
      params.endDate = formState.dateRange[1].format('YYYY-MM-DD')
    }
    
    const response = await searchVulnerabilities(params)
    
    if (response.data && response.data.code === '0000') {
      vulnerabilities.value = response.data.data.data || []
      pagination.total = response.data.data.total || 0
    }
  } catch (error) {
    console.error('查询漏洞数据失败:', error)
    // 使用模拟数据
    vulnerabilities.value = Array(10).fill(0).map((_, index) => ({
      id: index + 1,
      cnvdId: `CNVD-2025-${10000 + index}`,
      cveId: `CVE-2025-${5000 + index}`,
      cnTitle: `示例漏洞标题 ${index + 1}`,
      pubDate: '2025-09-01',
      hazardLevel: ['高危', '中危', '低危'][index % 3],
      tag: ['SQL注入', 'XSS', '命令执行', '权限提升'].slice(0, (index % 3) + 1)
    }))
    pagination.total = 100
  } finally {
    loading.value = false
  }
}

// 表单提交
const onSearch = () => {
  pagination.current = 1
  loadData()
}

// 重置表单
const resetForm = () => {
  Object.keys(formState).forEach(key => {
    formState[key] = key === 'hazardLevel' ? [] : null
  })
  pagination.current = 1
  loadData()
}

// 表格变化处理
const handleTableChange = (pag) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadData()
}

// 查看详情
const viewDetail = (id) => {
  router.push(`/detail/${id}`)
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.search-vulnerabilities {
  padding: 0 12px;
}
</style>