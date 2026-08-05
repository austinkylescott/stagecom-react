import { z } from 'zod'

import { DEMO_PERSONA_KEYS } from './demo-personas'

export const authSearchSchema = z.object({
  inviteToken: z.string().min(1).optional(),
  next: z.string().min(1).optional(),
})

export const authSessionInputSchema = z.object({
  accessToken: z.string().min(1),
  expiresAt: z.number().int().positive().nullable().optional(),
  refreshToken: z.string().min(1).optional(),
})

export const resolveAuthRedirectInputSchema = authSearchSchema

export const updateDisplayNameInputSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  next: z.string().min(1).optional(),
})

export const demoPersonaInputSchema = z.object({
  persona: z.enum(DEMO_PERSONA_KEYS),
})
