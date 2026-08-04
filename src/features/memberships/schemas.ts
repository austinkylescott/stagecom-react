import { z } from 'zod'

import { slugSchema, uuidSchema } from '@/server/schemas'

export const getTheaterMembershipInputSchema = z.object({
  theaterSlug: slugSchema,
})

export const deactivateTheaterMembershipInputSchema = z.object({
  commandId: uuidSchema,
  expectedMembershipVersion: z.number().int().positive(),
  memberUserId: uuidSchema,
  theaterId: uuidSchema,
})

export const listTheaterMembersInputSchema = z.object({
  theaterId: uuidSchema,
})
