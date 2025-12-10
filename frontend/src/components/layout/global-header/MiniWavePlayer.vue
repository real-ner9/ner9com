<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import WaveSurfer from 'wavesurfer.js'
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { getAudioStreamUrl, getThumbnailUrl } from '@/services/drive.service'

const playerStore = usePlayerStore()
const { currentTrack, autoplayToken } = storeToRefs(playerStore)

const waveformRef = ref<HTMLDivElement | null>(null)
const waveSurferInstance = shallowRef<WaveSurfer | null>(null)
const isPlaying = ref(false)
const isLoadingTrack = ref(false)
const shouldAutoplayNext = ref(false)
const currentTime = ref(0)
const duration = ref(0)

const coverUrl = computed(() => (currentTrack.value ? getThumbnailUrl(currentTrack.value.id) : ''))
const timeDisplay = computed(() => {
  if (!currentTrack.value || !duration.value) return '--:--'
  return `${formatTime(currentTime.value)} / ${formatTime(duration.value)}`
})

onMounted(() => {
  if (!waveformRef.value) return
  waveSurferInstance.value = WaveSurfer.create({
    container: waveformRef.value,
    waveColor: '#64748b',
    progressColor: '#f97316',
    height: 56,
    cursorColor: '#f97316',
    barWidth: 2,
    barGap: 1,
    normalize: true,
    dragToSeek: true,
    interact: true
  })

  waveSurferInstance.value.on('ready', handleReady)
  waveSurferInstance.value.on('play', () => {
    isPlaying.value = true
  })
  waveSurferInstance.value.on('pause', () => {
    isPlaying.value = false
  })
  waveSurferInstance.value.on('finish', () => {
    isPlaying.value = false
  })
  waveSurferInstance.value.on('timeupdate', (time: number) => {
    currentTime.value = time
  })
})

onBeforeUnmount(() => {
  waveSurferInstance.value?.destroy()
})

watch(currentTrack, (track) => {
  if (!waveSurferInstance.value) return
  if (!track) {
    waveSurferInstance.value.empty()
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
    return
  }

  loadTrack(track.id)
})

watch(autoplayToken, () => {
  if (!currentTrack.value) return
  shouldAutoplayNext.value = true
})

function loadTrack(fileId: string) {
  if (!waveSurferInstance.value || !fileId) return
  isLoadingTrack.value = true
  const url = getAudioStreamUrl(fileId, currentTrack.value?.mimeType)
  waveSurferInstance.value.load(url)
}

function handleReady() {
  duration.value = waveSurferInstance.value?.getDuration() ?? 0
  isLoadingTrack.value = false
  if (shouldAutoplayNext.value) {
    shouldAutoplayNext.value = false
    waveSurferInstance.value?.play()
  }
}

function togglePlayback() {
  if (!waveSurferInstance.value || !currentTrack.value) return
  if (isPlaying.value) {
    waveSurferInstance.value.pause()
  } else if (!isLoadingTrack.value) {
    waveSurferInstance.value.play()
  }
}

function formatTime(value: number) {
  const totalSeconds = Math.floor(value)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}
</script>

<template>
  <section class="mini-player">
    <div class="mini-player__cover" v-if="coverUrl">
      <img :src="coverUrl" alt="cover" loading="lazy" />
    </div>
    <div v-else class="mini-player__cover mini-player__cover--empty">♪</div>

    <div class="mini-player__info">
      <p class="mini-player__label">Сейчас играет</p>
      <p class="mini-player__title">
        {{ currentTrack?.name ?? 'Выбери трек в библиотеке' }}
      </p>
      <p class="mini-player__time">{{ timeDisplay }}</p>
    </div>

    <button
      class="mini-player__action"
      type="button"
      :disabled="!currentTrack"
      @click="togglePlayback"
    >
      <span v-if="isLoadingTrack">...</span>
      <span v-else-if="isPlaying">Pause</span>
      <span v-else>Play</span>
    </button>

    <div ref="waveformRef" class="mini-player__waveform">
      <p v-if="!currentTrack" class="mini-player__placeholder">Выбери трек, чтобы увидеть волну</p>
    </div>
  </section>
</template>

<style scoped>
.mini-player {
  flex: 1;
  min-width: 320px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 16px;
  padding: 12px 16px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.6);
  align-items: center;
}

.mini-player__cover {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(51, 65, 85, 0.6);
}

.mini-player__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mini-player__cover--empty {
  font-size: 18px;
  color: #94a3b8;
}

.mini-player__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.mini-player__label {
  margin: 0;
  font-size: 12px;
  color: #94a3b8;
}

.mini-player__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.mini-player__time {
  margin: 0;
  font-size: 12px;
  color: #94a3b8;
}

.mini-player__action {
  border: none;
  border-radius: 12px;
  padding: 8px 14px;
  background: linear-gradient(90deg, #2563eb, #a855f7);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
}

.mini-player__action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.mini-player__action:not(:disabled):hover {
  transform: translateY(-1px);
}

.mini-player__waveform {
  grid-column: 1 / -1;
  width: 100%;
  height: 56px;
}

.mini-player__placeholder {
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
}

@media (max-width: 768px) {
  .mini-player {
    grid-template-columns: 1fr auto;
  }

  .mini-player__waveform {
    grid-column: 1 / -1;
  }
}
</style>
