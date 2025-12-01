import type { FastifyReply } from 'fastify'
import { drive } from '../googleDrive'

export async function streamAudio(fileId: string, reply: FastifyReply) {
  const response = await drive.files.get(
    {
      fileId,
      alt: 'media'
    },
    {
      responseType: 'stream'
    }
  )

  console.log('response', response)

  reply.header('Content-Type', 'audio/mpeg')
  return reply.send(response.data)
}

export async function streamThumbnail(fileId: string, reply: FastifyReply) {
  const response = await drive.files.get({
    fileId,
    fields: 'thumbnailLink'
  })

  const thumbnailLink = response.data.thumbnailLink
  if (!thumbnailLink) {
    reply.code(404)
    return reply.send({
      error: 'Thumbnail not available'
    })
  }

  return reply.redirect(thumbnailLink)
}

export async function getFilesInFolder(folderId: string) {
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, thumbnailLink)',
  })

  const files = response.data.files ?? []
  return files
}

