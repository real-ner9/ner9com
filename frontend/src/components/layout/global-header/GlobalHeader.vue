<script setup lang="ts">
import MainNavigation from '@/components/MainNavigation.vue'
import MiniWavePlayer from './MiniWavePlayer.vue'
</script>

<template>
  <header class="global-header">
    <div class="global-header__nav">
      <MainNavigation />
    </div>
    <div class="global-header__toolbar">
      <MiniWavePlayer />
    </div>
  </header>
</template>

<style scoped>
.global-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 10;
}

.global-header__toolbar {
  display: flex;
  gap: 16px;
  align-items: stretch;
}

@media (max-width: 768px) {
  .global-header {
    padding: 12px 16px;
  }

  .global-header__toolbar {
    flex-direction: column;
  }
}
</style>
