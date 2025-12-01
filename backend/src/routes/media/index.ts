import { FastifyPluginAsync } from 'fastify'
import { getFilesInFolder } from '../../services/drive.service'

interface MediaRouteParams {
  id: string
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
}

export const autoPrefix = '/drive'

export default mediaRoutes

