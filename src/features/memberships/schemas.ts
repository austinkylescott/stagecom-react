import { z } from 'zod'

import { inviteTokenSchema, slugSchema } from '@/server/schemas'

export const acceptTheaterInviteInputSchema = z.object({
  inviteToken: inviteTokenSchema,
})

export const getTheaterMembershipInputSchema = z.object({
  theaterSlug: slugSchema,
})
