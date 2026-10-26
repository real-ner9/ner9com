import fp from 'fastify-plugin'
import { clientIp, isBanned } from '../services/bans'

// A banned IP gets nothing from the API but the /ban routes (status, unban). nginx does the same
// for the pages themselves (frontend/nginx.conf.template, /_ban_check).
export default fp(async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.url.startsWith('/ban/')) return
    if (await isBanned(fastify, clientIp(request))) {
      return reply.code(403).send({ banned: true, message: 'Banned' })
    }
  })
})
