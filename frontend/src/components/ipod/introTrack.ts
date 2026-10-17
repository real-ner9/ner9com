import { profile } from '@/content/profile'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'

// Activation events per the HTML spec: only these let a page start audio.
const GESTURES = ['pointerup', 'touchend', 'keydown'] as const

/**
 * Cues the profile's intro track from its drop and tries to play it. Browsers block sound until
 * the visitor interacts, so if autoplay is refused the track waits in the mini player and starts
 * on the first tap or key press anywhere outside the iPod (taps on the iPod are left to it).
 * Does nothing once the visitor picks or starts music themselves.
 */
export async function startIntroTrack() {
  const intro = profile.ru.introTrack
  if (!intro) return
  const library = useLibraryStore()
  const player = usePlayerStore()

  await library.loadAlbums()
  const album = library.albums.find((a) => a.name.includes(intro.album))
  if (!album || player.currentTrack) return
  const tracks = await library.loadTracks(album.id)
  const index = tracks.findIndex((t) => t.title === intro.title)
  if (index < 0 || player.currentTrack) return

  player.playTracks(tracks, index, album, { autoplay: false, startAt: intro.startAt })
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
