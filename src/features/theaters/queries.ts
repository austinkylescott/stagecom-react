import { err, notImplemented } from '@/server/errors'

import type { z } from 'zod'
import type { theaterSlugInputSchema } from './schemas'

export async function getMyTheaters() {
  return err(notImplemented('getMyTheaters'))
}

export async function getTheaterPreview(
  _input: z.infer<typeof theaterSlugInputSchema>,
) {
  return err(notImplemented('getTheaterPreview'))
}
