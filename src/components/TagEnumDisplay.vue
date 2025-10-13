<template>
  <a-card :title="title" :bordered="false" size="small">
    <template #extra>
      <a-space>
        <a-tag color="blue">{{ allTags.length }} 个标签</a-tag>
        <a-button size="small" @click="copyAllTags" :disabled="allTags.length === 0">
          <template #icon><CopyOutlined /></template>
          复制枚举
        </a-button>
      </a-space>
    </template>
    
    <div class="tag-enum-container">
      <div v-if="allTags.length > 0" class="tag-list">
        <a-tag
          v-for="(tag, index) in allTags"
          :key="tag"
          :color="getTagColor(index)"
          class="enum-tag"
          @click="handleTagClick(tag)"
        >
          {{ tag }}
          <span class="tag-count">({{ getTagCount(tag) }})</span>
        </a-tag>
      </div>
      <div v-else class="no-tags">
        <a-empty description="暂无标签数据" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
      </div>
    </div>
  </a-card>
</template>

<script setup>
import { computed } from 'vue'
import { message, Empty } from 'ant-design-vue'
import { CopyOutlined } from '@ant-design/icons-vue'

// Props
const props = defineProps({
  vulnerabilities: {
    type: Array,
    required: true,
    default: () => []
  },
  title: {
    type: String,
    default: '标签枚举'
  },
  clickable: {
    type: Boolean,
    default: true
  }
})

// Emits
const emit = defineEmits(['tag-click'])

// 计算属性：所有标签
const allTags = computed(() => {
  const tagSet = new Set()
  props.vulnerabilities.forEach(vuln => {
    if (vuln.tag && Array.isArray(vuln.tag)) {
      vuln.tag.forEach(tag => tagSet.add(tag))
    }
  })
  return Array.from(tagSet).sort()
})

// 获取标签颜色（循环使用不同颜色）
const getTagColor = (index) => {
  const colors = ['blue', 'green', 'orange', 'red', 'purple', 'cyan', 'magenta', 'gold', 'lime', 'volcano']
  return colors[index % colors.length]
}

// 获取标签使用次数
const getTagCount = (tag) => {
  return props.vulnerabilities.filter(vuln => 
    vuln.tag && vuln.tag.includes(tag)
  ).length
}

// 处理标签点击
const handleTagClick = (tag) => {
  if (props.clickable) {
    emit('tag-click', tag)
  }
}

// 复制所有标签枚举
const copyAllTags = () => {
  if (allTags.value.length === 0) {
    message.warning('暂无标签可复制')
    return
  }
  
  const tagList = allTags.value.map(tag => {
    const count = getTagCount(tag)
    return `${tag} (${count})`
  }).join(', ')
  
  const fullText = `标签枚举 (共${allTags.value.length}个):\n${tagList}`
  
  navigator.clipboard.writeText(fullText).then(() => {
    message.success('标签枚举已复制到剪贴板')
  }).catch(() => {
    message.error('复制失败')
  })
}
</script>

<style scoped>
.tag-enum-container {
  min-height: 80px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.enum-tag {
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 6px;
  font-size: 13px;
  padding: 4px 8px;
  margin-bottom: 8px;
}

.enum-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.tag-count {
  font-size: 11px;
  opacity: 0.8;
  margin-left: 4px;
}

.no-tags {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100px;
}

:deep(.ant-tag) {
  margin-right: 8px;
  margin-bottom: 4px;
}
</style>
