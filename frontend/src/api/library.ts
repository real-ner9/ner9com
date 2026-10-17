import { apiGet, apiUrl } from '@/api/http'
import type { MusicAlbum, MusicTrack } from '@/types/music'

// The backend returns paths like "/library/stream/<id>"; turn them into fetchable URLs here so
// components never deal with the API prefix.
const withUrls = <T extends { coverUrl: string | null }>(item: T): T => ({
  ...item,
  coverUrl: item.coverUrl ? apiUrl(item.coverUrl) : null,
})

// Not every browser plays every file: Apple Lossless (.m4a ALAC) only works in Safari. Tracks the
// current browser can't play are hidden instead of failing with an error when tapped.
const playable = new Map<string, boolean>()
export function canPlay(mimeType: string) {
  let result = playable.get(mimeType)
  if (result === undefined) {
    result = typeof Audio === 'undefined' || new Audio().canPlayType(mimeType) !== ''
    playable.set(mimeType, result)
  }
  return result
}

export async function fetchAlbums(): Promise<MusicAlbum[]> {
  const { albums } = await apiGet<{ albums: MusicAlbum[] }>('/library/albums')
  return albums
    .map((album) => ({
      ...withUrls(album),
      trackCount: Object.entries(album.formats ?? {}).reduce(
        (sum, [mime, count]) => sum + (canPlay(mime) ? count : 0),
        0,
      ),
    }))
    .filter((album) => album.trackCount > 0)
}

export async function fetchAlbumTracks(albumId: string): Promise<MusicTrack[]> {
  const { tracks } = await apiGet<{ tracks: MusicTrack[] }>(
    `/library/albums/${encodeURIComponent(albumId)}/tracks`,
  )
  return tracks
    .filter((track) => canPlay(track.mimeType))
    .map((track) => ({ ...withUrls(track), streamUrl: apiUrl(track.streamUrl) }))
}
