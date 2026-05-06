import { ok } from '@/server/errors'

import type { z } from 'zod'
import type {
  emitActivityInputSchema,
  emitDomainEventInputSchema,
} from './schemas'

export async function emitActivity(
  _input: z.infer<typeof emitActivityInputSchema>,
) {
  return ok({ emitted: false })
}

export async function emitDomainEvent(
  _input: z.infer<typeof emitDomainEventInputSchema>,
) {
  return ok({ emitted: false })
}
