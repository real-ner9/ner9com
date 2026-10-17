<script setup lang="ts">
import { t } from '@/i18n'
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { REPEAT_MODES, usePlayerStore } from '@/stores/player'
import { formatTime } from '@/utils/format'

// "Now Playing": cover with reflection, track info and a bottom panel. The center button cycles
// the panel like on the iPod classic: scrubber → shuffle → repeat. The wheel scrubs (on iOS the
// volume of an <audio> element can't be changed) or, on the other panels, changes the setting.
const SEEK_STEP_S = 5

const player = usePlayerStore()
const {
  currentTrack,
  album,
  queue,
  currentIndex,
  currentTime,
  duration,
  isLoading,
  errorMessage,
  shuffle,
  repeat,
} = storeToRefs(player)

const PANELS = ['scrubber', 'shuffle', 'repeat'] as const
const panel = ref<(typeof PANELS)[number]>('scrubber')

/** The options of the shuffle or repeat panel, with the active one highlighted. */
const options = computed(() =>
  panel.value === 'shuffle'
    ? [
        { label: t('ipod.off'), active: !shuffle.value },
        { label: t('ipod.songs'), active: shuffle.value },
      ]
    : [
        { label: t('ipod.off'), active: repeat.value === 'off' },
        { label: t('ipod.repeatOne'), active: repeat.value === 'one' },
        { label: t('ipod.repeatAll'), active: repeat.value === 'all' },
      ],
)

function scroll(delta: number) {
  if (panel.value === 'scrubber') player.seek(currentTime.value + delta * SEEK_STEP_S)
  else if (panel.value === 'shuffle') player.setShuffle(delta > 0)
  else {
    const index = REPEAT_MODES.indexOf(repeat.value) + Math.sign(delta)
    repeat.value = REPEAT_MODES[Math.min(Math.max(index, 0), REPEAT_MODES.length - 1)]
  }
}

function nextPanel() {
  panel.value = PANELS[(PANELS.indexOf(panel.value) + 1) % PANELS.length]
}

const progress = computed(() => (duration.value ? (currentTime.value / duration.value) * 100 : 0))
const remaining = computed(() =>
  duration.value ? `-${formatTime(Math.max(duration.value - currentTime.value, 0))}` : '--:--',
)

function seekFromBar(event: MouseEvent) {
  const bar = event.currentTarget as HTMLElement
  const rect = bar.getBoundingClientRect()
  player.seek(((event.clientX - rect.left) / rect.width) * duration.value)
}

defineExpose({ scroll, select: nextPanel })
</script>

<template>
  <div class="now">
    <template v-if="currentTrack">
      <p class="now__position">
        {{ $t('ipod.position', { n: currentIndex + 1, total: queue.length }) }}
        <span class="now__modes">
          <span v-if="shuffle" :title="$t('ipod.shuffle')">⤨</span>
          <span v-if="repeat !== 'off'" :title="$t('ipod.repeat')">
            ⟳<template v-if="repeat === 'one'">1</template>
          </span>
        </span>
      </p>

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

      <div v-if="panel !== 'scrubber'" class="now__setting" @click="nextPanel">
        <span class="now__setting-name">
          {{ panel === 'shuffle' ? $t('ipod.shuffle') : $t('ipod.repeat') }}
        </span>
        <span class="now__options">
          <span
            v-for="option in options"
            :key="option.label"
            class="now__option"
            :class="{ 'now__option--active': option.active }"
          >
            {{ option.label }}
          </span>
        </span>
      </div>

      <div v-else class="now__progress">
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
  display: flex;
  justify-content: space-between;
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

.now__modes {
  display: flex;
  gap: 6px;
  color: #2a62c0;
}

// Shuffle / repeat panel: the setting name and its options, the active one in the iPod's blue.
.now__setting {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-weight: 700;
  font-size: max(10px, 4.8cqh);
  cursor: pointer;
}

.now__options {
  display: flex;
  border: 1px solid #7d8189;
}

.now__option {
  flex: 1;
  padding: 2px 0;
  background: linear-gradient(180deg, #fdfdfd 0%, #d7d9dd 100%);
  text-align: center;

  & + & {
    border-left: 1px solid #7d8189;
  }

  &--active {
    background: linear-gradient(180deg, #b7d4f6 0%, #5b97e6 50%, #2f6cd1 51%, #2a62c0 100%);
    color: #fff;
  }
}

.now__empty {
  margin: auto;
  color: #6b6f78;
  font-size: 13px;
}
</style>
