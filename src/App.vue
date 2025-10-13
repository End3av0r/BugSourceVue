<template>
  <a-config-provider>
    <a-layout class="app-layout">
      <a-layout-sider v-model:collapsed="collapsed" collapsible theme="light">
        <div class="logo">
          <h2 v-if="!collapsed">Bug Source </h2>
          <h2 v-else>漏洞</h2>
        </div>
        <a-menu v-model:selectedKeys="selectedKeys" mode="inline">
          <a-menu-item key="dashboard">
            <router-link to="/">
              <dashboard-outlined />
              <span>数据大盘</span>
            </router-link>
          </a-menu-item>
          <a-menu-item key="latest">
            <router-link to="/latest">
              <alert-outlined />
              <span>最新漏洞</span>
            </router-link>
          </a-menu-item>
          <a-menu-item key="search">
            <router-link to="/search">
              <search-outlined />
              <span>条件查询</span>
            </router-link>
          </a-menu-item>
          <a-menu-item key="ai-parse">
            <router-link to="/ai-parse">
              <robot-outlined />
              <span>AI解析</span>
            </router-link>
          </a-menu-item>
        </a-menu>
      </a-layout-sider>
      <a-layout>
        <a-layout-header class="app-header">
          <a-row justify="space-between" align="middle">
            <a-col>
              <menu-unfold-outlined
                v-if="collapsed"
                class="trigger"
                @click="() => (collapsed = !collapsed)"
              />
              <menu-fold-outlined
                v-else
                class="trigger"
                @click="() => (collapsed = !collapsed)"
              />
            </a-col>
            <a-col>
              <a-typography-title :level="4" class="header-title">
                漏洞信息管理系统
              </a-typography-title>
            </a-col>
            <a-col>
              <a-space>
                <a-button type="text">
                  <template #icon><bell-outlined /></template>
                </a-button>
                <a-button type="text">
                  <template #icon><user-outlined /></template>
                </a-button>
              </a-space>
            </a-col>
          </a-row>
        </a-layout-header>
        <a-layout-content class="app-content">
          <div class="content-wrapper">
            <router-view></router-view>
          </div>
        </a-layout-content>
        <a-layout-footer class="app-footer">
          漏洞信息管理系统 ©2025
        </a-layout-footer>
      </a-layout>
    </a-layout>
  </a-config-provider>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  DashboardOutlined,
  AlertOutlined,
  SearchOutlined,
  RobotOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  BellOutlined,
  UserOutlined
} from '@ant-design/icons-vue'

const collapsed = ref(false)
const route = useRoute()
const selectedKeys = ref(['dashboard'])

watch(
  () => route.path,
  (path) => {
    if (path === '/') selectedKeys.value = ['dashboard']
    else if (path === '/latest') selectedKeys.value = ['latest']
    else if (path === '/search') selectedKeys.value = ['search']
    else if (path === '/ai-parse') selectedKeys.value = ['ai-parse']
  },
  { immediate: true }
)
</script>

<style>
/* 全局样式重置：解决溢出隐藏导致的黑条问题 */
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
  /* 移除 overflow: hidden，允许内容区正常滚动（仅局部容器按需隐藏） */
  background-color: #f0f2f5;
}

/* 主布局：明确弹性布局，确保子元素（侧边栏+主内容区）高度统一 */
.app-layout {
  height: 100%; /* 改用 100% 继承父容器高度，避免 100vh 的适配问题 */
  display: flex; /* 关键：让侧边栏和主内容区横向排列且高度一致 */
}

/* 侧边栏：确保高度铺满，内容过多时可滚动（不影响全局） */
.ant-layout-sider {
  height: 100%;
  overflow-y: auto;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #f0f0f0;
}

.logo h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #002140;
}

/* 顶部栏：明确高度，方便后续内容区计算 */
.app-header {
  background: #fff;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  z-index: 1;
  height: 64px; /* 固定顶部栏高度，避免自适应导致的计算偏差 */
  display: flex; /* 让内部元素（折叠按钮/标题/用户区）垂直居中 */
  align-items: center;
}

.header-title {
  margin-bottom: 0;
  font-size: 18px;
  font-weight: 500;
}

.trigger {
  font-size: 18px;
  cursor: pointer;
  transition: color 0.3s;
}

.trigger:hover {
  color: #1890ff;
}

/* 主内容区容器：自动填充剩余高度，溢出时可滚动 */
.ant-layout-content {
  display: flex;
  flex-direction: column; /* 让 content-wrapper 和 footer 纵向排列 */
  height: 100%;
}

.app-content {
  margin: 16px;
  overflow: auto; /* 内容区超出时显示滚动条（关键：避免内容溢出导致黑条） */
  flex: 1; /* 自动填充顶部栏和底部栏之间的剩余高度 */
}

/* 内容包裹层：动态计算高度，避免硬编码偏差 */
.content-wrapper {
  padding: 24px;
  background: #fff;
  border-radius: 8px;
  /* 计算逻辑：内容区高度 - 上下 padding（24px*2），确保不溢出 */
  min-height: calc(100% - 48px);
}

/* 底部栏：明确高度，与顶部栏呼应 */
.app-footer {
  text-align: center;
  padding: 16px 0;
  color: rgba(0, 0, 0, 0.45);
  height: 48px; /* 固定底部栏高度 */
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 菜单项优化：保持原有样式 */
.ant-menu-item {
  margin: 8px 0 !important;
}

.ant-menu-item a {
  display: flex;
  align-items: center;
}

.ant-menu-item .anticon {
  font-size: 16px;
}

.ant-menu-item span {
  margin-left: 10px;
}

/* 清除 Ant Design 组件默认边距，避免布局错位 */
.ant-layout,
.ant-layout-header,
.ant-layout-footer,
.ant-menu {
  margin: 0;
  padding: 0;
  border-right: none; /* 移除侧边栏菜单默认右边框，避免视觉断层 */
}

.ant-layout-header.app-header {
  display: none; /* 隐藏整个头部 */
}
</style>
