import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  // Vue DevTools injects dozens of extra modules into every dev page load, which is very slow
  // over the phone tunnel. Opt in with VUE_DEVTOOLS=1 npm run dev.
  plugins: [vue(), ...(process.env.VUE_DEVTOOLS ? [vueDevTools()] : [])],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Pre-transform the app on startup so the first page load doesn't wait for compilation.
    warmup: {
      clientFiles: ['./src/main.ts', './src/pages/*.vue', './src/components/**/*.vue'],
    },
    host: '127.0.0.1',
    port: 4100,
    // Local dev tunnel hostname (npm run tunnel, frontend/cloudflared.yml).
    allowedHosts: ['local.ner9.com'],
    proxy: {
      // The backend has no /api prefix; strip it so /api/library/... hits /library/...
      '/api': {
        target: 'http://127.0.0.1:4101',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
