<script setup lang="ts">
import GlobalHeader from '@/components/layout/global-header/GlobalHeader.vue'
import { useTheme } from '@/composables/useTheme'

useTheme()
</script>

<template>
  <div class="app-shell">
    <GlobalHeader />
    <main class="app-shell__content">
      <router-view />
    </main>
  </div>
</template>

<style scoped lang="scss">
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  color: var(--color-text);
}

.app-shell__content {
  flex: 1;
}
</style>
