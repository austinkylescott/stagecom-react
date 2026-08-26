import { z } from 'zod'

import { uuidSchema } from '@/server/schemas'

export const proposeTheaterOwnershipTransferInputSchema = z.object({
  commandId: uuidSchema,
  formerOwnerRole: z.enum(['admin', 'member']).default('admin'),
  memberUserId: uuidSchema,
  theaterId: uuidSchema,
})

export const respondToTheaterOwnershipTransferInputSchema = z.object({
  commandId: uuidSchema,
  response: z.enum(['accepted', 'declined']),
  transferId: uuidSchema,
})
