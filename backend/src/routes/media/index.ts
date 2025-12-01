import { FastifyPluginAsync } from 'fastify'
import { streamAudio, streamThumbnail } from '../../services/drive.service'

interface MediaRouteParams {
  id: string
}

const mediaRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get<{ Params: MediaRouteParams }>('/audio/:id', async function (request, reply) {
    await streamAudio(request.params.id, reply)
  })

  fastify.get<{ Params: MediaRouteParams }>('/thumbnail/:id', async function (request, reply) {
    await streamThumbnail(request.params.id, reply)
  })
}

export const autoPrefix = '/media'

export default mediaRoutes

