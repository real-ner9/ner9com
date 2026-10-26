import '@fontsource-variable/exo-2'
import '@fontsource-variable/inter'
import './styles/main.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { startVisitorSync } from './stores/visitorSync'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
// After pinia is installed: it reads and writes the stores.
startVisitorSync()

app.mount('#app')

// The splash from index.html stays at least this long so its animation doesn't just flicker.
const SPLASH_MIN_MS = 1400

void router.isReady().then(() => {
  const splash = document.getElementById('splash')
  if (!splash) return
  setTimeout(
    () => {
      splash.classList.add('splash--out')
      setTimeout(() => splash.remove(), 500)
    },
    Math.max(SPLASH_MIN_MS - performance.now(), 0),
  )
})
