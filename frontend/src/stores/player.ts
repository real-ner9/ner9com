import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { MusicAlbum, MusicTrack } from '@/types/music'

export const usePlayerStore = defineStore('player', () => {
  const currentTrack = ref<MusicTrack | null>(null)
  const currentAlbum = ref<MusicAlbum | null>(null)
  const queue = ref<MusicTrack[]>([])
  const currentIndex = ref<number>(-1)
  const autoplayToken = ref(0)

  function setQueue(tracks: MusicTrack[], startIndex = 0, album?: MusicAlbum | null) {
    queue.value = [...tracks]
    currentAlbum.value = album ?? currentAlbum.value
    currentIndex.value = Math.max(0, Math.min(startIndex, tracks.length - 1))
    currentTrack.value = queue.value[currentIndex.value] ?? null
    if (currentTrack.value) {
      autoplayToken.value += 1
    }
  }

  function playTrack(track: MusicTrack | null, options: { autoplay?: boolean } = {}) {
    currentTrack.value = track ? { ...track } : null
    currentAlbum.value = null
    queue.value = track ? [track] : []
    currentIndex.value = track ? 0 : -1
    if (track && options.autoplay !== false) {
      autoplayToken.value += 1
    }
  }

  function playAlbum(tracks: MusicTrack[], startIndex = 0, album?: MusicAlbum | null) {
    setQueue(tracks, startIndex, album)
  }

  function playNext() {
    if (currentIndex.value < 0) return
    const nextIndex = currentIndex.value + 1
    if (nextIndex >= queue.value.length) {
      return
    }
    currentIndex.value = nextIndex
    currentTrack.value = queue.value[currentIndex.value]
    autoplayToken.value += 1
  }

  function playPrevious() {
    if (currentIndex.value <= 0) return
    currentIndex.value -= 1
    currentTrack.value = queue.value[currentIndex.value]
    autoplayToken.value += 1
  }

  function clearTrack() {
    currentTrack.value = null
    queue.value = []
    currentIndex.value = -1
    currentAlbum.value = null
  }

  return {
    currentTrack,
    currentAlbum,
    queue,
    currentIndex,
    autoplayToken,
    playTrack,
    playAlbum,
    playNext,
    playPrevious,
    clearTrack
  }
})
