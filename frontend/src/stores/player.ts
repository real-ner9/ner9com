import { t } from '@/i18n'
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { MusicAlbum, MusicTrack } from '@/types/music'

/**
 * Global audio player. Owns a single <audio> element that streams tracks straight from the
 * backend (HTTP Range), so playback starts before the file is downloaded and survives route
 * changes. Components only read state and call actions.
 */
export const usePlayerStore = defineStore('player', () => {
  const queue = ref<MusicTrack[]>([])
  const currentIndex = ref(-1)
  const album = ref<MusicAlbum | null>(null)
  const isPlaying = ref(false)
  const isLoading = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const errorMessage = ref<string | null>(null)

  const currentTrack = computed(() => queue.value[currentIndex.value] ?? null)
  const hasNext = computed(() => currentIndex.value < queue.value.length - 1)
  const hasPrevious = computed(() => currentIndex.value > 0)

  let audio: HTMLAudioElement | null = null

  // Optional Web Audio tap for visualisers (the dancers). Routing an element through Web Audio
  // is permanent and on iOS can silence it in the background, so it is only set up on request,
  // from a user gesture, and the context is resumed on every play.
  let audioContext: AudioContext | null = null
  let analyser: AnalyserNode | null = null

  /** The analyser if a gesture already set it up; never creates one (safe to call every frame). */
  const getAnalyserIfReady = () => analyser

  /** Must be called from a user gesture (click/tap). Returns null where Web Audio is missing. */
  function getAnalyser(): AnalyserNode | null {
    if (analyser) return analyser
    try {
      audioContext = new AudioContext()
      const source = audioContext.createMediaElementSource(getAudio())
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.5
      // Wider than the default -100..-30 dB so loud masters don't pin the bass at 255.
      analyser.minDecibels = -90
      analyser.maxDecibels = -10
      source.connect(analyser)
      analyser.connect(audioContext.destination)
      void audioContext.resume()
    } catch {
      analyser = null
    }
    return analyser
  }

  // Created on first use: the store must not touch the DOM at import time (tests, SSR).
  function getAudio() {
    if (audio) return audio
    audio = new Audio()
    audio.preload = 'metadata'
    audio.addEventListener('play', () => (isPlaying.value = true))
    audio.addEventListener('pause', () => (isPlaying.value = false))
    audio.addEventListener('waiting', () => (isLoading.value = true))
    audio.addEventListener('playing', () => (isLoading.value = false))
    audio.addEventListener('canplay', () => (isLoading.value = false))
    audio.addEventListener('timeupdate', () => (currentTime.value = audio!.currentTime))
    audio.addEventListener('durationchange', () => {
      duration.value = Number.isFinite(audio!.duration) ? audio!.duration : 0
    })
    audio.addEventListener('ended', () => (hasNext.value ? next() : (isPlaying.value = false)))
    audio.addEventListener('error', () => {
      isLoading.value = false
      isPlaying.value = false
      if (audio?.getAttribute('src')) errorMessage.value = t('errors.playback')
    })
    setupMediaSession()
    return audio
  }

  function loadCurrent(autoplay: boolean, startAt = 0) {
    const track = currentTrack.value
    const el = getAudio()
    errorMessage.value = null
    currentTime.value = 0
    duration.value = track?.duration ?? 0
    if (!track) {
      el.pause()
      el.removeAttribute('src')
      el.load()
      return
    }
    el.src = track.streamUrl
    if (startAt > 0) {
      // Seeking before the metadata is in is ignored by some browsers.
      el.addEventListener('loadedmetadata', () => (el.currentTime = startAt), { once: true })
      currentTime.value = startAt
    }
    updateMediaSession(track)
    if (autoplay) void play()
  }

  /** Resolves false when playback didn't start (e.g. the browser blocked autoplay). */
  async function play(): Promise<boolean> {
    if (!currentTrack.value) return false
    isLoading.value = true
    try {
      if (audioContext?.state === 'suspended') void audioContext.resume()
      await getAudio().play()
      return true
    } catch (error) {
      // Autoplay blocked or the load was interrupted by the next track: not an error for the user.
      isLoading.value = false
      const quiet = error instanceof DOMException && ['NotAllowedError', 'AbortError'].includes(error.name)
      if (!quiet) errorMessage.value = t('errors.playback')
      return false
    }
  }

  function pause() {
    audio?.pause()
  }

  function toggle() {
    if (isPlaying.value) pause()
    else void play()
  }

  /**
   * Replaces the queue with an album's tracks and starts at `startIndex`. `startAt` (seconds)
   * begins the first track mid-way; `autoplay: false` only cues it.
   */
  function playTracks(
    tracks: MusicTrack[],
    startIndex = 0,
    from: MusicAlbum | null = null,
    { autoplay = true, startAt = 0 } = {},
  ) {
    queue.value = [...tracks]
    album.value = from
    currentIndex.value = Math.min(Math.max(startIndex, 0), tracks.length - 1)
    loadCurrent(autoplay, startAt)
  }

  function next() {
    if (!hasNext.value) return
    currentIndex.value += 1
    loadCurrent(true)
  }

  function previous() {
    // Like most players: restart the track if it's been playing for a while.
    if (currentTime.value > 3 || !hasPrevious.value) {
      seek(0)
      return
    }
    currentIndex.value -= 1
    loadCurrent(true)
  }

  function seek(seconds: number) {
    if (!audio || !currentTrack.value) return
    audio.currentTime = Math.max(0, Math.min(seconds, duration.value || seconds))
  }

  // Lock-screen and headset controls on phones.
  function setupMediaSession() {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.setActionHandler('play', () => void play())
    navigator.mediaSession.setActionHandler('pause', pause)
    navigator.mediaSession.setActionHandler('nexttrack', next)
    navigator.mediaSession.setActionHandler('previoustrack', previous)
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime != null) seek(details.seekTime)
    })
  }

  function updateMediaSession(track: MusicTrack) {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist ?? undefined,
      album: album.value?.name,
      artwork: track.coverUrl ? [{ src: track.coverUrl }] : [],
    })
  }

  return {
    queue,
    currentIndex,
    currentTrack,
    album,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    errorMessage,
    hasNext,
    hasPrevious,
    playTracks,
    play,
    pause,
    toggle,
    next,
    previous,
    seek,
    getAnalyser,
    getAnalyserIfReady,
  }
})
