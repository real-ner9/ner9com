import { FastifyPluginAsync } from 'fastify'
import { clientIp, isBanned, unban } from '../../services/bans'

const banRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  // For nginx's auth_request in front of every page: 204 lets the page through, 403 swaps in
  // banned.html.
  fastify.get('/check', async (request, reply) =>
    reply.code((await isBanned(fastify, clientIp(request))) ? 403 : 204).send()
  )

  fastify.get('/status', async (request) => ({
    banned: await isBanned(fastify, clientIp(request))
  }))

  // "Followed on Instagram": taken on trust, there is no way to check.
  fastify.post('/unban', async (request) => {
    await unban(fastify, clientIp(request))
    return { banned: false }
  })
}

export default banRoutes
export const autoPrefix = '/ban'
