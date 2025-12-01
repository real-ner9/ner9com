import { apiGet, apiBaseUrl } from './http-client'

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  thumbnailLink?: string
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

export function getAudioStreamUrl(fileId: string) {
  const sanitized = sanitizeId(fileId)
  if (!sanitized) return ''
  return `${apiBaseUrl}/media/audio/${encodeURIComponent(sanitized)}`
}

export function getThumbnailUrl(fileId: string) {
  const sanitized = sanitizeId(fileId)
  if (!sanitized) return ''
  return `${apiBaseUrl}/media/thumbnail/${encodeURIComponent(sanitized)}`
}

