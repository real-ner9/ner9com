import { FastifyPluginAsync } from 'fastify'

/** Health check. */
const root: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }))
}

export default root
