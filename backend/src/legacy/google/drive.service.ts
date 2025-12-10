import type { FastifyReply, FastifyRequest } from 'fastify'
import { parseBuffer } from 'music-metadata'
import { Buffer } from 'node:buffer'
import { drive } from './googleDrive'

const AUDIO_MIME_FILTER =
  "(mimeType contains 'audio/' or mimeType = 'application/vnd.google-apps.audio')"
const EMBEDDED_COVER_RANGE = 'bytes=0-200000'

export async function streamAudio(
  fileId: string,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const response = await drive.files.get(
      {
        fileId,
        alt: 'media',
        supportsAllDrives: true
      },
      {
        responseType: 'stream',
        headers: request.headers.range
          ? {
              Range: request.headers.range
            }
          : undefined
      }
    )

    const contentType =
      (response.headers && response.headers['content-type']) || 'audio/mpeg'

    reply.code(response.status ?? (request.headers.range ? 206 : 200))

    for (const [headerName, headerValue] of Object.entries(response.headers ?? {})) {
      if (typeof headerValue === 'string') {
        reply.header(headerName, headerValue)
      }
    }

    reply.header('Content-Type', contentType)
    return reply.send(response.data)
  } catch (error) {
    console.error('Failed to stream audio', error)
    reply.code(404)
    return reply.send({ error: 'Audio could not be streamed' })
  }
}

export async function streamThumbnail(fileId: string, reply: FastifyReply) {
  try {
    const response = await drive.files.get({
      fileId,
      fields: 'thumbnailLink, iconLink',
      supportsAllDrives: true
    })

    const target = response.data.thumbnailLink ?? response.data.iconLink

    if (!target) {
      reply.code(404)
      return reply.send({
        error: 'Thumbnail not available'
      })
    }

    return reply.redirect(target)
  } catch (error) {
    console.error('Failed to load thumbnail', error)
    reply.code(404)
    return reply.send({
      error: 'Thumbnail not available'
    })
  }
}

export async function getFilesInFolder(folderId: string) {
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, thumbnailLink, iconLink)',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true
  })

  const files = response.data.files ?? []
  return files
}

function escapeDriveValue(value: string) {
  return value.replace(/['\\]/g, '\\$&')
}

function buildAudioSearchQuery(folderId: string, query?: string) {
  const normalizedFolderId = escapeDriveValue(folderId)
  const filters = [
    `'${normalizedFolderId}' in parents`,
    'trashed = false',
    AUDIO_MIME_FILTER
  ]

  if (query) {
    filters.push(`name contains '${escapeDriveValue(query)}'`)
  }

  return filters.join(' and ')
}

export interface DriveAudioSearchOptions {
  readonly folderId: string
  readonly query?: string
  readonly pageSize?: number
  readonly pageToken?: string
}

export interface DriveAudioSearchResponse {
  readonly files: Array<{
    readonly id?: string | null
    readonly name?: string | null
    readonly mimeType?: string | null
    readonly thumbnailLink?: string | null
    readonly iconLink?: string | null
  }>
  readonly nextPageToken?: string
}

export async function searchAudioInFolder(
  options: DriveAudioSearchOptions
): Promise<DriveAudioSearchResponse> {
  if (!options.folderId) {
    throw new Error('folderId is required for audio search')
  }

  const response = await drive.files.list({
    q: buildAudioSearchQuery(options.folderId, options.query?.trim()),
    pageSize: clampPageSize(options.pageSize),
    pageToken: options.pageToken,
    spaces: 'drive',
    orderBy: 'name_natural',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    fields:
      'nextPageToken, files(id, name, mimeType, thumbnailLink, iconLink, driveId)'
  })

  return {
    files: response.data.files ?? [],
    nextPageToken: response.data.nextPageToken ?? undefined
  }
}

export interface DriveAudioFile {
  readonly id: string
  readonly name?: string | null
  readonly mimeType?: string | null
  readonly thumbnailLink?: string | null
  readonly iconLink?: string | null
  readonly embeddedThumbnail?: string | null
}

export async function listAudioWithEmbeddedThumbnails(
  folderId: string
): Promise<DriveAudioFile[]> {
  const response = await drive.files.list({
    q: buildAudioSearchQuery(folderId),
    fields: 'files(id, name, mimeType, thumbnailLink, iconLink)',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    orderBy: 'name_natural'
  })

  const files = response.data.files ?? []

  const results = await Promise.all(
    files
      .filter((file) => Boolean(file.id))
      .map(async (file) => {
        const embeddedThumbnail = await extractEmbeddedThumbnail(
          file.id as string,
          file.mimeType ?? undefined
        )

        return {
          id: file.id as string,
          name: file.name,
          mimeType: file.mimeType,
          thumbnailLink: file.thumbnailLink,
          iconLink: file.iconLink,
          embeddedThumbnail
        }
      })
  )

  return results
}

export async function extractEmbeddedThumbnail(fileId: string, mimeType?: string | null) {
  try {
    const response = await drive.files.get(
      {
        fileId,
        alt: 'media',
        supportsAllDrives: true
      },
      {
        responseType: 'arraybuffer',
        headers: {
          Range: EMBEDDED_COVER_RANGE
        }
      }
    )

    const buffer = normalizeToBuffer(response.data)

    const metadata = await parseBuffer(buffer, { mimeType: mimeType ?? 'audio/mpeg' })
    const picture = metadata.common.picture?.[0]

    if (picture?.data) {
      const base64 = Buffer.from(picture.data).toString('base64')
      const mime = picture.format || 'image/jpeg'
      return `data:${mime};base64,${base64}`
    }
  } catch (error) {
    console.warn(`Failed to parse embedded thumbnail for file ${fileId}`, error)
    return null
  }

  return null
}

function normalizeToBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) {
    return value
  }

  if (value instanceof ArrayBuffer) {
    return Buffer.from(value)
  }

  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer)
  }

  if (typeof value === 'string') {
    return Buffer.from(value)
  }

  throw new Error('Unsupported buffer type from Drive API response')
}

function clampPageSize(value?: number) {
  if (!value || Number.isNaN(value)) {
    return 15
  }

  return Math.max(5, Math.min(50, value))
}
