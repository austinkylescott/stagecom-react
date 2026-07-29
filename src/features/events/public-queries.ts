import { appError, err, ok, toAppError } from '@/server/errors'

import { createSupabaseEventPublicContentPersistence } from './public-content-persistence'

import type { z } from 'zod'
import type { EventPublicContentPersistence } from './public-content-persistence'
import type { eventWorkspaceInputSchema } from './schemas'

export type PublicEventQueryDependencies = {
  persistence: EventPublicContentPersistence
}

export async function getPublishedEventBySlug(
  input: z.infer<typeof eventWorkspaceInputSchema>,
  dependencies: PublicEventQueryDependencies = {
    persistence: createSupabaseEventPublicContentPersistence(),
  },
) {
  try {
    const result = await dependencies.persistence.findPublishedBySlug(input)
    if (!result) return err(appError('not_found', 'Event was not found.'))

    return ok({
      content: result.content,
      event: result.event,
      theater: result.theater,
    })
  } catch (error) {
    const failure = toAppError(error)
    return failure.code === 'internal_error'
      ? err(
          appError(
            'external_service_error',
            'Published Event could not be loaded.',
          ),
        )
      : err(failure)
  }
}
