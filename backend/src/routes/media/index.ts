import { FastifyPluginAsync } from 'fastify'
import {
  getFilesInFolder,
  searchAudioInFolder
} from '../../services/drive.service'

interface MediaRouteParams {
  id: string
}

interface MusicSearchQuery {
  folderId?: string
  query?: string
  pageSize?: string
  pageToken?: string
}

const mediaRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get<{ Params: MediaRouteParams }>('/folders/:id', async function (request, reply) {
    try {
      const files = await getFilesInFolder(request.params.id)
      return reply.send({ files })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Failed to load folder contents' })
    }
  })

  fastify.get<{ Querystring: MusicSearchQuery }>(
    '/music/search',
    async function (request, reply) {
      const folderId = request.query.folderId?.trim()
      if (!folderId) {
        return reply.code(400).send({ error: 'folderId query parameter is required' })
      }

      const searchTerm = request.query.query?.trim()
      if (!searchTerm || searchTerm.length < 2) {
        return reply
          .code(400)
          .send({ error: 'query parameter must be at least 2 characters long' })
      }

      try {
        const parsedPageSize = request.query.pageSize
          ? Number(request.query.pageSize)
          : undefined

        const result = await searchAudioInFolder({
          folderId,
          query: searchTerm,
          pageSize: parsedPageSize,
          pageToken: request.query.pageToken
        })
        return reply.send(result)
      } catch (error) {
        fastify.log.error(error)
        return reply.code(500).send({ error: 'Unable to search music files' })
      }
    }
  )
}

export const autoPrefix = '/drive'

export default mediaRoutes

