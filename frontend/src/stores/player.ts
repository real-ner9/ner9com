import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { DriveFile } from '@/services/drive.service'

export const usePlayerStore = defineStore('player', () => {
  const currentTrack = ref<DriveFile | null>(null)
  const autoplayToken = ref(0)

  function playTrack(track: DriveFile | null, options: { autoplay?: boolean } = {}) {
    currentTrack.value = track ? { ...track } : null
    if (track && options.autoplay !== false) {
      autoplayToken.value += 1
    }
  }

  function clearTrack() {
    currentTrack.value = null
  }

  return {
    currentTrack,
    autoplayToken,
    playTrack,
    clearTrack
  }
})
