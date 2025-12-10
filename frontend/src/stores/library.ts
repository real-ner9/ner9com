import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { apiGet, resolveApiUrl } from '@/services/http-client'
import type { MusicAlbum, MusicTrack } from '@/types/music'

export const useLibraryStore = defineStore('library', () => {
  const albums = ref<MusicAlbum[]>([])
  const tracksByAlbum = ref<Record<string, MusicTrack[]>>({})
  const selectedAlbumId = ref<string>('')
  const isLoading = ref(false)
  const isReady = ref(false)
  const errorMessage = ref<string | null>(null)
  const isHydratedAllTracks = ref(false)

  const selectedAlbum = computed(() =>
    albums.value.find((item) => item.id === selectedAlbumId.value) ?? null
  )

  const selectedTracks = computed(() => tracksByAlbum.value[selectedAlbumId.value] ?? [])

  const allTracks = computed(() =>
    Object.values(tracksByAlbum.value)
      .flat()
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }))
  )

  async function loadAlbums() {
    isLoading.value = true
    errorMessage.value = null
    try {
      const response = await apiGet<{ albums: MusicAlbum[] }>('/library/albums')
      albums.value = response.albums.map((album) => ({
        ...album,
        coverUrl: album.coverUrl ? resolveApiUrl(album.coverUrl) : null
      }))
      if (!selectedAlbumId.value && albums.value.length) {
        selectedAlbumId.value = albums.value[0].id
      }
      isReady.value = true
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Не удалось загрузить альбомы'
    } finally {
      isLoading.value = false
    }
  }

  async function loadAlbumTracks(albumId: string) {
    if (!albumId) return
    if (tracksByAlbum.value[albumId]) return

    try {
      const { tracks } = await apiGet<{ album: MusicAlbum; tracks: MusicTrack[] }>(
        `/library/albums/${encodeURIComponent(albumId)}/tracks`
      )
      const normalized = tracks.map((track) => ({
        ...track,
        streamUrl: resolveApiUrl(track.streamUrl),
        coverUrl: track.coverUrl ? resolveApiUrl(track.coverUrl) : null
      }))
      tracksByAlbum.value = {
        ...tracksByAlbum.value,
        [albumId]: normalized
      }
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : 'Не удалось загрузить треки альбома'
    }
  }

  async function ensureAllTracksLoaded() {
    if (isHydratedAllTracks.value) return
    if (!albums.value.length) {
      await loadAlbums()
    }
    const tasks = albums.value.map((album) => loadAlbumTracks(album.id))
    await Promise.all(tasks)
    isHydratedAllTracks.value = true
  }

  function selectAlbum(albumId: string) {
    selectedAlbumId.value = albumId
  }

  return {
    albums,
    selectedAlbum,
    selectedTracks,
    allTracks,
    selectedAlbumId,
    isLoading,
    isReady,
    errorMessage,
    loadAlbums,
    loadAlbumTracks,
    ensureAllTracksLoaded,
    selectAlbum
  }
})
