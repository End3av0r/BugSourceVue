import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue')
  },
  {
    path: '/latest',
    name: 'LatestVulnerabilities',
    component: () => import('../views/LatestVulnerabilities.vue')
  },
  {
    path: '/search',
    name: 'SearchVulnerabilities',
    component: () => import('../views/SearchVulnerabilities.vue')
  },
  {
    path: '/ai-parse',
    name: 'AIParseVulnerability',
    component: () => import('../views/AIParseVulnerability.vue')
  },
  {
    path: '/detail/:id',
    name: 'VulnerabilityDetail',
    component: () => import('../views/VulnerabilityDetail.vue')
  },
  {
    path: '/tag-definition',
    name: 'TagDefinitionManagement',
    component: () => import('../views/TagDefinitionManagement.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router