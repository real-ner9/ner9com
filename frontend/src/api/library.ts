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

/** The 160 px version of a cover URL, for lists and the mini player. */
export function smallCover(url: string | null) {
  if (!url) return null
  return `${url}${url.includes('?') ? '&' : '?'}size=small`
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

/**
 * Every playable track of the library in one request. The response leaves out the URLs (it
 * would repeat them 3 000+ times): the stream URL is rebuilt from id and version, the cover is
 * the album's.
 */
export async function fetchAllTracks(albums: MusicAlbum[]): Promise<MusicTrack[]> {
  const { tracks } = await apiGet<{ tracks: Omit<MusicTrack, 'streamUrl' | 'coverUrl'>[] }>(
    '/library/tracks',
  )
  const covers = new Map(albums.map((album) => [album.id, album.coverUrl]))
  return tracks
    .filter((track) => canPlay(track.mimeType))
    .map((track) => ({
      ...track,
      streamUrl: apiUrl(`/library/stream/${track.id}${track.v ? `?v=${track.v}` : ''}`),
      coverUrl: covers.get(track.albumId) ?? null,
    }))
}

export async function fetchAlbumTracks(albumId: string): Promise<MusicTrack[]> {
  const { tracks } = await apiGet<{ tracks: MusicTrack[] }>(
    `/library/albums/${encodeURIComponent(albumId)}/tracks`,
  )
  return tracks
    .filter((track) => canPlay(track.mimeType))
    .map((track) => ({ ...withUrls(track), streamUrl: apiUrl(track.streamUrl) }))
}
