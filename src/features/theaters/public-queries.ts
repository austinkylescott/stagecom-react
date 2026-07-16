import { appError, err, notImplemented, ok, toAppError } from '@/server/errors'

import { createSupabaseTheaterPersistence } from './persistence'
import { toPublicTheaterView } from './queries'

import type { z } from 'zod'
import type { TheaterPersistence } from './persistence'
import type {
  publishedTheaterEventsInputSchema,
  theaterSlugInputSchema,
} from './schemas'

export type PublicTheaterQueryDependencies = {
  persistence: TheaterPersistence
}

function getDefaultDependencies(): PublicTheaterQueryDependencies {
  return { persistence: createSupabaseTheaterPersistence() }
}

export async function getPublishedTheaterBySlug(
  input: z.infer<typeof theaterSlugInputSchema>,
  dependencies: PublicTheaterQueryDependencies = getDefaultDependencies(),
) {
  try {
    const theater = await dependencies.persistence.findPublishedBySlug({
      theaterSlug: input.theaterSlug,
    })

    if (!theater) {
      return err(appError('not_found', 'Theater was not found.'))
    }

    return ok({ theater: toPublicTheaterView(theater) })
  } catch (error) {
    const appFailure = toAppError(error)

    if (appFailure.code !== 'internal_error') {
      return err(appFailure)
    }

    return err(
      appError(
        'external_service_error',
        'Published Theater could not be loaded.',
      ),
    )
  }
}

export async function getPublishedTheaterEvents(
  _input: z.infer<typeof publishedTheaterEventsInputSchema>,
) {
  return err(notImplemented('getPublishedTheaterEvents'))
}
