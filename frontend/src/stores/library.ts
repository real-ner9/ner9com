import { t } from '@/i18n'
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchAlbumTracks, fetchAlbums } from '@/api/library'
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

  return { albums, tracksByAlbum, isLoading, errorMessage, loadAlbums, loadTracks, albumById }
})
