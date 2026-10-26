<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useIpodStore } from '@/stores/ipod'
import { usePlayerStore } from '@/stores/player'

// Header button that hides the iPod for visitors who don't want it (the music stops with it) and
// brings it back.
const ipod = useIpodStore()
const { isVisible } = storeToRefs(ipod)
const player = usePlayerStore()

function onClick() {
  if (isVisible.value) player.pause()
  ipod.setVisible(!isVisible.value)
}
</script>

<template>
  <button
    type="button"
    class="ipod-toggle icon-btn"
    :class="{ 'ipod-toggle--on': isVisible }"
    :aria-pressed="isVisible"
    :title="isVisible ? $t('ipod.hide') : $t('ipod.show')"
    @click="onClick"
  >
    <svg class="ipod-toggle__icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <rect x="8.2" y="4.2" width="7.6" height="6" rx="0.8" />
      <circle cx="12" cy="16" r="3.2" />
      <circle cx="12" cy="16" r="0.9" />
      <line v-if="!isVisible" class="ipod-toggle__off" x1="3" y1="21" x2="21" y2="3" />
    </svg>
    <span class="visually-hidden">{{ isVisible ? $t('ipod.hide') : $t('ipod.show') }}</span>
  </button>
</template>

<style scoped lang="scss">
.ipod-toggle {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
  transition:
    color 0.2s,
    border-color 0.2s;

  &:hover {
    color: var(--color-accent);
  }

  &--on {
    color: var(--color-text);
  }
}

.ipod-toggle__icon {
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linecap: round;
}

.ipod-toggle__off {
  stroke-width: 1.8;
}
</style>
