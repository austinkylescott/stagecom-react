import { z } from 'zod'
import { uuidSchema } from '@/server/schemas'

export const selectionSchema = z
  .array(
    z.object({
      teamId: uuidSchema,
      memberIds: z.array(uuidSchema).max(1000).nullable(),
    }),
  )
  .min(1)
  .max(100)
export const reviewInputSchema = z.object({
  eventId: uuidSchema,
  selection: selectionSchema,
})
export const sendInputSchema = z.object({ reviewId: uuidSchema })
export const optionsInputSchema = z.object({ eventId: uuidSchema })
export const reviewSchema = z.object({
  reviewId: uuidSchema,
  snapshot: z.object({
    teams: z.array(
      z.object({
        teamId: uuidSchema,
        name: z.string().nullable(),
        state: z.string().nullable(),
        memberIds: z.array(uuidSchema),
      }),
    ),
    recipients: z.array(
      z.object({
        userId: uuidSchema,
        displayName: z.string(),
        status: z.enum([
          'eligible',
          'ineligible',
          'not_in_team',
          'pending',
          'accepted',
          'declined',
          'withdrawn',
          'removed',
        ]),
      }),
    ),
  }),
})
export const sendResultSchema = z.discriminatedUnion('state', [
  z.object({ state: z.literal('sent'), recipientIds: z.array(uuidSchema) }),
  z.object({
    state: z.literal('refreshed'),
    review: reviewSchema,
    message: z.string(),
  }),
])
export type CastReview = z.infer<typeof reviewSchema>
export type TeamSelection = z.infer<typeof selectionSchema>
