import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { isOwner } from '../../plugins/session'
import { ban, clientIp, visitorKey } from '../../services/bans'
import { looksLikeSqlInjection } from '../../services/injection'
import { REVIEW_PROJECTS, ReviewProject } from '../../services/projects'
import { MAX_IMAGES, imageUrls, storeImage } from '../../services/reviewImages'
import { storageEnabled } from '../../services/storage'

// Reviews of the owner's projects, one thread per project (`project`), behind the "SQL injection
// field (review)": reviews with a rating, images, replies
// and likes. Everything is published at once; an injection attempt in any text bans the sender's
// IP (services/bans.ts). Signed in with Telegram (plugins/session.ts), a post carries the
// account's name and avatar and its author may delete it; the owner's posts are badged and the
// owner may delete anything.
type IdParams = { Params: { id: number } }
type TextBody = { name?: string; text: string; imageIds?: string[] }
type ReviewBody = { Body: TextBody & { project: ReviewProject; rating: number } }
type ReplyBody = { Body: TextBody }
type VoteBody = { Body: { value: -1 | 0 | 1 } }

const LIST_LIMIT = 200
/** "Top" ranks this many latest reviews by score and shows the best LIST_LIMIT of them. */
const TOP_POOL = 2000

type ListQuery = { Querystring: { project: ReviewProject; sort?: 'top' | 'new' } }
const projectSchema = { type: 'string', enum: REVIEW_PROJECTS } as const
const HOUR_MS = 60 * 60 * 1000

/** Per IP per hour, against spam. */
const LIMITS = { review: 3, reply: 10, upload: 12 } as const
const recent = new Map<string, number[]>()

function rateLimited(kind: keyof typeof LIMITS, ip: string) {
  const key = `${kind}:${ip}`
  const now = Date.now()
  const times = (recent.get(key) ?? []).filter((time) => now - time < HOUR_MS)
  recent.set(key, times)
  if (times.length >= LIMITS[kind]) return true
  times.push(now)
  return false
}

/** Telegram author fields for a new post (all null when posting anonymously). */
const authorOf = (request: FastifyRequest) => ({
  authorTgId: request.user?.id ?? null,
  authorUsername: request.user?.username ?? null,
  authorPhoto: request.user?.photoUrl ?? null
})

const textSchema = {
  // May be empty when signed in (the Telegram name is used); checkText refuses an empty name.
  name: { type: 'string', maxLength: 40 },
  text: { type: 'string', minLength: 1, maxLength: 1000 },
  imageIds: {
    type: 'array',
    maxItems: MAX_IMAGES,
    uniqueItems: true,
    items: { type: 'string', format: 'uuid' }
  }
} as const

const idParams = { type: 'object', properties: { id: { type: 'integer' } } } as const

const imageSelect = { select: { id: true, width: true, height: true } } as const
const withUrls = (image: { id: string; width: number; height: number }) => ({
  ...image,
  ...imageUrls(image.id)
})

const reviewsRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  /**
   * Bans and answers 403 when a text looks like an SQL injection; otherwise returns the trimmed
   * name and text, or null after answering an error.
   */
  async function checkText(request: FastifyRequest, reply: FastifyReply, body: TextBody) {
    // Signed in, the name is the Telegram one; anonymous, it's whatever was typed.
    const name = (request.user?.name ?? body.name ?? '').trim()
    const text = body.text.trim()
    const attempt = [name, text].find(looksLikeSqlInjection)
    if (attempt) {
      await ban(fastify, clientIp(request), attempt)
      request.log.info({ ip: clientIp(request) }, 'banned for an SQL injection attempt')
      reply.code(403).send({ banned: true, message: 'Banned' })
      return null
    }
    if (!name || !text) {
      reply.badRequest('Имя и текст не могут быть пустыми')
      return null
    }
    return { name, text }
  }

  /** The uploader's own unattached images among `ids`, in the given order. */
  async function ownImages(request: FastifyRequest, ids: string[] = []) {
    if (!ids.length) return []
    const found = await fastify.prisma.reviewImage.findMany({
      where: { id: { in: ids }, uploader: visitorKey(request), reviewId: null, replyId: null },
      select: { id: true }
    })
    const owned = new Set(found.map((image) => image.id))
    return ids.filter((id) => owned.has(id))
  }

  // sort=top (default), like YouTube's "Top comments": likes minus dislikes, then the liveliest
  // (most replies), then the newest. sort=new: newest first.
  fastify.get<ListQuery>(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['project'],
          properties: { project: projectSchema, sort: { type: 'string', enum: ['top', 'new'] } }
        }
      }
    },
    async (request) => {
      const voter = visitorKey(request)
      const { project } = request.query
      const top = request.query.sort !== 'new'
      const [reviews, stats, votes, mine] = await Promise.all([
        fastify.prisma.review.findMany({
          where: { project },
          orderBy: { createdAt: 'desc' },
          take: top ? TOP_POOL : LIST_LIMIT,
          include: {
            images: { ...imageSelect, orderBy: { createdAt: 'asc' } },
            replies: {
              orderBy: { createdAt: 'asc' },
              include: { images: { ...imageSelect, orderBy: { createdAt: 'asc' } } }
            }
          }
        }),
        fastify.prisma.review.aggregate({
          where: { project },
          _avg: { rating: true },
          _count: true
        }),
        fastify.prisma.vote.groupBy({
          by: ['reviewId', 'value'],
          where: { review: { project } },
          _count: true
        }),
        fastify.prisma.vote.findMany({
          where: { voter, review: { project } },
          select: { reviewId: true, value: true }
        })
      ])

      const tally = new Map<number, { likes: number; dislikes: number }>()
      for (const row of votes) {
        const entry = tally.get(row.reviewId) ?? { likes: 0, dislikes: 0 }
        if (row.value > 0) entry.likes += row._count
        else entry.dislikes += row._count
        tally.set(row.reviewId, entry)
      }
      const myVotes = new Map(mine.map((vote) => [vote.reviewId, vote.value]))

      const me = request.user?.id
      // Public author info: the Telegram id itself stays on the server.
      const author = (post: {
        authorTgId: string | null
        authorUsername: string | null
        authorPhoto: string | null
      }) => ({
        telegram: post.authorTgId !== null,
        username: post.authorUsername,
        photoUrl: post.authorPhoto,
        mine: me !== undefined && post.authorTgId === me
      })
      const list = reviews.map((review) => ({
        id: review.id,
        name: review.name,
        text: review.text,
        rating: review.rating,
        isOwner: review.isOwner,
        author: author(review),
        createdAt: review.createdAt,
        images: review.images.map(withUrls),
        replies: review.replies.map((replyRow) => ({
          id: replyRow.id,
          name: replyRow.name,
          text: replyRow.text,
          isOwner: replyRow.isOwner,
          author: author(replyRow),
          createdAt: replyRow.createdAt,
          images: replyRow.images.map(withUrls)
        })),
        likes: tally.get(review.id)?.likes ?? 0,
        dislikes: tally.get(review.id)?.dislikes ?? 0,
        myVote: myVotes.get(review.id) ?? 0
      }))
      if (top) {
        // Stable sort: equal scores keep the newest-first order they came in.
        list.sort(
          (a, b) =>
            b.likes - b.dislikes - (a.likes - a.dislikes) || b.replies.length - a.replies.length
        )
      }

      return {
        reviews: list.slice(0, LIST_LIMIT),
        average: stats._avg.rating,
        count: stats._count,
        uploads: storageEnabled(),
        owner: isOwner(request)
      }
    }
  )

  // One image per request, before the review or reply that uses it.
  fastify.post('/images', async (request, reply) => {
    if (!storageEnabled()) return reply.serviceUnavailable('Загрузка картинок выключена')
    if (rateLimited('upload', clientIp(request))) {
      return reply.tooManyRequests('Слишком много картинок, попробуй позже')
    }
    const file = await request.file()
    if (!file) return reply.badRequest('Нет файла')
    const buffer = await file.toBuffer().catch(() => null)
    if (!buffer || file.file.truncated) return reply.payloadTooLarge('Картинка больше 10 МБ')
    try {
      const image = await storeImage(buffer)
      await fastify.prisma.reviewImage.create({
        data: { ...image, uploader: visitorKey(request) }
      })
      return reply.code(201).send({ image: withUrls(image) })
    } catch (error) {
      request.log.warn({ err: error }, 'rejected an upload')
      return reply.unsupportedMediaType('Это не картинка')
    }
  })

  fastify.post<ReviewBody>(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['project', 'text', 'rating'],
          properties: {
            ...textSchema,
            project: projectSchema,
            rating: { type: 'integer', minimum: 1, maximum: 5 }
          }
        }
      }
    },
    async (request, reply) => {
      const checked = await checkText(request, reply, request.body)
      if (!checked) return reply
      if (rateLimited('review', clientIp(request))) {
        return reply.tooManyRequests('Слишком много отзывов, попробуй позже')
      }
      const imageIds = await ownImages(request, request.body.imageIds)
      const review = await fastify.prisma.review.create({
        data: {
          ...checked,
          project: request.body.project,
          rating: request.body.rating,
          isOwner: isOwner(request),
          ...authorOf(request)
        }
      })
      if (imageIds.length) {
        await fastify.prisma.reviewImage.updateMany({
          where: { id: { in: imageIds } },
          data: { reviewId: review.id }
        })
      }
      return reply.code(201).send({ id: review.id })
    }
  )

  fastify.post<IdParams & ReplyBody>(
    '/:id/replies',
    {
      schema: {
        params: idParams,
        body: { type: 'object', required: ['text'], properties: textSchema }
      }
    },
    async (request, reply) => {
      const checked = await checkText(request, reply, request.body)
      if (!checked) return reply
      const owner = isOwner(request)
      if (!owner && rateLimited('reply', clientIp(request))) {
        return reply.tooManyRequests('Слишком много ответов, попробуй позже')
      }
      const review = await fastify.prisma.review.findUnique({ where: { id: request.params.id } })
      if (!review) return reply.notFound('Отзыв не найден')
      const imageIds = await ownImages(request, request.body.imageIds)
      const created = await fastify.prisma.reply.create({
        data: { ...checked, reviewId: review.id, isOwner: owner, ...authorOf(request) }
      })
      if (imageIds.length) {
        await fastify.prisma.reviewImage.updateMany({
          where: { id: { in: imageIds } },
          data: { replyId: created.id }
        })
      }
      return reply.code(201).send({ id: created.id })
    }
  )

  // 1 = like, -1 = dislike, 0 = take the vote back.
  fastify.post<IdParams & VoteBody>(
    '/:id/vote',
    {
      schema: {
        params: idParams,
        body: {
          type: 'object',
          required: ['value'],
          properties: { value: { type: 'integer', enum: [-1, 0, 1] } }
        }
      }
    },
    async (request, reply) => {
      const reviewId = request.params.id
      const voter = visitorKey(request)
      const { value } = request.body
      const exists = await fastify.prisma.review.count({ where: { id: reviewId } })
      if (!exists) return reply.notFound('Отзыв не найден')
      if (value === 0) {
        await fastify.prisma.vote.deleteMany({ where: { reviewId, voter } })
      } else {
        await fastify.prisma.vote.upsert({
          where: { reviewId_voter: { reviewId, voter } },
          create: { reviewId, voter, value },
          update: { value }
        })
      }
      const [likes, dislikes] = await Promise.all([
        fastify.prisma.vote.count({ where: { reviewId, value: 1 } }),
        fastify.prisma.vote.count({ where: { reviewId, value: -1 } })
      ])
      return { likes, dislikes, myVote: value }
    }
  )

  // The owner deletes anything, a signed-in author their own posts; 404 for everyone else.
  const deleteFilter = (request: FastifyRequest, id: number) =>
    isOwner(request) ? { id } : request.user ? { id, authorTgId: request.user.id } : null

  fastify.delete<IdParams>('/:id', { schema: { params: idParams } }, async (request, reply) => {
    const where = deleteFilter(request, request.params.id)
    if (!where) return reply.notFound()
    const { count } = await fastify.prisma.review.deleteMany({ where })
    return count ? reply.code(204).send() : reply.notFound()
  })

  fastify.delete<IdParams>(
    '/replies/:id',
    { schema: { params: idParams } },
    async (request, reply) => {
      const where = deleteFilter(request, request.params.id)
      if (!where) return reply.notFound()
      const { count } = await fastify.prisma.reply.deleteMany({ where })
      return count ? reply.code(204).send() : reply.notFound()
    }
  )
}

export default reviewsRoutes
export const autoPrefix = '/reviews'
