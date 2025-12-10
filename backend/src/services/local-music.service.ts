import { createReadStream, promises as fs } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { parseFile, parseStream, type IAudioMetadata } from 'music-metadata'

const MUSIC_ROOT = resolve(process.cwd(), 'music')

const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.m4a', '.wav', '.ogg', '.aac']
const COVER_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

export interface LocalAlbum {
  readonly id: string
  readonly name: string
  readonly coverUrl: string | null
  readonly trackCount: number
}

export interface LocalTrack {
  readonly id: string
  readonly albumId: string
  readonly title: string
  readonly fileName: string
  readonly streamUrl: string
  readonly coverUrl: string | null
  readonly trackIndex: number
  readonly mimeType: string
}

interface StreamResult {
  statusCode: number
  headers: Record<string, string | number>
  stream: ReturnType<typeof createReadStream>
}

function toBase64Id(relativePath: string) {
  return Buffer.from(relativePath).toString('base64url')
}

function fromBase64Id(id: string) {
  const decoded = Buffer.from(id, 'base64url').toString('utf8')
  const absolute = resolve(MUSIC_ROOT, decoded)
  if (!absolute.startsWith(MUSIC_ROOT)) {
    throw new Error('Invalid path')
  }
  return absolute
}

function getMimeType(fileName: string) {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.mp3')) return 'audio/mpeg'
  if (lower.endsWith('.flac')) return 'audio/flac'
  if (lower.endsWith('.m4a')) return 'audio/mp4' // широкая поддержка m4a/aac
  if (lower.endsWith('.wav')) return 'audio/wav'
  if (lower.endsWith('.ogg')) return 'audio/ogg'
  if (lower.endsWith('.aac')) return 'audio/aac'
  return 'application/octet-stream'
}

function getCoverMime(fileName: string) {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  return 'image/jpeg'
}

async function listAlbumDirs() {
  const entries = await fs.readdir(MUSIC_ROOT, { withFileTypes: true })
  return entries.filter((entry) => entry.isDirectory())
}

async function findCoverPath(albumPath: string) {
  const entries = await fs.readdir(albumPath)
  for (const name of entries) {
    const lower = name.toLowerCase()
    if (COVER_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      return join(albumPath, name)
    }
  }
  return null
}

async function findTracks(albumPath: string) {
  const entries = await fs.readdir(albumPath)
  return entries
    .filter((name) => {
      const lower = name.toLowerCase()
      return AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext))
    })
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

export async function listAlbums(): Promise<LocalAlbum[]> {
  const dirs = await listAlbumDirs()

  const albums = await Promise.all(
    dirs.map(async (dir) => {
      const albumPath = join(MUSIC_ROOT, dir.name)
      const coverPath = await findCoverPath(albumPath)
      const tracks = await findTracks(albumPath)

      return {
        id: toBase64Id(dir.name),
        name: dir.name,
        coverUrl: coverPath ? `/library/cover/${encodeURIComponent(toBase64Id(dir.name))}` : null,
        trackCount: tracks.length
      }
    })
  )

  return albums
}

export async function getAlbumTracks(albumId: string): Promise<{ album: LocalAlbum; tracks: LocalTrack[] }> {
  const albumPath = fromBase64Id(albumId)
  const albumName = albumPath.split('/').pop() ?? 'Album'

  const coverPath = await findCoverPath(albumPath)
  const coverUrl = coverPath ? `/library/cover/${encodeURIComponent(albumId)}` : null
  const files = await findTracks(albumPath)

  const tracks = files.map((fileName, index) => {
    const relativePath = relative(MUSIC_ROOT, join(albumPath, fileName))
    const trackId = toBase64Id(relativePath)
    return {
      id: trackId,
      albumId,
      title: fileName,
      fileName,
      streamUrl: `/library/stream/${encodeURIComponent(trackId)}`,
      coverUrl,
      trackIndex: index,
      mimeType: getMimeType(fileName)
    }
  })

  const album: LocalAlbum = {
    id: albumId,
    name: albumName,
    coverUrl,
    trackCount: tracks.length
  }

  return { album, tracks }
}

export async function getCoverBuffer(albumId: string) {
  const albumPath = fromBase64Id(albumId)
  const coverPath = await findCoverPath(albumPath)

  if (coverPath) {
    const mime = getCoverMime(coverPath)
    const buffer = await fs.readFile(coverPath)
    return { buffer, mime }
  }

  const tracks = await findTracks(albumPath)
  for (const fileName of tracks) {
    const trackPath = join(albumPath, fileName)
    const embedded = await extractEmbeddedCover(trackPath)
    if (embedded) return embedded
  }

  return null
}

async function extractEmbeddedCover(trackPath: string) {
  try {
    const stream = createReadStream(trackPath, { start: 0, end: 262143 })
    const metadata: IAudioMetadata = await parseStream(stream, undefined, {
      duration: false,
      fileSize: undefined
    })
    const picture = metadata.common.picture?.[0]
    if (picture?.data) {
      const mime = picture.format || 'image/jpeg'
      return { buffer: picture.data, mime }
    }
  } catch (error) {
    console.warn(`Embedded cover parse failed for ${trackPath}`, error)
  }
  return null
}

export async function getTrackStream(trackId: string, rangeHeader?: string): Promise<StreamResult> {
  const trackPath = fromBase64Id(trackId)
  const fileStat = await stat(trackPath)
  const fileSize = fileStat.size

  const mimeType = getMimeType(trackPath)

  // Без Range — отдаем целиком
  if (!rangeHeader) {
    const stream = createReadStream(trackPath)
    return {
      statusCode: 200,
      headers: {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=0'
      },
      stream
    }
  }

  // Поддержка Range
  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
  const start = match && match[1] ? Number(match[1]) : 0
  const end = match && match[2] ? Number(match[2]) : fileSize - 1

  if (Number.isNaN(start) || start >= fileSize) {
    throw new Error('Requested range not satisfiable')
  }

  const chunkStart = Math.min(start, fileSize - 1)
  const chunkEnd = Math.min(end, fileSize - 1)

  const stream = createReadStream(trackPath, { start: chunkStart, end: chunkEnd })

  return {
    statusCode: 206,
    headers: {
      'Content-Range': `bytes ${chunkStart}-${chunkEnd}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkEnd - chunkStart + 1,
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=0'
    },
    stream
  }
}
