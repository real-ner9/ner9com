<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useDancersStore } from '@/stores/dancers'
import { usePlayerStore } from '@/stores/player'

// Header disco-ball button that calls the Fruity Dance girls in and out.
const dancers = useDancersStore()
const { isEnabled } = storeToRefs(dancers)
const player = usePlayerStore()

function onClick() {
  dancers.toggle()
  // A click is a user gesture: the moment the music analyser is allowed to start.
  if (isEnabled.value) player.getAnalyser()
}
</script>

<template>
  <button
    type="button"
    class="dance icon-btn"
    :class="{ 'dance--on': isEnabled }"
    :aria-pressed="isEnabled"
    :title="isEnabled ? $t('dance.off') : $t('dance.on')"
    @click="onClick"
  >
    <svg class="dance__ball" viewBox="0 0 24 24" aria-hidden="true">
      <line x1="12" y1="0" x2="12" y2="4" />
      <circle cx="12" cy="13.5" r="8.5" />
      <path d="M3.5 13.5h17M5 9h14M5 18h14M12 5c-3 3-3 14 0 17M12 5c3 3 3 14 0 17" />
    </svg>
    <span class="dance__spark dance__spark--a" aria-hidden="true">✦</span>
    <span class="dance__spark dance__spark--b" aria-hidden="true">✦</span>
    <span class="visually-hidden">Fruity Dance</span>
  </button>
</template>

<style scoped lang="scss">
.dance {
  position: relative;
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
    border-color 0.2s,
    box-shadow 0.2s;

  &--on {
    border-color: var(--color-accent);
    color: var(--color-accent);
    box-shadow: 0 0 0 3px var(--color-accent-soft);
  }
}

.dance__ball {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linecap: round;
}

.dance--on .dance__ball {
  animation: spin 4s linear infinite;
}

.dance__spark {
  position: absolute;
  color: var(--color-accent);
  font-size: 9px;
  opacity: 0;
  pointer-events: none;

  &--a {
    top: 1px;
    right: 2px;
  }

  &--b {
    bottom: 3px;
    left: 1px;
    font-size: 7px;
  }
}

.dance--on .dance__spark {
  animation: twinkle 1.6s ease-in-out infinite;
}

.dance--on .dance__spark--b {
  animation-delay: 0.8s;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes twinkle {
  50% {
    opacity: 1;
    transform: scale(1.3);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dance--on .dance__ball,
  .dance--on .dance__spark {
    animation: none;
  }
}
</style>
