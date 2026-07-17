import { getCurrentUserFromRequest } from '@/server/auth/session'
import { appError, err, ok, toAppError } from '@/server/errors'

import { createSupabaseEventPersistence } from './persistence'

import type { z } from 'zod'
import type { AppResult } from '@/server/errors'
import type { EventPersistence } from './persistence'
import type { createManagedEventInputSchema } from './schemas'

export type EventCommandDependencies = {
  getCurrentUser: () => Promise<AppResult<{ id: string }>>
  persistence: EventPersistence
}

function getDefaultDependencies(): EventCommandDependencies {
  return {
    getCurrentUser: getCurrentUserFromRequest,
    persistence: createSupabaseEventPersistence(),
  }
}

export async function createManagedEvent(
  input: z.infer<typeof createManagedEventInputSchema>,
  dependencies: EventCommandDependencies = getDefaultDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()

  if (!currentUser.ok) {
    return currentUser
  }

  try {
    await dependencies.persistence.authorizeCreation({
      actorUserId: currentUser.data.id,
      ...(input.directorUserId ? { directorUserId: input.directorUserId } : {}),
      producerUserIds: input.producerUserIds,
      theaterId: input.theaterId,
    })

    return ok(
      await dependencies.persistence.create({
        actorUserId: currentUser.data.id,
        ...(input.directorUserId
          ? { directorUserId: input.directorUserId }
          : {}),
        producerUserIds: input.producerUserIds,
        slug: input.slug,
        theaterId: input.theaterId,
        title: input.title.trim(),
      }),
    )
  } catch (error) {
    const failure = toAppError(error)

    if (failure.code !== 'internal_error') {
      return err(failure)
    }

    return err(
      appError('external_service_error', 'Event could not be created.'),
    )
  }
}
