import { t } from '@/i18n'
import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useLibraryStore } from '@/stores/library'
import type { MusicTrack } from '@/types/music'

const STORAGE_KEY = 'ner9-player'
const MODES_KEY = 'ner9-player-modes'
/** How often the position is written while playing, in seconds of playback. */
const SAVE_EVERY_S = 2
/** The next track's first bytes are fetched this long before the current one ends. */
const PRELOAD_BEFORE_END_S = 15
/** About Spotify's chunk: enough to start playing at once. */
const PRELOAD_BYTES = 512 * 1024

/** What was playing when the page was left, so a reload continues from the same spot. */
export interface SavedSession {
  albumId: string
  trackId: string
  time: number
  /** False when the visitor paused it: the reload cues it without playing. */
  playing: boolean
}

export function readSavedSession(): SavedSession | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return typeof value?.albumId === 'string' && typeof value?.trackId === 'string'
      ? {
          albumId: value.albumId,
          trackId: value.trackId,
          time: Number(value.time) || 0,
          playing: value.playing !== false,
        }
      : null
  } catch {
    return null
  }
}

/** Remembers (or with null forgets) the track to resume after a reload. */
export function writeSavedSession(session: SavedSession | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Private mode: the track just isn't remembered.
  }
}

/** Repeat like the iPod: off, the current song, or the whole queue. */
export type RepeatMode = 'off' | 'one' | 'all'
export const REPEAT_MODES: RepeatMode[] = ['off', 'one', 'all']

function readModes(): { shuffle: boolean; repeat: RepeatMode } {
  try {
    const value = JSON.parse(localStorage.getItem(MODES_KEY) ?? 'null')
    return {
      shuffle: value?.shuffle === true,
      repeat: REPEAT_MODES.includes(value?.repeat) ? value.repeat : 'off',
    }
  } catch {
    return { shuffle: false, repeat: 'off' }
  }
}

/** Fisher–Yates; returns a new array. */
function shuffled<T>(items: T[]) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Global audio player. Owns a single <audio> element that streams tracks straight from the
 * backend (HTTP Range), so playback starts before the file is downloaded and survives route
 * changes. Components only read state and call actions.
 */
export const usePlayerStore = defineStore('player', () => {
  const library = useLibraryStore()
  const queue = ref<MusicTrack[]>([])
  /** The queue in its own order (album or song list), restored when shuffle is turned off. */
  let ordered: MusicTrack[] = []
  const currentIndex = ref(-1)
  const isPlaying = ref(false)
  const isLoading = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const errorMessage = ref<string | null>(null)

  const currentTrack = computed(() => queue.value[currentIndex.value] ?? null)
  /** The playing track's album; queues like "Songs" mix albums, so it follows the track. */
  const album = computed(() =>
    currentTrack.value ? library.albumById(currentTrack.value.albumId) : null,
  )

  const savedModes = readModes()
  const shuffle = ref(savedModes.shuffle)
  const repeat = ref<RepeatMode>(savedModes.repeat)
  watch([shuffle, repeat], () => {
    try {
      localStorage.setItem(MODES_KEY, JSON.stringify({ shuffle: shuffle.value, repeat: repeat.value }))
    } catch {
      // Private mode: the modes just aren't remembered.
    }
  })
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
    audio.addEventListener('timeupdate', () => {
      currentTime.value = audio!.currentTime
      if (Math.abs(currentTime.value - savedTime) >= SAVE_EVERY_S) saveSession()
      if (duration.value && duration.value - currentTime.value < PRELOAD_BEFORE_END_S) preloadNext()
    })
    audio.addEventListener('durationchange', () => {
      duration.value = Number.isFinite(audio!.duration) ? audio!.duration : 0
    })
    audio.addEventListener('ended', () => {
      if (repeat.value === 'one') {
        audio!.currentTime = 0
        void play()
      } else next()
    })
    audio.addEventListener('error', () => {
      isLoading.value = false
      isPlaying.value = false
      if (audio?.getAttribute('src')) errorMessage.value = t('errors.playback')
    })
    window.addEventListener('pagehide', saveSession)
    setupMediaSession()
    return audio
  }

  // --- Remembering the track across reloads ---------------------------------------------------

  let savedTime = 0

  /**
   * Whether the visitor wants music: set by play(), cleared by pause(). Not isPlaying, which is
   * also false while the browser blocks autoplay; that must not be remembered as a pause.
   */
  const wantsToPlay = ref(false)

  /** What is playing and where, as saved for a reload; null when nothing is. */
  function session(): SavedSession | null {
    const track = currentTrack.value
    return track
      ? {
          albumId: track.albumId,
          trackId: track.id,
          time: currentTime.value,
          playing: wantsToPlay.value,
        }
      : null
  }

  function saveSession() {
    savedTime = currentTime.value
    writeSavedSession(session())
  }

  // A new track, the queue running out or play/pause is saved at once; the position follows
  // while playing.
  watch([currentTrack, wantsToPlay], saveSession)

  // Like Spotify: fetch the start of the next track ahead of time, so the switch doesn't wait on
  // the network (it warms the browser's and Cloudflare's caches).
  let preloaded: string | null = null
  function preloadNext() {
    const next =
      queue.value[currentIndex.value + 1] ?? (repeat.value === 'all' ? queue.value[0] : null)
    if (!next || next === currentTrack.value || preloaded === next.streamUrl) return
    preloaded = next.streamUrl
    void fetch(next.streamUrl, { headers: { Range: `bytes=0-${PRELOAD_BYTES - 1}` } })
      .then((response) => response.arrayBuffer())
      .catch(() => {
        // Just a head start; playback fetches it anyway.
      })
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
    wantsToPlay.value = true
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
    wantsToPlay.value = false
    audio?.pause()
  }

  function toggle() {
    if (isPlaying.value) pause()
    else void play()
  }

  /**
   * Replaces the queue with `tracks` (an album, the song list…) and starts at `startIndex`.
   * With shuffle on, that track plays first and the rest follow in random order. `startAt`
   * (seconds) begins the first track mid-way; `autoplay: false` only cues it.
   */
  function playTracks(
    tracks: MusicTrack[],
    startIndex = 0,
    { autoplay = true, startAt = 0 } = {},
  ) {
    ordered = [...tracks]
    const index = Math.min(Math.max(startIndex, 0), tracks.length - 1)
    if (shuffle.value) {
      const first = tracks[index]
      queue.value = [first, ...shuffled(tracks.filter((_, i) => i !== index))]
      currentIndex.value = 0
    } else {
      queue.value = [...tracks]
      currentIndex.value = index
    }
    loadCurrent(autoplay, startAt)
  }

  /** Shuffle on: the rest of the queue is reordered randomly. Off: back to its own order. */
  function setShuffle(on: boolean) {
    if (shuffle.value === on) return
    shuffle.value = on
    const track = currentTrack.value
    if (!track) return
    if (on) {
      queue.value = [track, ...shuffled(ordered.filter((t) => t.id !== track.id))]
      currentIndex.value = 0
    } else {
      queue.value = [...ordered]
      currentIndex.value = Math.max(ordered.findIndex((t) => t.id === track.id), 0)
    }
  }

  /**
   * Past the last track the queue wraps with Repeat All; otherwise it ends like on the iPod:
   * music stops and clears.
   */
  function next() {
    if (hasNext.value) currentIndex.value += 1
    else if (repeat.value === 'all' && queue.value.length) currentIndex.value = 0
    else return stop()
    loadCurrent(true)
  }

  function stop() {
    queue.value = []
    ordered = []
    currentIndex.value = -1
    isPlaying.value = false
    loadCurrent(false)
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = null
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
    shuffle,
    repeat,
    setShuffle,
    wantsToPlay,
    session,
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
