import { profile } from '@/content/profile'
import { useLibraryStore } from '@/stores/library'
import { readSavedSession, usePlayerStore } from '@/stores/player'
import { visitorStateReady } from '@/stores/visitorSync'
import type { MusicTrack } from '@/types/music'

// Activation events per the HTML spec: only these let a page start audio.
const GESTURES = ['pointerup', 'touchend', 'keydown'] as const

interface Cue {
  tracks: MusicTrack[]
  index: number
  startAt: number
  /** False when the visitor had paused it: only cue it. */
  play: boolean
}

/** The track the visitor was listening to before a reload, if it still exists. */
async function savedCue(): Promise<Cue | null> {
  const saved = readSavedSession()
  if (!saved) return null
  const library = useLibraryStore()
  const album = library.albumById(saved.albumId)
  if (!album) return null
  const tracks = await library.loadTracks(album.id)
  const index = tracks.findIndex((t) => t.id === saved.trackId)
  return index < 0 ? null : { tracks, index, startAt: saved.time, play: saved.playing }
}

/** The profile's intro track, cued from its drop. */
async function introCue(): Promise<Cue | null> {
  const intro = profile.ru.introTrack
  if (!intro) return null
  const library = useLibraryStore()
  const album = library.albums.find((a) => a.name.includes(intro.album))
  if (!album) return null
  const tracks = await library.loadTracks(album.id)
  const index = tracks.findIndex((t) => t.title === intro.title)
  return index < 0 ? null : { tracks, index, startAt: intro.startAt, play: true }
}

/**
 * Cues the track left before a reload (same spot; left paused if the visitor had paused it), or
 * on the first visit the profile's intro track, and tries to play it. Browsers block sound until the visitor interacts, so if autoplay is
 * refused the track waits in the mini player and starts on the first tap or key press anywhere
 * outside the iPod (taps on the iPod are left to it). Does nothing once the visitor picks or
 * starts music themselves.
 */
export async function startIntroTrack() {
  const library = useLibraryStore()
  const player = usePlayerStore()

  // The backend may hold the track to resume (another browser profile, cleared storage).
  await Promise.all([library.loadAlbums(), visitorStateReady])
  if (player.currentTrack) return
  const cue = (await savedCue()) ?? (await introCue())
  if (!cue || player.currentTrack) return

  player.playTracks(cue.tracks, cue.index, { autoplay: false, startAt: cue.startAt })
  if (!cue.play) return
  const introTrack = player.currentTrack
  if (await player.play()) return

  const disarm = () => GESTURES.forEach((e) => window.removeEventListener(e, onGesture, true))
  function onGesture(event: Event) {
    if (player.currentTrack !== introTrack || player.isPlaying) return disarm()
    if (event.target instanceof Element && event.target.closest('.ipod-sheet')) return
    disarm()
    void player.play()
  }
  GESTURES.forEach((e) => window.addEventListener(e, onGesture, true))
}
