export interface MusicAlbum {
  id: string
  name: string
  coverUrl: string | null
  trackCount: number
}

export interface MusicTrack {
  id: string
  albumId: string
  title: string
  fileName: string
  streamUrl: string
  coverUrl: string | null
  trackIndex: number
  mimeType: string
}
