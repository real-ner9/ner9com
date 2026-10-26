import { FastifyPluginAsync } from 'fastify'
import { clearSession, isOwner, setSession } from '../../plugins/session'
import { startLogin, takeLogin, telegramBot } from '../../services/telegram'

type TokenParams = { Params: { token: string } }

// Signing in through the Telegram bot (services/telegram.ts): /telegram/start gives the page a
// one-time link to the bot, the page polls /telegram/:token until the bot has confirmed it, and
// that answer sets the session cookie.
const authRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get('/me', async (request) => ({
    user: request.user,
    owner: isOwner(request),
    /** Null when Telegram sign-in isn't configured: the page hides the button. */
    bot: telegramBot()?.username ?? null
  }))

  fastify.post('/telegram/start', async (_request, reply) => {
    const bot = telegramBot()
    if (!bot) return reply.serviceUnavailable('Вход через Telegram не настроен')
    return startLogin(bot.username) ?? reply.tooManyRequests()
  })

  fastify.get<TokenParams>(
    '/telegram/:token',
    {
      schema: {
        params: {
          type: 'object',
          properties: { token: { type: 'string', pattern: '^[0-9a-f]{32}$' } }
        }
      }
    },
    async (request, reply) => {
      const result = takeLogin(request.params.token)
      if (typeof result === 'string') return { status: result }
      setSession(reply, result)
      request.log.info(
        { telegramId: result.id, username: result.username },
        'signed in with Telegram'
      )
      return {
        status: 'ok',
        user: result,
        owner: result.id === process.env.OWNER_TELEGRAM_ID
      }
    }
  )

  fastify.post('/logout', async (_request, reply) => {
    clearSession(reply)
    return { user: null }
  })
}

export default authRoutes
export const autoPrefix = '/auth'
