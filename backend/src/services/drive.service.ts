import type { FastifyReply, FastifyRequest } from 'fastify'
import { drive } from '../googleDrive'

const AUDIO_MIME_FILTER =
  "(mimeType contains 'audio/' or mimeType = 'application/vnd.google-apps.audio')"

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
    fields: 'files(id, name, mimeType, thumbnailLink)',
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

function clampPageSize(value?: number) {
  if (!value || Number.isNaN(value)) {
    return 15
  }

  return Math.max(5, Math.min(50, value))
}

