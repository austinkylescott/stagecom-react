import { z } from 'zod'

import { slugSchema, uuidSchema } from '@/server/schemas'

export const producerEligibilitySchema = z.enum([
  'all_members',
  'designated_proposers',
  'admins_only',
])

export const theaterCapabilitySchema = z.enum(['proposer', 'reviewer'])

export const updateTheaterGovernanceInputSchema = z.object({
  counterofferResponseHours: z.number().int().min(1).max(720),
  ownerSelfApprovalEnabled: z.boolean().optional(),
  primaryVenueName: z.string().trim().min(1).max(160),
  producerEligibility: producerEligibilitySchema,
  setupBufferMinutes: z.number().int().min(0).max(1440),
  theaterId: uuidSchema,
  turnoverBufferMinutes: z.number().int().min(0).max(1440),
})

export const setTheaterMemberCapabilityInputSchema = z.object({
  capability: theaterCapabilitySchema,
  enabled: z.boolean(),
  theaterId: uuidSchema,
  userId: uuidSchema,
})

export const theaterGovernanceInputSchema = z.object({
  theaterSlug: slugSchema,
})
