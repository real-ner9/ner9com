import { FastifyPluginAsync } from 'fastify'
import { Prisma } from '@prisma/client'

// A visitor's settings (theme, language, player, dancers). The id is a random UUID the frontend
// keeps in a cookie; there is no account behind it, so the state is just stored and returned.
type IdParams = { Params: { id: string } }

const MAX_STATE_BYTES = 8 * 1024

const idSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', format: 'uuid' } }
} as const

const stateRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  // A new visitor is not an error: { state: null } (a 404 would show up red in their console).
  fastify.get<IdParams>('/:id', { schema: { params: idSchema } }, async (request) => {
    const row = await fastify.prisma.visitorState.findUnique({
      where: { id: request.params.id }
    })
    return { state: row?.state ?? null, updatedAt: row?.updatedAt ?? null }
  })

  fastify.put<IdParams & { Body: { state: Prisma.InputJsonObject } }>(
    '/:id',
    {
      bodyLimit: MAX_STATE_BYTES,
      schema: {
        params: idSchema,
        body: {
          type: 'object',
          required: ['state'],
          properties: { state: { type: 'object' } }
        }
      }
    },
    async (request) => {
      const { id } = request.params
      const { state } = request.body
      const row = await fastify.prisma.visitorState.upsert({
        where: { id },
        create: { id, state },
        update: { state }
      })
      return { updatedAt: row.updatedAt }
    }
  )
}

export default stateRoutes
export const autoPrefix = '/state'
