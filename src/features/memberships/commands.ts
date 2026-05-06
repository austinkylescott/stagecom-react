import { err, notImplemented } from '@/server/errors'

import type { z } from 'zod'
import type { acceptTheaterInviteInputSchema } from './schemas'

export async function acceptTheaterInvite(
  _input: z.infer<typeof acceptTheaterInviteInputSchema>,
) {
  return err(notImplemented('acceptTheaterInvite'))
}
