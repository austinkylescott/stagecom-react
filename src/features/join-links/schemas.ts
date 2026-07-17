import { z } from 'zod'

import { uuidSchema } from '@/server/schemas'

export const createReusableJoinLinkInputSchema = z.object({
  expiresAt: z.iso.datetime({ offset: true }).optional(),
  maxUses: z.number().int().positive().optional(),
  theaterId: uuidSchema,
})

export const joinLinkIdInputSchema = z.object({
  joinLinkId: uuidSchema,
})

export const acceptReusableJoinLinkInputSchema = z.object({
  joinToken: z.string(),
})

export const reusableJoinLinkPreviewInputSchema =
  acceptReusableJoinLinkInputSchema

export const listReusableJoinLinksInputSchema = z.object({
  theaterId: uuidSchema,
})
