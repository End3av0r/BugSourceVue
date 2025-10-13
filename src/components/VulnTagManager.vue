<template>
  <div class="vuln-tag-manager">
    <a-card :title="title" :bordered="false" size="small">
      <template #extra>
        <a-button type="primary" size="small" @click="showAddModal">
          <template #icon><PlusOutlined /></template>
          添加标签
        </a-button>
      </template>
      
      <!-- 标签展示区域 -->
      <div class="tags-container">
        <a-space wrap>
          <a-tag
            v-for="tag in currentTags"
            :key="tag"
            color="blue"
            closable
            @close="handleDeleteTag(tag)"
            class="tag-item"
          >
            {{ tag }}
          </a-tag>
          <span v-if="currentTags.length === 0" class="no-tags">
            暂无标签
          </span>
        </a-space>
      </div>
    </a-card>

    <!-- 添加标签模态框 -->
    <a-modal
      v-model:open="addModalVisible"
      title="添加标签"
      @ok="handleAddTag"
      @cancel="handleCancelAdd"
      :confirm-loading="adding"
    >
      <a-form :model="addTagForm" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="标签内容" :rules="[{ required: true, message: '请输入标签内容' }]">
          <a-input
            v-model:value="addTagForm.tag"
            placeholder="请输入标签内容"
            @pressEnter="handleAddTag"
          />
        </a-form-item>
        <a-form-item label="提示">
          <a-text type="secondary">
            标签将用于分类和搜索漏洞，建议使用简洁明确的词汇
          </a-text>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { addVulnTag, deleteVulnTag } from '../api/vulnerability'

// Props
const props = defineProps({
  vulnId: {
    type: [Number, String],
    required: true
  },
  tags: {
    type: Array,
    default: () => []
  },
  title: {
    type: String,
    default: '标签管理'
  }
})

// Emits
const emit = defineEmits(['tags-updated', 'tag-added', 'tag-deleted'])

// 响应式数据
const currentTags = ref([...props.tags])
const addModalVisible = ref(false)
const adding = ref(false)
const addTagForm = ref({
  tag: ''
})

// 计算属性
const vulnId = computed(() => props.vulnId)

// 监听props.tags变化
watch(() => props.tags, (newTags) => {
  currentTags.value = [...newTags]
}, { deep: true })

// 显示添加标签模态框
const showAddModal = () => {
  addTagForm.value.tag = ''
  addModalVisible.value = true
}

// 处理添加标签
const handleAddTag = async () => {
  const tag = addTagForm.value.tag?.trim()
  
  if (!tag) {
    message.warning('请输入标签内容')
    return
  }
  
  if (currentTags.value.includes(tag)) {
    message.warning('该标签已存在')
    return
  }
  
  adding.value = true
  try {
    const response = await addVulnTag(vulnId.value, tag)
    
    if (response.data && response.data.code === '0000') {
      currentTags.value.push(tag)
      emit('tags-updated', currentTags.value)
      emit('tag-added', tag) // 发送标签添加事件
      message.success('标签添加成功')
      addModalVisible.value = false
      addTagForm.value.tag = ''
    } else {
      message.error(response.data?.info || '添加标签失败')
    }
  } catch (error) {
    console.error('添加标签失败:', error)
    message.error('添加标签失败，请重试')
  } finally {
    adding.value = false
  }
}

// 处理删除标签
const handleDeleteTag = async (tag) => {
  adding.value = true
  try {
    const response = await deleteVulnTag(vulnId.value, tag)
    
    if (response.data && response.data.code === '0000') {
      const index = currentTags.value.indexOf(tag)
      if (index > -1) {
        currentTags.value.splice(index, 1)
      }
      emit('tags-updated', currentTags.value)
      emit('tag-deleted', tag) // 发送标签删除事件
      message.success('标签删除成功')
    } else {
      message.error(response.data?.info || '删除标签失败')
    }
  } catch (error) {
    console.error('删除标签失败:', error)
    message.error('删除标签失败，请重试')
  } finally {
    adding.value = false
  }
}

// 取消添加
const handleCancelAdd = () => {
  addModalVisible.value = false
  addTagForm.value.tag = ''
}
</script>

<style scoped>
.vuln-tag-manager {
  margin-bottom: 16px;
}

.tags-container {
  min-height: 40px;
  padding: 8px 0;
}

.tag-item {
  margin-bottom: 8px;
}

.no-tags {
  color: #999;
  font-style: italic;
}

:deep(.ant-tag) {
  margin-right: 8px;
  margin-bottom: 4px;
  border-radius: 4px;
  font-size: 13px;
  padding: 2px 8px;
}

:deep(.ant-tag-close-icon) {
  margin-left: 4px;
  font-size: 10px;
}
</style>
