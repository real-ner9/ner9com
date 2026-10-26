import { FastifyPluginAsync } from 'fastify'
import { getObject, storageEnabled } from '../../services/storage'

type FileParams = { Params: { file: string } }

// Review images from the private S3 bucket. Keys are random UUIDs that never change, so the
// files are cached for good (browsers and Cloudflare).
const FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-480)?\.webp$/

const mediaRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get<FileParams>('/reviews/:file', async (request, reply) => {
    const { file } = request.params
    if (!storageEnabled() || !FILE.test(file)) return reply.notFound()
    try {
      const object = await getObject(`reviews/${file}`)
      reply
        .header('Content-Type', object.contentType)
        .header('Cache-Control', 'public, max-age=31536000, immutable')
      if (object.length) reply.header('Content-Length', object.length)
      return reply.send(object.body)
    } catch {
      return reply.notFound()
    }
  })
}

export default mediaRoutes
export const autoPrefix = '/media'
