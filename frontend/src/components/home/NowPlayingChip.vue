<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useIpodStore } from '@/stores/ipod'
import { usePlayerStore } from '@/stores/player'

// Live "now playing" pill for the hero; tapping it pulls up the iPod.
const ipod = useIpodStore()
const { currentTrack, isPlaying } = storeToRefs(usePlayerStore())
</script>

<template>
  <button type="button" class="chip" :class="{ 'chip--playing': isPlaying }" @click="ipod.expand">
    <span class="chip__eq" aria-hidden="true"><i /><i /><i /><i /></span>
    <span v-if="currentTrack" class="chip__text">
      <span class="chip__label">{{ isPlaying ? $t('ipod.nowPlaying') : $t('ipod.paused') }}</span>
      <span class="chip__track">
        {{ currentTrack.title
        }}<template v-if="currentTrack.artist"> — {{ currentTrack.artist }}</template>
      </span>
    </span>
    <span v-else class="chip__text">
      <span class="chip__label">iPod</span>
      <span class="chip__track">{{ $t('ipod.turnOnMusic') }}</span>
    </span>
  </button>
</template>

<style scoped lang="scss">
.chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  max-width: 100%;
  padding: 6px 14px 6px 8px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface);
  box-shadow: var(--card-shadow);
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s;

  &:hover {
    border-color: var(--color-accent);
  }
}

// Four bars that bounce while music plays.
.chip__eq {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 16px;
  padding: 6px;
  box-sizing: content-box;
  border-radius: 50%;
  background: var(--color-accent-soft);

  i {
    width: 3px;
    height: 30%;
    border-radius: 2px;
    background: var(--color-accent);
  }
}

.chip--playing .chip__eq i {
  animation: eq 0.9s ease-in-out infinite alternate;

  &:nth-child(2) {
    animation-duration: 0.7s;
    animation-delay: -0.3s;
  }

  &:nth-child(3) {
    animation-duration: 1.1s;
    animation-delay: -0.5s;
  }

  &:nth-child(4) {
    animation-duration: 0.8s;
    animation-delay: -0.2s;
  }
}

@keyframes eq {
  from {
    height: 20%;
  }

  to {
    height: 100%;
  }
}

.chip__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}

.chip__label {
  color: var(--color-accent);
  font-family: var(--font-label);
  font-size: 11px;
  font-weight: 600;
  text-transform: var(--label-transform);
}

.chip__track {
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
}

@media (prefers-reduced-motion: reduce) {
  .chip--playing .chip__eq i {
    animation: none;
    height: 70%;
  }
}
</style>
