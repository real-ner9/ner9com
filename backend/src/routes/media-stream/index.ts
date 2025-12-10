import { FastifyPluginAsync } from 'fastify'
import { streamAudio, streamThumbnail } from '../../services/drive.service'

interface MediaStreamParams {
  id: string
}

interface MediaStreamQuery {
  mimeType?: string
}

const mediaStreamRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get<{ Params: MediaStreamParams; Querystring: MediaStreamQuery }>(
    '/audio/:id',
    async function (request, reply) {
      await streamAudio(request.params.id, request, reply, request.query.mimeType)
    }
  )

  fastify.get<{ Params: MediaStreamParams }>('/thumbnail/:id', async function (request, reply) {
    await streamThumbnail(request.params.id, reply)
  })
}

export const autoPrefix = '/media'

export default mediaStreamRoutes

