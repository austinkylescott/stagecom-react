import { z } from 'zod'

import { uuidSchema } from '@/server/schemas'

export const inviteTheaterAdminInputSchema = z.object({
  commandId: uuidSchema,
  memberUserId: uuidSchema,
  theaterId: uuidSchema,
})

export const respondToTheaterAdminInvitationInputSchema = z.object({
  commandId: uuidSchema,
  invitationId: uuidSchema,
  response: z.enum(['accepted', 'declined']),
})

export const removeTheaterAdminInputSchema = z.object({
  commandId: uuidSchema,
  memberUserId: uuidSchema,
  theaterId: uuidSchema,
})
