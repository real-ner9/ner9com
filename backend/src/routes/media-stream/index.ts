import { FastifyPluginAsync } from 'fastify'
import { streamAudio, streamThumbnail } from '../../services/drive.service'

interface MediaStreamParams {
  id: string
}

const mediaStreamRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get<{ Params: MediaStreamParams }>('/audio/:id', async function (request, reply) {
    console.log(request.params)
    await streamAudio(request.params.id, reply)
  })

  fastify.get<{ Params: MediaStreamParams }>('/thumbnail/:id', async function (request, reply) {
    await streamThumbnail(request.params.id, reply)
  })
}

export const autoPrefix = '/media'

export default mediaStreamRoutes

