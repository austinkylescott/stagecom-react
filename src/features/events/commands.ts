import { getCurrentUserFromRequest } from '@/server/auth/session'
import { appError, err, ok, toAppError } from '@/server/errors'

import { createSupabaseEventPersistence } from './persistence'
import { resolveLocalDateTime } from './time'

import type { z } from 'zod'
import type { AppResult } from '@/server/errors'
import type { EventPersistence } from './persistence'
import type {
  createManagedEventInputSchema,
  inviteEventCastMemberInputSchema,
  respondToEventCastInvitationInputSchema,
  saveEventOperationalPlanInputSchema,
} from './schemas'

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

export async function saveEventOperationalPlan(
  input: z.infer<typeof saveEventOperationalPlanInputSchema>,
  dependencies: EventCommandDependencies = getDefaultDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()

  if (!currentUser.ok) {
    return currentUser
  }

  try {
    await dependencies.persistence.authorizePlanEdit({
      actorUserId: currentUser.data.id,
      eventId: input.eventId,
    })

    const occurrences = input.occurrences.map((occurrence) => ({
      ...occurrence,
      candidateSlots: occurrence.candidateSlots.map((slot) => ({
        ...slot,
        ...resolveLocalDateTime(slot.localStartsAt, slot.timezoneName),
      })),
    }))

    return ok(
      await dependencies.persistence.saveOperationalPlan({
        actorUserId: currentUser.data.id,
        eventId: input.eventId,
        minimumViableCast: input.minimumViableCast,
        occurrences,
        resourceRequests: input.resourceRequests,
        targetCastSize: input.targetCastSize,
      }),
    )
  } catch (error) {
    const failure = toAppError(error)

    if (failure.code !== 'internal_error') {
      return err(failure)
    }

    return err(
      appError(
        'external_service_error',
        'Event operational plan could not be saved.',
      ),
    )
  }
}

export async function inviteEventCastMember(
  input: z.infer<typeof inviteEventCastMemberInputSchema>,
  dependencies: EventCommandDependencies = getDefaultDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()

  if (!currentUser.ok) return currentUser

  try {
    await dependencies.persistence.authorizeCastInvitation({
      actorUserId: currentUser.data.id,
      eventId: input.eventId,
      memberUserId: input.memberUserId,
    })

    return ok(
      await dependencies.persistence.inviteCastMember({
        actorUserId: currentUser.data.id,
        eventId: input.eventId,
        memberUserId: input.memberUserId,
      }),
    )
  } catch (error) {
    const failure = toAppError(error)
    return failure.code === 'internal_error'
      ? err(
          appError(
            'external_service_error',
            'Cast invitation could not be created.',
          ),
        )
      : err(failure)
  }
}

export async function respondToEventCastInvitation(
  input: z.infer<typeof respondToEventCastInvitationInputSchema>,
  dependencies: EventCommandDependencies = getDefaultDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()

  if (!currentUser.ok) return currentUser

  try {
    await dependencies.persistence.authorizeCastResponse({
      actorUserId: currentUser.data.id,
      eventId: input.eventId,
      response: input.response,
    })

    return ok(
      await dependencies.persistence.respondToCastInvitation({
        actorUserId: currentUser.data.id,
        eventId: input.eventId,
        response: input.response,
      }),
    )
  } catch (error) {
    const failure = toAppError(error)
    return failure.code === 'internal_error'
      ? err(
          appError(
            'external_service_error',
            'Cast invitation response could not be saved.',
          ),
        )
      : err(failure)
  }
}
