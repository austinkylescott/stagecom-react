import { z } from 'zod'

import { uuidSchema } from '@/server/schemas'

export const activityVisibilitySchema = z.enum([
  'admin_only',
  'member_visible',
  'self_only',
])

export const emitActivityInputSchema = z.object({
  theaterId: uuidSchema.optional(),
  entityType: z.string().trim().min(1),
  entityId: uuidSchema.optional(),
  action: z.string().trim().min(1),
  visibility: activityVisibilitySchema.default('admin_only'),
  payload: z.record(z.string(), z.unknown()).default({}),
})

export const emitDomainEventInputSchema = z.object({
  name: z.string().trim().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
})
