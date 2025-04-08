import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

// Import components
import LoginPage from '../components/pages/LoginPage.vue'
import RegisterPage from '../components/pages/RegisterPage.vue'
import AppSidebar from '../components/ui/sidebar/AppSidebar.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: AppSidebar,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'login',
    component: LoginPage
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterPage
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard to check if route requires authentication
router.beforeEach((to, _, next) => {
  const isAuthenticated = localStorage.getItem('token') || sessionStorage.getItem('token')

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else if ((to.path === '/login' || to.path === '/register') && isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router