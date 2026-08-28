import { z } from 'zod'

import { nonEmptyStringSchema, slugSchema, uuidSchema } from '@/server/schemas'

const instantSchema = z.iso.datetime({ offset: true })

const blockFields = {
  endsAt: instantSchema,
  privateLabel: nonEmptyStringSchema.max(160),
  privateNotes: z.string().trim().max(4_000).nullable(),
  startsAt: instantSchema,
}

export const theaterScheduleBlocksInputSchema = z.object({ theaterSlug: slugSchema })

export const createScheduleBlockInputSchema = z.object({
  commandId: uuidSchema,
  theaterId: uuidSchema,
  ...blockFields,
}).refine(({ endsAt, startsAt }) => new Date(endsAt) > new Date(startsAt), {
  message: 'End must be after start.', path: ['endsAt'],
})

export const updateScheduleBlockInputSchema = z.object({
  commandId: uuidSchema,
  expectedVersion: z.number().int().positive(),
  scheduleBlockId: uuidSchema,
  ...blockFields,
}).refine(({ endsAt, startsAt }) => new Date(endsAt) > new Date(startsAt), {
  message: 'End must be after start.', path: ['endsAt'],
})

export const finishScheduleBlockInputSchema = z.object({
  action: z.enum(['released', 'cancelled']),
  commandId: uuidSchema,
  expectedVersion: z.number().int().positive(),
  scheduleBlockId: uuidSchema,
})
