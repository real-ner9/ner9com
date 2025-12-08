import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  ContestValidationError,
  getLeaderboardSummary,
  submitContestEntry
} from '../../services/contest.service'

const submissionSchema = z.object({
  instagramHandle: z.string().min(3).max(50),
  telegramHandles: z.string().min(3).max(10_000),
  displayName: z.string().min(3).max(40)
})

type SubmissionBody = z.infer<typeof submissionSchema>

const contestRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: SubmissionBody }>('/submissions', async (request, reply) => {
    const validation = submissionSchema.safeParse(request.body)
    if (!validation.success) {
      return reply.badRequest(validation.error.issues[0]?.message ?? 'Некорректные данные')
    }

    try {
      const submissionResult = await submitContestEntry(fastify.prisma, validation.data)
      const leaderboard = await getLeaderboardSummary(fastify.prisma)
      return reply.code(201).send({
        submission: submissionResult,
        leaderboard
      })
    } catch (error) {
      if (error instanceof ContestValidationError) {
        return reply.badRequest(error.message)
      }
      fastify.log.error({ err: error }, 'contest submission failed')
      return reply.internalServerError('Не удалось сохранить заявку')
    }
  })

  fastify.get('/leaderboard', async (_request, reply) => {
    try {
      const leaderboard = await getLeaderboardSummary(fastify.prisma)
      return reply.send(leaderboard)
    } catch (error) {
      fastify.log.error({ err: error }, 'leaderboard load failed')
      return reply.internalServerError('Не удалось загрузить рейтинг')
    }
  })
}

export const autoPrefix = '/contest'

export default contestRoutes

