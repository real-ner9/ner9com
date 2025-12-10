<script setup lang="ts">
import GlobalHeader from '@/components/layout/global-header/GlobalHeader.vue'
</script>

<template>
  <div class="app-shell">
    <GlobalHeader />
    <main class="app-shell__content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #020617;
  color: #e2e8f0;
}

.app-shell__content {
  flex: 1;
}
</style>
