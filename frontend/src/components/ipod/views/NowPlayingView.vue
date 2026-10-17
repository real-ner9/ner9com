<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { formatTime } from '@/utils/format'

// "Now Playing": cover with reflection, track info and the glossy progress bar.
// On iOS the volume of an <audio> element can't be changed, so the wheel scrubs instead.
const SEEK_STEP_S = 5

const player = usePlayerStore()
const { currentTrack, album, queue, currentIndex, currentTime, duration, isLoading, errorMessage } =
  storeToRefs(player)

const progress = computed(() => (duration.value ? (currentTime.value / duration.value) * 100 : 0))
const remaining = computed(() =>
  duration.value ? `-${formatTime(Math.max(duration.value - currentTime.value, 0))}` : '--:--',
)

function seekFromBar(event: MouseEvent) {
  const bar = event.currentTarget as HTMLElement
  const rect = bar.getBoundingClientRect()
  player.seek(((event.clientX - rect.left) / rect.width) * duration.value)
}

defineExpose({
  scroll: (delta: number) => player.seek(currentTime.value + delta * SEEK_STEP_S),
  select: () => player.toggle(),
})
</script>

<template>
  <div class="now">
    <template v-if="currentTrack">
      <p class="now__position">{{ $t('ipod.position', { n: currentIndex + 1, total: queue.length }) }}</p>

      <div class="now__main">
        <div class="now__cover">
          <img v-if="currentTrack.coverUrl" :src="currentTrack.coverUrl" alt="" />
          <span v-else class="now__placeholder">♪</span>
        </div>
        <div class="now__info">
          <p class="now__title">{{ currentTrack.title }}</p>
          <p class="now__artist">{{ currentTrack.artist ?? $t('ipod.unknownArtist') }}</p>
          <p class="now__album">{{ album?.name }}</p>
          <p v-if="errorMessage" class="now__error">{{ errorMessage }}</p>
          <p v-else-if="isLoading" class="now__loading">{{ $t('ipod.loading') }}</p>
        </div>
      </div>

      <div class="now__progress">
        <div class="now__bar" @click="seekFromBar">
          <div class="now__fill" :style="{ width: `${progress}%` }" />
        </div>
        <div class="now__times">
          <span>{{ currentTime > 0 ? formatTime(currentTime) : '0:00' }}</span>
          <span>{{ remaining }}</span>
        </div>
      </div>
    </template>

    <p v-else class="now__empty">{{ $t('ipod.nothingPlaying') }}</p>
  </div>
</template>

<style scoped lang="scss">
.now {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 3cqh 4cqw 4cqh;
  background: linear-gradient(180deg, #fff 0%, #eef0f3 100%);
  color: #000;
}

.now__position {
  color: #4b4f58;
  font-weight: 700;
  font-size: max(10px, 5cqh);
}

.now__main {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 4cqw;
  min-height: 0;
}

.now__cover {
  flex-shrink: 0;
  width: 46cqh;
  height: 46cqh;
  margin-bottom: 8cqh;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  -webkit-box-reflect: below 1px linear-gradient(transparent 60%, rgba(255, 255, 255, 0.4));

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.now__placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #8d939e, #4b4f58);
  color: #fff;
  font-size: 18cqh;
}

.now__info {
  min-width: 0;
  line-height: 1.25;

  p {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

.now__title {
  font-weight: 700;
  font-size: max(11px, 6.4cqh);
}

.now__artist,
.now__album {
  color: #2b2e34;
  font-size: max(10px, 5.6cqh);
}

.now__loading,
.now__error {
  margin-top: 4px;
  color: #6b6f78;
  font-size: max(10px, 4.6cqh);
}

.now__error {
  color: #c0392b;
}

.now__bar {
  position: relative;
  height: max(7px, 4.2cqh);
  border: 1px solid #7d8189;
  background: linear-gradient(180deg, #fdfdfd 0%, #d7d9dd 100%);
  cursor: pointer;
}

.now__fill {
  height: 100%;
  background: linear-gradient(180deg, #b7d4f6 0%, #5b97e6 50%, #2f6cd1 51%, #2a62c0 100%);
}

.now__times {
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
  font-weight: 700;
  font-size: max(10px, 4.8cqh);
}

.now__empty {
  margin: auto;
  color: #6b6f78;
  font-size: 13px;
}
</style>
