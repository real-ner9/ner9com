import { t } from '@/i18n'
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchAlbumTracks, fetchAlbums, fetchAllTracks } from '@/api/library'
import type { MusicAlbum, MusicTrack } from '@/types/music'

/** Albums and their tracks, loaded lazily from the backend and cached for the session. */
export const useLibraryStore = defineStore('library', () => {
  const albums = ref<MusicAlbum[]>([])
  const tracksByAlbum = ref<Record<string, MusicTrack[]>>({})
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  let albumsRequest: Promise<void> | null = null
  const trackRequests = new Map<string, Promise<MusicTrack[]>>()

  /** Safe to call repeatedly: concurrent and later calls reuse the first request. */
  function loadAlbums() {
    albumsRequest ??= (async () => {
      isLoading.value = true
      errorMessage.value = null
      try {
        albums.value = await fetchAlbums()
      } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : t('errors.albums')
        albumsRequest = null
      } finally {
        isLoading.value = false
      }
    })()
    return albumsRequest
  }

  function loadTracks(albumId: string): Promise<MusicTrack[]> {
    const cached = tracksByAlbum.value[albumId]
    if (cached) return Promise.resolve(cached)

    let request = trackRequests.get(albumId)
    if (!request) {
      request = fetchAlbumTracks(albumId)
        .then((tracks) => {
          tracksByAlbum.value = { ...tracksByAlbum.value, [albumId]: tracks }
          return tracks
        })
        .catch((error) => {
          trackRequests.delete(albumId)
          errorMessage.value = error instanceof Error ? error.message : t('errors.tracks')
          return []
        })
      trackRequests.set(albumId, request)
    }
    return request
  }

  const albumById = (albumId: string) => albums.value.find((album) => album.id === albumId) ?? null

  let allTracksRequest: Promise<MusicTrack[]> | null = null

  /**
   * Every playable track, album by album (for Songs, Artists and Shuffle Songs), in one request;
   * fills the per-album cache too.
   */
  function loadAllTracks(): Promise<MusicTrack[]> {
    allTracksRequest ??= (async () => {
      await loadAlbums()
      try {
        const tracks = await fetchAllTracks(albums.value)
        const byAlbum: Record<string, MusicTrack[]> = {}
        for (const track of tracks) (byAlbum[track.albumId] ??= []).push(track)
        tracksByAlbum.value = { ...tracksByAlbum.value, ...byAlbum }
        return tracks
      } catch (error) {
        allTracksRequest = null
        errorMessage.value = error instanceof Error ? error.message : t('errors.tracks')
        return []
      }
    })()
    return allTracksRequest
  }

  /**
   * The album's artist: from the backend (the collection's artist folder), or else the one
   * credited on most of its tracks, so features on a single track don't split the album; null
   * until the tracks are loaded.
   */
  function albumArtist(albumId: string) {
    const known = albumById(albumId)?.artist
    if (known) return known
    const counts = new Map<string, number>()
    for (const track of tracksByAlbum.value[albumId] ?? []) {
      if (track.artist) counts.set(track.artist, (counts.get(track.artist) ?? 0) + 1)
    }
    let best: string | null = null
    for (const [artist, count] of counts) if (!best || count > counts.get(best)!) best = artist
    return best
  }

  return {
    albums,
    tracksByAlbum,
    isLoading,
    errorMessage,
    loadAlbums,
    loadTracks,
    loadAllTracks,
    albumById,
    albumArtist,
  }
})
