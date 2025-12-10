import { apiGet, apiBaseUrl, type RequestOptions } from './http-client'

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  thumbnailLink?: string
  iconLink?: string
}

export interface DriveFolderResponse {
  files: DriveFile[]
}

export const DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'

export function isDriveFolder(file: DriveFile) {
  return file.mimeType === DRIVE_FOLDER_MIME_TYPE
}

export async function fetchFolderContents(folderId: string) {
  return apiGet<DriveFolderResponse>(`/drive/folders/${folderId}`)
}

function sanitizeId(value: string) {
  return value.trim()
}

export function getAudioStreamUrl(fileId: string, mimeType?: string) {
  const sanitized = sanitizeId(fileId)
  if (!sanitized) return ''

  const base = (apiBaseUrl ?? '').replace(/\/$/, '')
  const path = `/media/audio/${encodeURIComponent(sanitized)}`
  const search = mimeType ? `?mimeType=${encodeURIComponent(mimeType)}` : ''

  if (!base) {
    return `${path}${search}`
  }

  return `${base}${path}${search}`
}

export function getThumbnailUrl(fileId: string) {
  const sanitized = sanitizeId(fileId)
  if (!sanitized) return ''
  return `${apiBaseUrl}/media/thumbnail/${encodeURIComponent(sanitized)}`
}

export interface DriveMusicSearchParams {
  readonly folderId: string
  readonly query?: string
  readonly pageSize?: number
  readonly pageToken?: string
}

export interface DriveMusicSearchResponse {
  readonly files: DriveFile[]
  readonly nextPageToken?: string
}

export function searchMusicFiles(
  params: DriveMusicSearchParams,
  options: RequestOptions = {}
) {
  const searchParams = new URLSearchParams()
  searchParams.set('folderId', params.folderId.trim())

  if (params.query?.trim()) {
    searchParams.set('query', params.query.trim())
  }

  if (params.pageSize) {
    searchParams.set('pageSize', String(params.pageSize))
  }

  if (params.pageToken) {
    searchParams.set('pageToken', params.pageToken)
  }

  return apiGet<DriveMusicSearchResponse>(
    `/drive/music/search?${searchParams.toString()}`,
    options
  )
}

