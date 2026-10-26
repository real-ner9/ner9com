import { FastifyPluginAsync } from 'fastify'
import { isOwner } from '../../plugins/session'
import { OWNER_PROJECTS } from '../../services/ownerProjects'

// The owner's own tools. Anyone else gets a plain 404, as if the route didn't exist.
const ownerRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.addHook('onRequest', async (request, reply) => {
    if (!isOwner(request)) return reply.notFound()
  })

  fastify.get('/projects', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store')
    return { projects: OWNER_PROJECTS }
  })
}

export default ownerRoutes
export const autoPrefix = '/owner'
