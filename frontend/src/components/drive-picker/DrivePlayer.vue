<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'
import type { MusicTrack } from '@/types/music'

const props = defineProps({
  track: {
    type: Object as PropType<MusicTrack | null>,
    required: false,
    default: null
  }
})

const emit = defineEmits<{
  (e: 'ended'): void
}>()

const audioSrc = computed(() => props.track?.streamUrl ?? '')
const thumbnailSrc = computed(() => props.track?.coverUrl ?? '')
</script>

<template>
  <section class="player">
    <header class="player-header">
      <div>
        <p class="player-label">Сейчас играет</p>
        <p class="player-title">
          {{ track?.title ?? 'Выберите трек, чтобы начать воспроизведение' }}
        </p>
      </div>
      <img
        v-if="thumbnailSrc"
        class="player-cover"
        :src="thumbnailSrc"
        alt="Track cover"
        loading="lazy"
      />
    </header>

    <audio
      v-if="audioSrc"
      class="audio"
      :src="audioSrc"
      controls
      preload="none"
      @ended="emit('ended')"
    >
      Ваш браузер не поддерживает аудио.
    </audio>
  </section>
</template>

<style scoped>
.player {
  margin-top: 24px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.player-label {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}

.player-title {
  font-size: 18px;
  font-weight: 600;
  margin: 4px 0 0;
}

.player-cover {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.audio {
  width: 100%;
}
</style>

