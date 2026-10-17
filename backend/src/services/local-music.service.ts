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
  /** File version, also in streamUrl. */
  readonly v: string
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
  /** Changes when the file does; appended to the stream URL so it can be cached for good. */
  v: string
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

/**
 * Covers are served as square webp thumbnails: originals can be several hundred KB. The library
 * build writes them as thumb-600.webp / thumb-160.webp; sharp makes them only for albums without.
 */
export type CoverSize = 'large' | 'small'
const COVER_PX: Record<CoverSize, number> = { large: 600, small: 160 }

/** The album list and track lists are rebuilt in the background when older than this. */
const SNAPSHOT_TTL_MS = 60_000

/** Short hash of a file's size and mtime, used as the `?v=` of its URL. */
function versionOf({ size, mtimeMs }: { size: number; mtimeMs: number }) {
  return createHash('sha1').update(`${size}:${mtimeMs}`).digest('base64url').slice(0, 8)
}

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
const isThumbnail = (name: string) => name.startsWith('thumb-')
const isCover = (name: string) => extname(name).toLowerCase() in COVER_MIME && !isThumbnail(name)

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
  const stat = await fs.stat(trackPath)
  const key = `${trackPath}:${stat.size}:${stat.mtimeMs}`
  const cached = tagCache.get(key)
  if (cached) return cached

  const baseMime = AUDIO_MIME[extname(trackPath).toLowerCase()]
  let tags: TrackTags = {
    title: titleFromFileName(basename(trackPath)),
    artist: null,
    duration: null,
    mimeType: baseMime,
    v: versionOf(stat),
  }
  try {
    const { common, format } = await parseFile(trackPath, { duration: false, skipCovers: true })
    tags = {
      title: common.title?.trim() || tags.title,
      artist: common.artist?.trim() || null,
      duration: format.duration ? Math.round(format.duration) : null,
      mimeType: mimeWithCodec(baseMime, format.codec),
      v: tags.v,
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
  const images = (await fs.readdir(albumPath)).filter(isCover)
  const coverFile = images.find((name) => name.startsWith('cover.')) ?? images[0]
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
  const source = await findCover(albumPath)
  if (!source) return null
  const v = versionOf(await fs.stat('file' in source ? source.file : source.track))
  return `/library/cover/${albumId}?v=${v}`
}

async function readAlbum(albumId: string, albumPath: string) {
  const coverUrl = await coverUrlFor(albumId, albumPath)
  const files = await listTrackFiles(albumPath)

  const tracks: LocalTrack[] = await Promise.all(
    files.map(async (fileName, index) => {
      const trackPath = join(albumPath, fileName)
      const id = toId(trackPath)
      const tags = await readTags(trackPath)
      return {
        id,
        albumId,
        ...tags,
        streamUrl: `/library/stream/${id}?v=${tags.v}`,
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

// --- Library snapshot ----------------------------------------------------------------------
// Scanning a few thousand files takes seconds, so requests are answered from the last scan and a
// scan older than SNAPSHOT_TTL_MS is redone in the background (new uploads show up within it).

interface Snapshot {
  albums: LocalAlbum[]
  tracksByAlbum: Map<string, LocalTrack[]>
  builtAt: number
}

let snapshot: Snapshot | null = null
let building: Promise<Snapshot> | null = null

async function scan(): Promise<Snapshot> {
  const entries = await fs.readdir(MUSIC_ROOT, { withFileTypes: true })
  const dirs = entries
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

  const read = await Promise.all(
    dirs.map((dir) => {
      const albumPath = join(MUSIC_ROOT, dir.name)
      return readAlbum(toId(albumPath), albumPath)
    })
  )
  const withTracks = read.filter(({ album }) => album.trackCount > 0)
  return {
    albums: withTracks.map(({ album }) => album),
    tracksByAlbum: new Map(withTracks.map(({ album, tracks }) => [album.id, tracks])),
    builtAt: Date.now()
  }
}

function rescan() {
  building ??= scan()
    .then((next) => (snapshot = next))
    .finally(() => (building = null))
  return building
}

async function library() {
  if (!snapshot) return rescan()
  if (Date.now() - snapshot.builtAt > SNAPSHOT_TTL_MS) void rescan().catch(() => {})
  return snapshot
}

export async function listAlbums(): Promise<LocalAlbum[]> {
  return (await library()).albums
}

export async function getAlbumTracks(albumId: string) {
  const { albums, tracksByAlbum } = await library()
  const album = albums.find((a) => a.id === albumId)
  const tracks = tracksByAlbum.get(albumId)
  if (album && tracks) return { album, tracks }
  // Not in the last scan (just uploaded): read it directly.
  return readAlbum(albumId, await resolveId(albumId))
}

/** Every track of every album, in album order (for the Songs and Artists menus). */
export async function getAllTracks() {
  const { albums, tracksByAlbum } = await library()
  return albums.flatMap((album) => tracksByAlbum.get(album.id) ?? [])
}

/** `v` (from the URL) keys the memory cache, so a replaced cover isn't served stale. */
export async function getCover(
  albumId: string,
  size: CoverSize = 'large',
  v = ''
): Promise<Cover | null> {
  const albumPath = await resolveId(albumId)
  const px = COVER_PX[size]
  const key = `${albumPath}:${px}:${v}`
  const cached = thumbnailCache.get(key)
  if (cached) return cached

  // Ready-made by the library build.
  const ready = await fs.readFile(join(albumPath, `thumb-${px}.webp`)).catch(() => null)
  if (ready) {
    const thumbnail = { buffer: ready, mime: 'image/webp' }
    thumbnailCache.set(key, thumbnail)
    return thumbnail
  }

  const original = await loadCover(albumPath)
  if (!original) return null
  try {
    const buffer = await sharp(original.buffer)
      .resize(px, px, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()
    const thumbnail = { buffer, mime: 'image/webp' }
    thumbnailCache.set(key, thumbnail)
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
