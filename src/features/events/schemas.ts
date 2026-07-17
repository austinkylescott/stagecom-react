import { z } from 'zod'

import { nonEmptyStringSchema, slugSchema, uuidSchema } from '@/server/schemas'

export const createManagedEventInputSchema = z.object({
  directorUserId: uuidSchema.optional(),
  producerUserIds: z.array(uuidSchema).max(20).default([]),
  slug: slugSchema,
  theaterId: uuidSchema,
  title: nonEmptyStringSchema.max(160),
})

export const theaterEventsInputSchema = z.object({
  theaterSlug: slugSchema,
})

export const eventWorkspaceInputSchema = z.object({
  eventSlug: slugSchema,
  theaterSlug: slugSchema,
})
