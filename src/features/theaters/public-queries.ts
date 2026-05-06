import { err, notImplemented } from '@/server/errors'

import type { z } from 'zod'
import type {
  publishedTheaterEventsInputSchema,
  theaterSlugInputSchema,
} from './schemas'

export async function getPublishedTheaterBySlug(
  _input: z.infer<typeof theaterSlugInputSchema>,
) {
  return err(notImplemented('getPublishedTheaterBySlug'))
}

export async function getPublishedTheaterEvents(
  _input: z.infer<typeof publishedTheaterEventsInputSchema>,
) {
  return err(notImplemented('getPublishedTheaterEvents'))
}
