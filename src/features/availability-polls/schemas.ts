import { z } from 'zod'
import { uuidSchema } from '@/server/schemas'

export const answerSchema = z.enum(['available', 'unavailable', 'uncertain'])
export const answersSchema = z.record(uuidSchema, answerSchema)
export const readPollsSchema = z.object({ eventId: uuidSchema })
export const openPollSchema = z.object({
  occurrenceId: uuidSchema,
  slotIds: z.array(uuidSchema).min(1).max(30),
  userIds: z.array(uuidSchema).min(1).max(200),
  commandId: uuidSchema,
  replacePollId: uuidSchema.optional(),
})
export const closePollSchema = z.object({
  pollId: uuidSchema,
  commandId: uuidSchema,
  cancel: z.boolean().default(false),
})
export const saveAnswersSchema = z.object({
  pollId: uuidSchema,
  commandId: uuidSchema,
  answers: answersSchema,
  submit: z.boolean(),
  expectedVersion: z.number().int().nonnegative(),
})
export const pollSchema = z.object({
  id: uuidSchema,
  occurrenceId: uuidSchema,
  state: z.enum(['open', 'closed', 'cancelled']),
  timezoneName: z.string(),
  openedAt: z.string(),
  canRespond: z.boolean(),
  options: z.array(
    z.object({
      id: uuidSchema,
      startsAt: z.string(),
      durationMinutes: z.number(),
      locationName: z.string(),
    }),
  ),
  respondents: z.array(
    z.object({
      userId: uuidSchema,
      displayName: z.string(),
      eligible: z.boolean(),
      submitted: answersSchema.nullable(),
      submittedAt: z.string().nullable(),
    }),
  ),
  own: z
    .object({
      draft: answersSchema.nullable(),
      submitted: answersSchema.nullable(),
      version: z.number(),
    })
    .nullable(),
})
export const pollsResultSchema = z.object({
  canLead: z.boolean(),
  polls: z.array(pollSchema),
})
export type Poll = z.infer<typeof pollSchema>
