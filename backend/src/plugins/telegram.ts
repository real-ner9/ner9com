import fp from 'fastify-plugin'
import { runBot } from '../services/telegram'

// Runs the sign-in bot (services/telegram.ts) alongside the server, when it is configured.
export default fp(async (fastify) => {
  const stop = new AbortController()
  fastify.addHook('onReady', async () => {
    void runBot(fastify.log, stop.signal)
  })
  fastify.addHook('onClose', async () => stop.abort())
})
