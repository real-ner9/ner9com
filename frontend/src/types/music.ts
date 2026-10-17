export interface MusicAlbum {
  id: string
  name: string
  coverUrl: string | null
  /** The collection's artist folder, when the library was built by the script. */
  artist?: string | null
  trackCount: number
  /** Track count per exact MIME type (with codec), e.g. { 'audio/mpeg': 12 }. */
  formats: Record<string, number>
}

export interface MusicTrack {
  id: string
  albumId: string
  title: string
  artist: string | null
  /** Seconds, when the file reports it. */
  duration: number | null
  streamUrl: string
  coverUrl: string | null
  trackIndex: number
  /** Includes the codec where it matters, e.g. `audio/mp4; codecs="alac"`. */
  mimeType: string
  /** File version; part of streamUrl so the file can be cached for good. */
  v?: string
}
