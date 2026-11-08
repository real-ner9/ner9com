import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma } from '@prisma/client'
import {
  LANGUAGES,
  Language,
  NICKNAME,
  TRUST_DAYS,
  loginAnswer,
  minecraftServer,
  modSecretMatches,
  registerMinecraftButtons,
  startLogin
} from '../../services/minecraft'

// The owner's Minecraft server (services/minecraft.ts). The page /minecraft: a signed-in visitor
// claims one nickname. The server's ner9-auth mod: /logins asks
// whether a player may come in, authenticated by MINECRAFT_AUTH_SECRET.
type AccountBody = { Body: { nickname: string; language: Language } }
type LoginBody = { Body: { nickname: string; ip: string } }
type LoginParams = { Params: { id: string } }

const signedIn = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.user) return reply.unauthorized()
}

const fromMod = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!modSecretMatches(request.headers['x-minecraft-secret'])) return reply.unauthorized()
}

const minecraftRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  registerMinecraftButtons(fastify.prisma, fastify.log)

  const accountOf = async (tgId: string) => {
    const account = await fastify.prisma.minecraftAccount.findUnique({
      where: { tgId },
      include: { trustedIps: { orderBy: { lastUsedAt: 'desc' } } }
    })
    return (
      account && {
        nickname: account.nickname,
        addresses: account.trustedIps.map((trusted) => ({
          ip: trusted.ip,
          lastUsedAt: trusted.lastUsedAt
        }))
      }
    )
  }

  fastify.get('/me', async (request, reply) => {
    reply.header('Cache-Control', 'no-store')
    return {
      server: { ...minecraftServer(), trustDays: TRUST_DAYS },
      account: request.user ? await accountOf(request.user.id) : null
    }
  })

  // Claims a nickname, or renames the one already claimed (its confirmed addresses are dropped).
  fastify.put<AccountBody>(
    '/account',
    {
      onRequest: signedIn,
      schema: {
        body: {
          type: 'object',
          required: ['nickname', 'language'],
          properties: {
            nickname: { type: 'string', pattern: NICKNAME.source },
            language: { type: 'string', enum: LANGUAGES }
          }
        }
      }
    },
    async (request, reply) => {
      const tgId = request.user!.id
      const { nickname, language } = request.body
      const nicknameKey = nickname.toLowerCase()
      const taken = await fastify.prisma.minecraftAccount.findUnique({ where: { nicknameKey } })
      if (taken && taken.tgId !== tgId) return reply.conflict('nickname taken')
      try {
        await fastify.prisma.$transaction(async (tx) => {
          const current = await tx.minecraftAccount.findUnique({ where: { tgId } })
          if (!current) {
            await tx.minecraftAccount.create({ data: { tgId, nickname, nicknameKey, language } })
            return
          }
          if (current.nicknameKey !== nicknameKey) {
            await tx.minecraftTrustedIp.deleteMany({ where: { accountId: current.id } })
          }
          await tx.minecraftAccount.update({
            where: { id: current.id },
            data: { nickname, nicknameKey, language }
          })
        })
      } catch (error) {
        // Someone claimed the same nickname a moment earlier.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          return reply.conflict('nickname taken')
        }
        throw error
      }
      request.log.info({ tgId, nickname }, 'Minecraft nickname claimed')
      return { account: await accountOf(tgId) }
    }
  )

  fastify.delete('/account', { onRequest: signedIn }, async (request) => {
    await fastify.prisma.minecraftAccount.deleteMany({ where: { tgId: request.user!.id } })
    return { account: null }
  })

  // Forgets the confirmed addresses: the next login from anywhere asks in Telegram again.
  fastify.delete('/account/addresses', { onRequest: signedIn }, async (request) => {
    await fastify.prisma.minecraftTrustedIp.deleteMany({
      where: { account: { tgId: request.user!.id } }
    })
    return { account: await accountOf(request.user!.id) }
  })

  fastify.post<LoginBody>(
    '/logins',
    {
      onRequest: fromMod,
      schema: {
        body: {
          type: 'object',
          required: ['nickname', 'ip'],
          properties: {
            nickname: { type: 'string', minLength: 1, maxLength: 16 },
            ip: { type: 'string', minLength: 1, maxLength: 64 }
          }
        }
      }
    },
    async (request) => {
      const { nickname, ip } = request.body
      const answer = await startLogin(fastify.prisma, request.log, nickname, ip)
      request.log.info({ nickname, ip, status: answer.status }, 'Minecraft login')
      return answer
    }
  )

  fastify.get<LoginParams>(
    '/logins/:id',
    {
      onRequest: fromMod,
      schema: {
        params: {
          type: 'object',
          properties: { id: { type: 'string', pattern: '^[0-9a-f]{32}$' } }
        }
      }
    },
    async (request) => loginAnswer(request.params.id)
  )
}

export default minecraftRoutes
export const autoPrefix = '/minecraft'
