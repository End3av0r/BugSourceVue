<template>
  <div class="tag-management">
    <a-page-header
      style="border: 1px solid rgb(235, 237, 240)"
      title="标签管理"
      sub-title="管理所有漏洞的标签"
    />
    
    <a-row :gutter="[24, 24]" style="margin-top: 24px;">
      <!-- 标签统计卡片 -->
      <a-col :xs="24" :lg="8">
        <a-card title="标签统计" :bordered="false">
          <a-statistic
            title="总标签数"
            :value="allTags.length"
            :value-style="{ color: '#1890ff' }"
          />
          <a-statistic
            title="使用中的标签"
            :value="activeTags.length"
            :value-style="{ color: '#52c41a' }"
            style="margin-top: 16px;"
          />
        </a-card>
      </a-col>
      
      <!-- 标签搜索和筛选 -->
      <a-col :xs="24" :lg="16">
        <a-card title="标签筛选" :bordered="false">
          <a-space wrap>
            <a-input-search
              v-model:value="searchKeyword"
              placeholder="搜索标签或漏洞..."
              style="width: 300px"
              @search="handleSearch"
              @change="handleSearch"
            />
            <a-select
              v-model:value="selectedTag"
              placeholder="选择标签筛选"
              style="width: 200px"
              allow-clear
              @change="handleTagFilter"
            >
              <a-select-option
                v-for="tag in allTags"
                :key="tag"
                :value="tag"
              >
                {{ tag }}
              </a-select-option>
            </a-select>
            <a-button @click="resetFilters">
              重置筛选
            </a-button>
          </a-space>
        </a-card>
      </a-col>
    </a-row>

    <!-- 标签枚举显示 -->
    <a-row :gutter="[24, 24]" style="margin-top: 24px;">
      <a-col :span="24">
        <TagEnumDisplay 
          :vulnerabilities="vulnerabilities"
          title="标签枚举"
          @tag-click="selectTag"
        />
      </a-col>
    </a-row>

    <!-- 漏洞标签列表 -->
    <a-card title="漏洞标签列表" :bordered="false" style="margin-top: 24px;">
      <template #extra>
        <a-button type="primary" @click="refreshData">
          <template #icon><ReloadOutlined /></template>
          刷新数据
        </a-button>
      </template>
      
      <a-table
        :columns="columns"
        :data-source="filteredVulnerabilities"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        rowKey="id"
        :scroll="{ x: 1200 }"
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
              @tags-updated="(newTags) => handleTagsUpdated(record, newTags)"
              @tag-added="handleTagAdded"
              @tag-deleted="handleTagDeleted"
            />
          </template>
          
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" @click="viewDetail(record.id)">查看详情</a-button>
              <a-button type="link" @click="editTags(record)">编辑标签</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 批量标签编辑模态框 -->
    <a-modal
      v-model:open="batchEditModalVisible"
      title="批量编辑标签"
      width="800px"
      @ok="handleBatchEdit"
      @cancel="handleCancelBatchEdit"
      :confirm-loading="batchEditing"
    >
      <a-descriptions :column="1" bordered size="small">
        <a-descriptions-item label="漏洞标题">
          {{ selectedRecord?.cnTitle }}
        </a-descriptions-item>
        <a-descriptions-item label="CNVD编号">
          {{ selectedRecord?.cnvdId }}
        </a-descriptions-item>
        <a-descriptions-item label="CVE编号">
          {{ selectedRecord?.cveId }}
        </a-descriptions-item>
      </a-descriptions>
      
      <div style="margin-top: 16px;">
        <VulnTagManager 
          :vuln-id="selectedRecord?.id"
          :tags="selectedRecord?.tag || []"
          title="当前标签"
          @tags-updated="handleBatchTagsUpdated"
          @tag-added="handleTagAdded"
          @tag-deleted="handleTagDeleted"
        />
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { getLatestVulnerabilities } from '../api/vulnerability'
import VulnTagManager from '../components/VulnTagManager.vue'
import TagEnumDisplay from '../components/TagEnumDisplay.vue'

const router = useRouter()
const loading = ref(false)
const vulnerabilities = ref([])
const searchKeyword = ref('')
const selectedTag = ref(undefined)
const batchEditModalVisible = ref(false)
const batchEditing = ref(false)
const selectedRecord = ref(null)
const batchTags = ref([])

// 分页配置
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total) => `共 ${total} 条数据`
})

// 表格列定义
const columns = [
  {
    title: 'CNVD编号',
    dataIndex: 'cnvdId',
    key: 'cnvdId',
    width: 150,
    fixed: 'left'
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
    ellipsis: true,
    width: 300
  },
  {
    title: '发布时间',
    dataIndex: 'pubDate',
    key: 'pubDate',
    width: 120
  },
  {
    title: '危害等级',
    dataIndex: 'hazardLevel',
    key: 'hazardLevel',
    width: 100
  },
  {
    title: '标签管理',
    key: 'tags',
    width: 300
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
    fixed: 'right'
  }
]

// 计算属性：所有标签
const allTags = computed(() => {
  const tagSet = new Set()
  vulnerabilities.value.forEach(vuln => {
    if (vuln.tag && Array.isArray(vuln.tag)) {
      vuln.tag.forEach(tag => tagSet.add(tag))
    }
  })
  return Array.from(tagSet).sort()
})

// 计算属性：使用中的标签
const activeTags = computed(() => {
  return allTags.value.filter(tag => {
    return vulnerabilities.value.some(vuln => 
      vuln.tag && vuln.tag.includes(tag)
    )
  })
})

// 计算属性：筛选后的漏洞列表
const filteredVulnerabilities = computed(() => {
  let filtered = vulnerabilities.value

  // 按关键词搜索
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(vuln => 
      vuln.cnTitle?.toLowerCase().includes(keyword) ||
      vuln.cnvdId?.toLowerCase().includes(keyword) ||
      vuln.cveId?.toLowerCase().includes(keyword) ||
      (vuln.tag && vuln.tag.some(tag => tag.toLowerCase().includes(keyword)))
    )
  }

  // 按标签筛选
  if (selectedTag.value) {
    filtered = filtered.filter(vuln => 
      vuln.tag && vuln.tag.includes(selectedTag.value)
    )
  }

  // 更新分页总数
  pagination.total = filtered.length
  
  // 分页处理
  const start = (pagination.current - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return filtered.slice(start, end)
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

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const response = await getLatestVulnerabilities(1000, 0)
    
    if (response.data && response.data.code === '0000') {
      vulnerabilities.value = response.data.data || []
    } else {
      vulnerabilities.value = []
    }
  } catch (error) {
    console.error('加载漏洞数据失败:', error)
    vulnerabilities.value = []
  } finally {
    loading.value = false
  }
}

// 刷新数据
const refreshData = () => {
  loadData()
}

// 搜索处理
const handleSearch = () => {
  pagination.current = 1
}

// 标签筛选处理
const handleTagFilter = () => {
  pagination.current = 1
}

// 重置筛选
const resetFilters = () => {
  searchKeyword.value = ''
  selectedTag.value = undefined
  pagination.current = 1
}

// 表格分页变化处理
const handleTableChange = (pag) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
}

// 查看详情
const viewDetail = (id) => {
  router.push(`/detail/${id}`)
}

// 编辑标签
const editTags = (record) => {
  selectedRecord.value = record
  batchTags.value = [...(record.tag || [])]
  batchEditModalVisible.value = true
}

// 处理标签更新
const handleTagsUpdated = (record, newTags) => {
  record.tag = newTags
  const index = vulnerabilities.value.findIndex(item => item.id === record.id)
  if (index > -1) {
    vulnerabilities.value[index].tag = newTags
  }
}

// 处理标签添加事件
const handleTagAdded = (tag) => {
  console.log('标签添加成功:', tag)
  // 重新加载数据以获取最新的标签统计信息
  setTimeout(() => {
    loadData()
  }, 500) // 延迟500ms确保后端数据已更新
}

// 处理标签删除事件
const handleTagDeleted = (tag) => {
  console.log('标签删除成功:', tag)
  // 重新加载数据以获取最新的标签统计信息
  setTimeout(() => {
    loadData()
  }, 500) // 延迟500ms确保后端数据已更新
}

// 批量标签更新
const handleBatchTagsUpdated = (newTags) => {
  batchTags.value = newTags
}

// 批量编辑确认
const handleBatchEdit = () => {
  if (selectedRecord.value) {
    selectedRecord.value.tag = batchTags.value
    const index = vulnerabilities.value.findIndex(item => item.id === selectedRecord.value.id)
    if (index > -1) {
      vulnerabilities.value[index].tag = batchTags.value
    }
  }
  batchEditModalVisible.value = false
  selectedRecord.value = null
  batchTags.value = []
}

// 取消批量编辑
const handleCancelBatchEdit = () => {
  batchEditModalVisible.value = false
  selectedRecord.value = null
  batchTags.value = []
}

// 点击标签进行筛选
const selectTag = (tag) => {
  selectedTag.value = tag
  pagination.current = 1
}

// 页面挂载时加载数据
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.tag-management {
  padding: 0 12px;
}

:deep(.ant-card-head-title) {
  font-weight: 600;
}

:deep(.ant-statistic-title) {
  font-size: 14px;
  color: #666;
}

:deep(.ant-statistic-content) {
  font-size: 24px;
  font-weight: 600;
}

</style>
