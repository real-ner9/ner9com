import { createHash } from 'node:crypto'
import { createReadStream, promises as fs } from 'node:fs'
import { basename, extname, join, relative, resolve, sep } from 'node:path'
import { parseFile } from 'music-metadata'
import sharp from 'sharp'

/**
 * Music library backed by a folder (MUSIC_DIR, `music/` by default): one sub-folder per album,
 * audio files inside, optionally a cover image. scripts/build_web_library.py produces that layout
 * from the owner's nested collection.
 *
 * Album and track ids are short hashes of the path relative to MUSIC_ROOT (with forward slashes,
 * so they match across OSes). They must stay short: Fastify rejects URL params over 100 chars
 * with a 404, which is what broke long album + track names when ids were base64 paths. Ids only
 * resolve through an index of real files, so a request can never reach outside the library.
 */
const MUSIC_ROOT = resolve(process.cwd(), process.env.MUSIC_DIR || 'music')

const AUDIO_MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.aac': 'audio/aac'
}

const COVER_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
}

export interface LocalAlbum {
  readonly id: string
  readonly name: string
  readonly coverUrl: string | null
  /** From album.json (written by scripts/build_web_library.py); null without one. */
  readonly artist: string | null
  readonly trackCount: number
  /** Track count per exact MIME type, so clients can hide albums their browser can't play. */
  readonly formats: Record<string, number>
}

export interface LocalTrack {
  readonly id: string
  readonly albumId: string
  readonly title: string
  readonly artist: string | null
  /** Seconds; null when the file has no usable duration info. */
  readonly duration: number | null
  readonly streamUrl: string
  readonly coverUrl: string | null
  readonly trackIndex: number
  /** With the codec where it matters, e.g. `audio/mp4; codecs="alac"`, for canPlayType(). */
  readonly mimeType: string
}

interface Cover {
  buffer: Buffer
  mime: string
}

interface TrackTags {
  title: string
  artist: string | null
  duration: number | null
  mimeType: string
}

export interface StreamResult {
  statusCode: number
  headers: Record<string, string | number>
  stream: ReturnType<typeof createReadStream>
}

/** Where an album's cover comes from: an image file in the folder or art embedded in a track. */
type CoverSource = { file: string } | { track: string }

// Files on disk rarely change while the server runs, so metadata is cached per path. Only the
// cover's source is kept, not the image: originals of hundreds of albums would fill the memory.
const coverSourceCache = new Map<string, CoverSource | null>()
const thumbnailCache = new Map<string, Cover>()
const tagCache = new Map<string, TrackTags>()
const artistCache = new Map<string, string | null>()

/** Covers are served as square webp thumbnails: originals can be several hundred KB. */
const COVER_SIZE = 600

/** id -> absolute path of every album folder and track file seen so far. */
const pathsById = new Map<string, string>()

function toId(absolutePath: string) {
  const relativePath = relative(MUSIC_ROOT, absolutePath).split(sep).join('/')
  const id = createHash('sha1').update(relativePath).digest('base64url').slice(0, 16)
  pathsById.set(id, absolutePath)
  return id
}

async function resolveId(id: string) {
  // After a restart the index is empty while clients still hold ids: rebuild it once on a miss.
  if (!pathsById.has(id)) await indexLibrary()
  const path = pathsById.get(id)
  if (!path) throw new Error(`Unknown id ${id}`)
  return path
}

async function indexLibrary() {
  const entries = await fs.readdir(MUSIC_ROOT, { withFileTypes: true })
  for (const entry of entries.filter((e) => e.isDirectory())) {
    const albumPath = join(MUSIC_ROOT, entry.name)
    toId(albumPath)
    for (const file of await listTrackFiles(albumPath)) toId(join(albumPath, file))
  }
}

const isAudio = (name: string) => extname(name).toLowerCase() in AUDIO_MIME
const isCover = (name: string) => extname(name).toLowerCase() in COVER_MIME

/** Audio files of an album in track order. Zero-byte files (broken commits) are skipped. */
async function listTrackFiles(albumPath: string) {
  const entries = (await fs.readdir(albumPath)).filter(isAudio)
  const sizes = await Promise.all(entries.map((name) => fs.stat(join(albumPath, name))))
  return entries
    .filter((_, index) => sizes[index].size > 0)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

/** "01 - Song.mp3" -> "Song". Used when a file has no title tag. */
function titleFromFileName(fileName: string) {
  return basename(fileName, extname(fileName)).replace(/^\d+\s*[-.)_]?\s*/, '') || fileName
}

async function readTags(trackPath: string): Promise<TrackTags> {
  // Keyed by size and mtime too: a file replaced under the same name (re-encoded, re-uploaded)
  // gets its tags read again.
  const { size, mtimeMs } = await fs.stat(trackPath)
  const key = `${trackPath}:${size}:${mtimeMs}`
  const cached = tagCache.get(key)
  if (cached) return cached

  const baseMime = AUDIO_MIME[extname(trackPath).toLowerCase()]
  let tags: TrackTags = {
    title: titleFromFileName(basename(trackPath)),
    artist: null,
    duration: null,
    mimeType: baseMime,
  }
  try {
    const { common, format } = await parseFile(trackPath, { duration: false, skipCovers: true })
    tags = {
      title: common.title?.trim() || tags.title,
      artist: common.artist?.trim() || null,
      duration: format.duration ? Math.round(format.duration) : null,
      mimeType: mimeWithCodec(baseMime, format.codec),
    }
  } catch {
    // Unreadable tags are not fatal: fall back to the file name.
  }
  tagCache.set(key, tags)
  return tags
}

/**
 * An .m4a can hold AAC (plays everywhere) or Apple Lossless (Safari only), so the container
 * type alone doesn't tell a browser whether it can play the file.
 */
function mimeWithCodec(baseMime: string, codec: string | undefined) {
  if (baseMime !== 'audio/mp4' || !codec) return baseMime
  if (/alac/i.test(codec)) return 'audio/mp4; codecs="alac"'
  if (/aac|mp4a/i.test(codec)) return 'audio/mp4; codecs="mp4a.40.2"'
  return baseMime
}

async function embeddedPicture(trackPath: string) {
  try {
    const { common } = await parseFile(trackPath, { duration: false })
    return common.picture?.[0] ?? null
  } catch {
    return null
  }
}

async function findCover(albumPath: string): Promise<CoverSource | null> {
  if (coverSourceCache.has(albumPath)) return coverSourceCache.get(albumPath) ?? null

  let source: CoverSource | null = null
  const coverFile = (await fs.readdir(albumPath)).find(isCover)
  if (coverFile) {
    source = { file: join(albumPath, coverFile) }
  } else {
    const [firstTrack] = await listTrackFiles(albumPath)
    if (firstTrack && (await embeddedPicture(join(albumPath, firstTrack))))
      source = { track: join(albumPath, firstTrack) }
  }

  // "No cover" isn't remembered: during an upload the image arrives after the tracks.
  if (source) coverSourceCache.set(albumPath, source)
  return source
}

async function loadCover(albumPath: string): Promise<Cover | null> {
  const source = await findCover(albumPath)
  if (!source) return null
  if ('file' in source) {
    return {
      buffer: await fs.readFile(source.file),
      mime: COVER_MIME[extname(source.file).toLowerCase()]
    }
  }
  const picture = await embeddedPicture(source.track)
  return picture?.data
    ? { buffer: Buffer.from(picture.data), mime: picture.format || 'image/jpeg' }
    : null
}

/** The album's artist from its album.json, if it has one. */
async function albumArtist(albumPath: string) {
  if (artistCache.has(albumPath)) return artistCache.get(albumPath) ?? null
  let artist: string | null = null
  try {
    const info = JSON.parse(await fs.readFile(join(albumPath, 'album.json'), 'utf8'))
    if (typeof info?.artist === 'string' && info.artist.trim()) artist = info.artist.trim()
  } catch {
    // No album.json (albums added by hand): clients fall back to the tracks' tags.
  }
  // Same for a missing album.json, which an upload adds after the tracks.
  if (artist) artistCache.set(albumPath, artist)
  return artist
}

async function coverUrlFor(albumId: string, albumPath: string) {
  return (await findCover(albumPath)) ? `/library/cover/${albumId}` : null
}

export async function listAlbums(): Promise<LocalAlbum[]> {
  const entries = await fs.readdir(MUSIC_ROOT, { withFileTypes: true })
  const dirs = entries
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

  const albums = await Promise.all(
    dirs.map(async (dir) => {
      const albumPath = join(MUSIC_ROOT, dir.name)
      const id = toId(albumPath)
      const files = await listTrackFiles(albumPath)
      const formats: Record<string, number> = {}
      for (const file of files) {
        const { mimeType } = await readTags(join(albumPath, file))
        formats[mimeType] = (formats[mimeType] ?? 0) + 1
      }
      return {
        id,
        name: dir.name,
        coverUrl: await coverUrlFor(id, albumPath),
        artist: await albumArtist(albumPath),
        trackCount: files.length,
        formats
      }
    })
  )
  return albums.filter((album) => album.trackCount > 0)
}

export async function getAlbumTracks(albumId: string) {
  const albumPath = await resolveId(albumId)
  const coverUrl = await coverUrlFor(albumId, albumPath)
  const files = await listTrackFiles(albumPath)

  const tracks: LocalTrack[] = await Promise.all(
    files.map(async (fileName, index) => {
      const trackPath = join(albumPath, fileName)
      const id = toId(trackPath)
      return {
        id,
        albumId,
        ...(await readTags(trackPath)),
        streamUrl: `/library/stream/${id}`,
        coverUrl,
        trackIndex: index
      }
    })
  )

  const formats: Record<string, number> = {}
  for (const track of tracks) formats[track.mimeType] = (formats[track.mimeType] ?? 0) + 1
  const album: LocalAlbum = {
    id: albumId,
    name: basename(albumPath),
    coverUrl,
    artist: await albumArtist(albumPath),
    trackCount: tracks.length,
    formats
  }

  return { album, tracks }
}

/** Every track of every album, in album order (for the Songs and Artists menus). */
export async function getAllTracks() {
  const albums = await listAlbums()
  const lists = await Promise.all(albums.map((album) => getAlbumTracks(album.id)))
  return lists.flatMap(({ tracks }) => tracks)
}

export async function getCover(albumId: string): Promise<Cover | null> {
  const albumPath = await resolveId(albumId)
  const cached = thumbnailCache.get(albumPath)
  if (cached) return cached

  const original = await loadCover(albumPath)
  if (!original) return null
  try {
    const buffer = await sharp(original.buffer)
      .resize(COVER_SIZE, COVER_SIZE, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()
    const thumbnail = { buffer, mime: 'image/webp' }
    thumbnailCache.set(albumPath, thumbnail)
    return thumbnail
  } catch {
    // Image sharp can't decode: send the original rather than nothing.
    return original
  }
}

/** Streams a track, honouring an HTTP Range header so browsers can seek without downloading it all. */
export async function getTrackStream(trackId: string, rangeHeader?: string): Promise<StreamResult> {
  const trackPath = await resolveId(trackId)
  const fileSize = (await fs.stat(trackPath)).size
  const baseHeaders = {
    'Content-Type': AUDIO_MIME[extname(trackPath).toLowerCase()] ?? 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=3600'
  }

  const match = rangeHeader?.match(/bytes=(\d*)-(\d*)/)
  if (!match) {
    return {
      statusCode: 200,
      headers: { ...baseHeaders, 'Content-Length': fileSize },
      stream: createReadStream(trackPath)
    }
  }

  // "bytes=-500" means the last 500 bytes.
  let start = match[1] ? Number(match[1]) : fileSize - Number(match[2])
  let end = match[1] && match[2] ? Number(match[2]) : fileSize - 1
  start = Math.max(0, start)
  end = Math.min(end, fileSize - 1)

  if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
    throw new RangeNotSatisfiableError(fileSize)
  }

  return {
    statusCode: 206,
    headers: {
      ...baseHeaders,
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': end - start + 1
    },
    stream: createReadStream(trackPath, { start, end })
  }
}

export class RangeNotSatisfiableError extends Error {
  constructor(readonly fileSize: number) {
    super('Requested range not satisfiable')
  }
}
