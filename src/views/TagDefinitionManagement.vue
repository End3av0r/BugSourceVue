<template>
  <div class="tag-definition-management">
    <a-page-header
      style="border: 1px solid rgb(235, 237, 240)"
      title="标签定义管理"
      sub-title="管理标签的定义和描述"
    />

    <a-card title="标签列表" :bordered="false" style="margin-top: 24px;">
      <template #extra>
        <a-space>
          <a-button type="primary" @click="showCreateModal">
            <template #icon><PlusOutlined /></template>
            新增标签
          </a-button>
          <a-button @click="refreshData">
            <template #icon><ReloadOutlined /></template>
            刷新
          </a-button>
        </a-space>
      </template>

      <a-table
        :columns="columns"
        :data-source="tags"
        :loading="loading"
        :pagination="pagination"
        rowKey="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'tagName'">
            <a-tag color="blue">{{ record.tagName }}</a-tag>
          </template>

          <template v-if="column.key === 'description'">
            <span>{{ record.description || '暂无描述' }}</span>
          </template>

          <template v-if="column.key === 'createdTime'">
            <span>{{ formatDate(record.createdTime) }}</span>
          </template>

          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="showEditModal(record)">
                编辑
              </a-button>
              <a-popconfirm
                title="确定要删除这个标签吗？"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleDelete(record.id)"
              >
                <a-button type="link" danger size="small">
                  删除
                </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 新增/编辑标签模态框 -->
    <a-modal
      v-model:open="modalVisible"
      :title="isEdit ? '编辑标签' : '新增标签'"
      @ok="handleSubmit"
      @cancel="handleCancel"
      :confirm-loading="submitting"
    >
      <a-form
        :model="formData"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 16 }"
      >
        <a-form-item label="标签名称" required>
          <a-input
            v-model:value="formData.tagName"
            placeholder="请输入标签名称"
            :maxlength="100"
          />
        </a-form-item>
        <a-form-item label="标签描述">
          <a-textarea
            v-model:value="formData.description"
            placeholder="请输入标签描述"
            :rows="4"
            :maxlength="500"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { getAllTags, createTag, updateTag, deleteTag } from '../api/tag'

const loading = ref(false)
const tags = ref([])
const modalVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)

// 表单数据
const formData = reactive({
  id: null,
  tagName: '',
  description: ''
})

// 分页配置
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 条数据`
})

// 表格列定义
const columns = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80
  },
  {
    title: '标签名称',
    dataIndex: 'tagName',
    key: 'tagName',
    width: 200
  },
  {
    title: '标签描述',
    dataIndex: 'description',
    key: 'description',
    ellipsis: true
  },
  {
    title: '创建时间',
    dataIndex: 'createdTime',
    key: 'createdTime',
    width: 180
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
    fixed: 'right'
  }
]

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 加载标签列表
const loadTags = async () => {
  loading.value = true
  try {
    const response = await getAllTags()
    if (response.data && response.data.code === '0000') {
      tags.value = response.data.data || []
      pagination.total = tags.value.length
    } else {
      message.error(response.data?.info || '加载标签列表失败')
      tags.value = []
    }
  } catch (error) {
    console.error('加载标签列表失败:', error)
    message.error('加载标签列表失败')
    tags.value = []
  } finally {
    loading.value = false
  }
}

// 刷新数据
const refreshData = () => {
  loadTags()
}

// 显示新增模态框
const showCreateModal = () => {
  isEdit.value = false
  formData.id = null
  formData.tagName = ''
  formData.description = ''
  modalVisible.value = true
}

// 显示编辑模态框
const showEditModal = (record) => {
  isEdit.value = true
  formData.id = record.id
  formData.tagName = record.tagName
  formData.description = record.description || ''
  modalVisible.value = true
}

// 提交表单
const handleSubmit = async () => {
  if (!formData.tagName || !formData.tagName.trim()) {
    message.warning('请输入标签名称')
    return
  }

  submitting.value = true
  try {
    let response
    if (isEdit.value) {
      response = await updateTag(formData.id, formData.tagName, formData.description)
    } else {
      response = await createTag(formData.tagName, formData.description)
    }

    if (response.data && response.data.code === '0000') {
      message.success(isEdit.value ? '更新标签成功' : '创建标签成功')
      modalVisible.value = false
      loadTags()
    } else {
      message.error(response.data?.info || '操作失败')
    }
  } catch (error) {
    console.error('提交失败:', error)
    message.error('操作失败')
  } finally {
    submitting.value = false
  }
}

// 取消操作
const handleCancel = () => {
  modalVisible.value = false
  formData.id = null
  formData.tagName = ''
  formData.description = ''
}

// 删除标签
const handleDelete = async (id) => {
  try {
    const response = await deleteTag(id)
    if (response.data && response.data.code === '0000') {
      message.success('删除标签成功')
      loadTags()
    } else {
      message.error(response.data?.info || '删除失败')
    }
  } catch (error) {
    console.error('删除失败:', error)
    message.error('删除失败')
  }
}

// 页面挂载时加载数据
onMounted(() => {
  loadTags()
})
</script>

<style scoped>
.tag-definition-management {
  padding: 0 12px;
}

:deep(.ant-card-head-title) {
  font-weight: 600;
}
</style>

