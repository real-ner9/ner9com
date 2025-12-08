import { z } from 'zod'
import { apiGet, apiPost } from './http-client'

const leaderboardEntrySchema = z.object({
  participantId: z.string(),
  displayName: z.string(),
  handlesCount: z.number(),
  lastSubmissionAt: z.string()
})

const leaderboardSchema = z.object({
  totalParticipants: z.number(),
  entries: z.array(leaderboardEntrySchema)
})

const submissionSchema = z.object({
  submission: z.object({
    participant: z.object({
      instagramHandle: z.string(),
      instagramSlug: z.string(),
      displayName: z.string(),
      lastSubmissionAt: z.string(),
      totalHandles: z.number()
    }),
    addedHandles: z.number(),
    skippedHandles: z.number()
  }),
  leaderboard: leaderboardSchema
})

export type LeaderboardSummary = z.infer<typeof leaderboardSchema>
export type SubmissionResponse = z.infer<typeof submissionSchema>

export interface ContestSubmissionPayload {
  instagramHandle: string
  telegramHandles: string
  displayName: string
}

export async function fetchLeaderboard(): Promise<LeaderboardSummary> {
  const data = await apiGet('/contest/leaderboard')
  return leaderboardSchema.parse(data)
}

export async function submitContestEntry(
  payload: ContestSubmissionPayload
): Promise<SubmissionResponse> {
  const data = await apiPost('/contest/submissions', payload)
  return submissionSchema.parse(data)
}

