<script setup lang="ts">
import MainNavigation from '@/components/MainNavigation.vue'
import MiniWavePlayer from './MiniWavePlayer.vue'
import ThemeToggle from './ThemeToggle.vue'
</script>

<template>
  <header class="global-header">
    <div class="global-header__nav">
      <MainNavigation />
    </div>
    <div class="global-header__toolbar">
      <ThemeToggle />
      <MiniWavePlayer />
    </div>
  </header>
</template>

<style scoped lang="scss">
.global-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
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
