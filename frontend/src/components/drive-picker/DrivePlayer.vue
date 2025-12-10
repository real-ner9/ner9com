<script setup lang="ts">
import { computed, watch } from 'vue'
import type { PropType } from 'vue'
import type { DriveFile } from '@/services/drive.service'
import { getAudioStreamUrl, getThumbnailUrl } from '@/services/drive.service'

const props = defineProps({
  track: {
    type: Object as PropType<DriveFile | null>,
    required: false,
    default: null
  }
})

const audioSrc = computed(() =>
  props.track ? getAudioStreamUrl(props.track.id, props.track.mimeType) : ''
)
const thumbnailSrc = computed(() => (props.track ? getThumbnailUrl(props.track.id) : ''))

watch(
  () => props.track,
  (next, prev) => {
    if (next && next.id !== prev?.id) {
      console.log('Track selected for playback', next)
    }
  }
)
</script>

<template>
  <section class="player">
    <header class="player-header">
      <div>
        <p class="player-label">Сейчас играет</p>
        <p class="player-title">
          {{ track?.name ?? 'Выберите трек, чтобы начать воспроизведение' }}
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
    >
      Ваш браузер не поддерживает аудио.
    </audio
      v-if="audioSrc">
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

