import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** i18n key of the page title (tab title, Windows 98 window title); the site name is appended. */
    titleKey?: string
  }
}

// Pages other than home are lazy-loaded into their own chunks.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // A new page starts at the top; a query change on the same page keeps the scroll position.
  scrollBehavior: (to, from, saved) => saved ?? (to.path === from.path ? false : { top: 0 }),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    {
      path: '/projects',
      name: 'projects',
      component: () => import('@/pages/ProjectsPage.vue'),
      meta: { titleKey: 'nav.projects' },
    },
    {
      path: '/cv',
      name: 'cv',
      component: () => import('@/pages/ResumePage.vue'),
      meta: { titleKey: 'nav.resume' },
    },
    // The page used to live at /resume; old links still land on it.
    { path: '/resume', redirect: '/cv' },
    {
      path: '/clothes',
      name: 'clothes',
      component: () => import('@/pages/ClothesPage.vue'),
      meta: { titleKey: 'nav.clothes' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/NotFoundPage.vue'),
      meta: { titleKey: 'nav.notFound' },
    },
  ],
})

// Lazy pages are fetched in the background once the first page is shown, so navigating later
// doesn't wait on the network.
void router.isReady().then(() => {
  const prefetch = () => {
    for (const route of router.getRoutes()) {
      const component = route.components?.default
      if (typeof component === 'function') void (component as () => Promise<unknown>)()
    }
  }
  if ('requestIdleCallback' in window) window.requestIdleCallback(prefetch)
  else setTimeout(prefetch, 2000)
})

export default router
