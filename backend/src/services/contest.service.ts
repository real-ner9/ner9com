import type { Prisma, PrismaClient } from '@prisma/client'

const INSTAGRAM_PATTERN = /^[a-zA-Z0-9._]{3,30}$/
const TELEGRAM_PATTERN = /^[a-zA-Z0-9_]{4,32}$/
const MAX_TELEGRAM_HANDLES_PER_SUBMISSION = 200
const DISPLAY_NAME_MIN_LENGTH = 3
const DISPLAY_NAME_MAX_LENGTH = 40

export class ContestValidationError extends Error {
  readonly statusCode = 400
}

interface NormalizedInstagram {
  value: string
  slug: string
}

interface NormalizedHandle {
  value: string
  slug: string
}

export interface SubmissionInput {
  instagramHandle: string
  telegramHandles: string
  displayName: string
}

export interface SubmissionResult {
  participant: {
    instagramHandle: string
    instagramSlug: string
    displayName: string
    lastSubmissionAt: Date
    totalHandles: number
  }
  addedHandles: number
  skippedHandles: number
}

export interface LeaderboardEntry {
  participantId: string
  displayName: string
  handlesCount: number
  lastSubmissionAt: Date
}

export interface LeaderboardSummary {
  totalParticipants: number
  entries: LeaderboardEntry[]
}

type TransactionClient = PrismaClient | Prisma.TransactionClient

export async function submitContestEntry(
  prisma: PrismaClient,
  payload: SubmissionInput
): Promise<SubmissionResult> {
  const instagram = normalizeInstagramHandle(payload.instagramHandle)
  const displayName = normalizeDisplayName(payload.displayName)
  const handles = normalizeTelegramHandles(payload.telegramHandles)

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const participant = await tx.participant.upsert({
      where: { instagramSlug: instagram.slug },
      update: {
        instagramHandle: instagram.value,
        displayName,
        lastSubmissionAt: new Date()
      },
      create: {
        instagramHandle: instagram.value,
        instagramSlug: instagram.slug,
        displayName
      }
    })

    const beforeCount = await tx.telegramHandle.count({
      where: { participantId: participant.id }
    })

    if (handles.length) {
      await tx.telegramHandle.createMany({
        data: handles.map((handle) => ({
          value: handle.value,
          slug: handle.slug,
          participantId: participant.id
        })),
        skipDuplicates: true
      })
    }

    const totalHandles = await tx.telegramHandle.count({
      where: { participantId: participant.id }
    })

    return {
      participant,
      totalHandles,
      addedHandles: totalHandles - beforeCount,
      skippedHandles: handles.length - (totalHandles - beforeCount)
    }
  })

  return {
    participant: {
      instagramHandle: result.participant.instagramHandle,
      instagramSlug: result.participant.instagramSlug,
      displayName: result.participant.displayName,
      lastSubmissionAt: result.participant.lastSubmissionAt,
      totalHandles: result.totalHandles
    },
    addedHandles: result.addedHandles,
    skippedHandles: Math.max(result.skippedHandles, 0)
  }
}

export async function getLeaderboardSummary(
  prisma: TransactionClient
): Promise<LeaderboardSummary> {
  const topParticipantsPromise = prisma.participant.findMany({
    orderBy: [
      {
        handles: {
          _count: 'desc'
        }
      },
      { lastSubmissionAt: 'asc' }
    ],
    take: 10,
    select: {
      id: true,
      instagramHandle: true,
      instagramSlug: true,
      displayName: true,
      lastSubmissionAt: true,
      _count: {
        select: {
          handles: true
        }
      }
    }
  })
  const totalParticipantsPromise = prisma.participant.count()

  const [topParticipants, totalParticipants] = await Promise.all([
    topParticipantsPromise,
    totalParticipantsPromise
  ])

  return {
    totalParticipants,
    entries: topParticipants.map((participant) => ({
      participantId: participant.id,
      displayName: participant.displayName,
      lastSubmissionAt: participant.lastSubmissionAt,
      handlesCount: participant._count.handles
    }))
  }
}

function normalizeInstagramHandle(raw: string): NormalizedInstagram {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new ContestValidationError('Укажи instagram никнейм')
  }

  const stripped = trimmed.replace(/^@+/, '')
  if (!INSTAGRAM_PATTERN.test(stripped)) {
    throw new ContestValidationError('Instagram ник должен содержать 3-30 символов (буквы, цифры, . или _)')
  }

  return {
    value: stripped,
    slug: stripped.toLowerCase()
  }
}

function normalizeDisplayName(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new ContestValidationError('Укажи отображаемый ник')
  }

  if (trimmed.length < DISPLAY_NAME_MIN_LENGTH || trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
    throw new ContestValidationError(
      `Отображаемый ник должен содержать от ${DISPLAY_NAME_MIN_LENGTH} до ${DISPLAY_NAME_MAX_LENGTH} символов`
    )
  }

  if (trimmed.includes('\n')) {
    throw new ContestValidationError('Отображаемый ник должен быть в одну строку')
  }

  return trimmed
}

function normalizeTelegramHandles(raw: string): NormalizedHandle[] {
  const tokens = raw
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter(Boolean)

  if (!tokens.length) {
    throw new ContestValidationError('Добавь хотя бы один Telegram ник')
  }

  if (tokens.length > MAX_TELEGRAM_HANDLES_PER_SUBMISSION) {
    throw new ContestValidationError(`За один раз можно отправить не больше ${MAX_TELEGRAM_HANDLES_PER_SUBMISSION} никнеймов`)
  }

  const unique = new Map<string, NormalizedHandle>()

  tokens.forEach((token) => {
    const stripped = token.replace(/^@+/, '')
    if (!TELEGRAM_PATTERN.test(stripped)) {
      throw new ContestValidationError(`Неверный Telegram ник: ${token}`)
    }

    const slug = stripped.toLowerCase()
    if (!unique.has(slug)) {
      unique.set(slug, {
        value: stripped,
        slug
      })
    }
  })

  if (!unique.size) {
    throw new ContestValidationError('Не удалось распознать ни одного Telegram ника')
  }

  return Array.from(unique.values())
}

