import { z } from 'zod'

import { emailSchema, uuidSchema } from '@/server/schemas'

export const createTargetedInvitationInputSchema = z.object({
  email: emailSchema,
  expiresAt: z.iso.datetime({ offset: true }).optional(),
  theaterId: uuidSchema,
})

export const revokeTargetedInvitationInputSchema = z.object({
  invitationId: uuidSchema,
})

export const acceptTargetedInvitationInputSchema = z.object({
  inviteToken: z.string(),
})

export const targetedInvitationPreviewInputSchema =
  acceptTargetedInvitationInputSchema

export const listTargetedInvitationsInputSchema = z.object({
  theaterId: uuidSchema,
})
