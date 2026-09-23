import { appError, err, ok, toAppError } from '@/server/errors'
import { createSupabaseAnonClient } from '@/server/supabase/client'

import type { Database } from '@/server/db/database.types'
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
  input: z.infer<typeof publishedTheaterEventsInputSchema>,
  dependencies: PublicTheaterEventsDependencies = {
    listPublishedEvents: async (theaterSlug) => {
      const { data, error } = await createSupabaseAnonClient().rpc(
        'get_published_theater_events',
        { p_theater_slug: theaterSlug },
      )
      if (error) throw error
      return data
    },
  },
) {
  try {
    const rows = await dependencies.listPublishedEvents(input.theaterSlug)
    return ok({
      events: rows.map((row) => ({
        title: row.title,
        imageUrl: row.image_url,
        startsAt: row.starts_at,
        localStartsAt: row.local_starts_at,
        timezoneName: row.timezone_name,
        locationName: row.location_name,
        admissionSummary: `${row.sales_channel === 'no_advance_ticketing' ? 'No advance ticketing · ' : ''}${row.admission_price_cents === 0 ? 'Free admission' : `$${(row.admission_price_cents / 100).toFixed(2)}`}`,
        cancelled: row.lifecycle_status === 'cancelled',
        href: `/theater/${input.theaterSlug}/${row.event_slug}`,
      })),
    })
  } catch (error) {
    const failure = toAppError(error)
    return err(
      failure.code === 'internal_error'
        ? appError(
            'external_service_error',
            'Upcoming Events could not be loaded.',
          )
        : failure,
    )
  }
}

type PublishedTheaterEventRow =
  Database['public']['Functions']['get_published_theater_events']['Returns'][number]

export type PublicTheaterEventsDependencies = {
  listPublishedEvents: (
    theaterSlug: string,
  ) => Promise<PublishedTheaterEventRow[]>
}
