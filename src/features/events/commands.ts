import { getCurrentUserFromRequest } from '@/server/auth/session'
import { appError, err, ok, toAppError } from '@/server/errors'

import {
  createSupabaseEventCompletionPersistence,
  createSupabaseEventCancellationPersistence,
  createSupabaseEventPersistence,
  createSupabaseEventRiskPersistence,
} from './persistence'
import { createSupabaseEventPublicContentPersistence } from './public-content-persistence'
import { createSupabaseProposalPersistence } from './proposal-persistence'
import { resolveLocalDateTime } from './time'

import type { z } from 'zod'
import type { AppResult } from '@/server/errors'
import type {
  EventCompletionPersistence,
  EventCancellationPersistence,
  EventPersistence,
  EventRiskPersistence,
} from './persistence'
import type {
  completeEventInputSchema,
  cancelEventInputSchema,
  createManagedEventInputSchema,
  inviteEventCastMemberInputSchema,
  inviteEventStaffMemberInputSchema,
  manageAtRiskEventInputSchema,
  issueProposalCounterofferInputSchema,
  recordCandidateSlotAvailabilityInputSchema,
  requestEventCancellationInputSchema,
  respondToEventCastInvitationInputSchema,
  respondToEventStaffInvitationInputSchema,
  revokeEventStaffAssignmentInputSchema,
  respondToProposalCounterofferInputSchema,
  publishEventInputSchema,
  saveEventPublicContentInputSchema,
  saveEventOperationalPlanInputSchema,
  setOccurrenceCallInputSchema,
  saveEventProposedCastInputSchema,
  reviewProposalRevisionInputSchema,
  seedDeniedProposalReplacementInputSchema,
  submitEventProposalRevisionInputSchema,
  withdrawFromEventCastInputSchema,
} from './schemas'
import type { EventPublicContentPersistence } from './public-content-persistence'
import type { ProposalPersistence } from './proposal-persistence'

export type EventCommandDependencies = {
  getCurrentUser: () => Promise<AppResult<{ id: string }>>
  persistence: EventPersistence
}

export type EventCompletionCommandDependencies = {
  getCurrentUser: () => Promise<AppResult<{ id: string }>>
  now: () => Date
  persistence: EventCompletionPersistence
}

export type EventCancellationCommandDependencies = {
  getCurrentUser: () => Promise<AppResult<{ id: string }>>
  now: () => Date
  persistence: EventCancellationPersistence
}

export type EventRiskCommandDependencies = {
  getCurrentUser: () => Promise<AppResult<{ id: string }>>
  persistence: EventRiskPersistence
}

export type EventPublicContentCommandDependencies = {
  getCurrentUser: () => Promise<AppResult<{ id: string }>>
  persistence: EventPublicContentPersistence
}

export type ProposalCommandDependencies = {
  getCurrentUser: () => Promise<AppResult<{ id: string }>>
  now: () => Date
  persistence: ProposalPersistence
}

function getDefaultDependencies(): EventCommandDependencies {
  return {
    getCurrentUser: getCurrentUserFromRequest,
    persistence: createSupabaseEventPersistence(),
  }
}

function getDefaultCompletionDependencies(): EventCompletionCommandDependencies {
  return {
    getCurrentUser: getCurrentUserFromRequest,
    now: () => new Date(),
    persistence: createSupabaseEventCompletionPersistence(),
  }
}

function getDefaultCancellationDependencies(): EventCancellationCommandDependencies {
  return {
    getCurrentUser: getCurrentUserFromRequest,
    now: () => new Date(),
    persistence: createSupabaseEventCancellationPersistence(),
  }
}

export async function requestEventCancellation(
  input: z.infer<typeof requestEventCancellationInputSchema>,
  dependencies: EventCancellationCommandDependencies = getDefaultCancellationDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()
  if (!currentUser.ok) return currentUser

  try {
    await dependencies.persistence.authorizeRequest({
      actorUserId: currentUser.data.id,
      eventId: input.eventId,
    })
    return ok(
      await dependencies.persistence.request({
        ...input,
        actorUserId: currentUser.data.id,
        now: dependencies.now().toISOString(),
        reason: input.reason.trim(),
      }),
    )
  } catch (error) {
    const failure = toAppError(error)
    return failure.code === 'internal_error'
      ? err(
          appError(
            'external_service_error',
            'Cancellation request could not be saved.',
          ),
        )
      : err(failure)
  }
}

export async function cancelEvent(
  input: z.infer<typeof cancelEventInputSchema>,
  dependencies: EventCancellationCommandDependencies = getDefaultCancellationDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()
  if (!currentUser.ok) return currentUser

  try {
    await dependencies.persistence.authorizeCancellation({
      actorUserId: currentUser.data.id,
      eventId: input.eventId,
    })
    return ok(
      await dependencies.persistence.cancel({
        ...input,
        actorUserId: currentUser.data.id,
        now: dependencies.now().toISOString(),
        reason: input.reason.trim(),
      }),
    )
  } catch (error) {
    const failure = toAppError(error)
    return failure.code === 'internal_error'
      ? err(appError('external_service_error', 'Event could not be cancelled.'))
      : err(failure)
  }
}

function getDefaultRiskDependencies(): EventRiskCommandDependencies {
  return {
    getCurrentUser: getCurrentUserFromRequest,
    persistence: createSupabaseEventRiskPersistence(),
  }
}

export async function withdrawFromEventCast(
  input: z.infer<typeof withdrawFromEventCastInputSchema>,
  dependencies: EventRiskCommandDependencies = getDefaultRiskDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()
  if (!currentUser.ok) return currentUser

  try {
    await dependencies.persistence.authorizeCastWithdrawal({
      actorUserId: currentUser.data.id,
      eventId: input.eventId,
    })
    return ok(
      await dependencies.persistence.withdraw({
        ...input,
        actorUserId: currentUser.data.id,
      }),
    )
  } catch (error) {
    const failure = toAppError(error)
    return failure.code === 'internal_error'
      ? err(
          appError(
            'external_service_error',
            'Cast withdrawal could not be saved.',
          ),
        )
      : err(failure)
  }
}

export async function manageAtRiskEvent(
  input: z.infer<typeof manageAtRiskEventInputSchema>,
  dependencies: EventRiskCommandDependencies = getDefaultRiskDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()
  if (!currentUser.ok) return currentUser

  try {
    await dependencies.persistence.authorizeRiskManagement({
      actorUserId: currentUser.data.id,
      eventId: input.eventId,
    })
    return ok(
      await dependencies.persistence.manage({
        ...input,
        actorUserId: currentUser.data.id,
        reason: input.reason.trim(),
      }),
    )
  } catch (error) {
    const failure = toAppError(error)
    return failure.code === 'internal_error'
      ? err(
          appError(
            'external_service_error',
            'At Risk Event action could not be saved.',
          ),
        )
      : err(failure)
  }
}

export async function completeEvent(
  input: z.infer<typeof completeEventInputSchema>,
  dependencies: EventCompletionCommandDependencies = getDefaultCompletionDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()
  if (!currentUser.ok) return currentUser

  try {
    await dependencies.persistence.authorizeCompletion({
      actorUserId: currentUser.data.id,
      eventId: input.eventId,
    })
    return ok(
      await dependencies.persistence.complete({
        ...input,
        actorUserId: currentUser.data.id,
        now: dependencies.now().toISOString(),
      }),
    )
  } catch (error) {
    const failure = toAppError(error)
    return failure.code === 'internal_error'
      ? err(appError('external_service_error', 'Event could not be completed.'))
      : err(failure)
  }
}

function getDefaultPublicContentDependencies(): EventPublicContentCommandDependencies {
  return {
    getCurrentUser: getCurrentUserFromRequest,
    persistence: createSupabaseEventPublicContentPersistence(),
  }
}

function getDefaultProposalDependencies(): ProposalCommandDependencies {
  return {
    getCurrentUser: getCurrentUserFromRequest,
    now: () => new Date(),
    persistence: createSupabaseProposalPersistence(),
  }
}

export async function issueProposalCounteroffer(
  input: z.infer<typeof issueProposalCounterofferInputSchema>,
  dependencies: ProposalCommandDependencies = getDefaultProposalDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()
  if (!currentUser.ok) return currentUser

  try {
    const resolved = resolveLocalDateTime(
      input.localStartsAt,
      input.timezoneName,
    )
    return ok(
      await dependencies.persistence.issueCounteroffer({
        ...input,
        ...resolved,
        actorUserId: currentUser.data.id,
        now: dependencies.now().toISOString(),
        timezoneSource: 'manual',
      }),
    )
  } catch (error) {
    const failure = toAppError(error)
    return failure.code === 'internal_error'
      ? err(
          appError(
            'external_service_error',
            'Counteroffer could not be issued.',
          ),
        )
      : err(failure)
  }
}

export async function respondToProposalCounteroffer(
  input: z.infer<typeof respondToProposalCounterofferInputSchema>,
  dependencies: ProposalCommandDependencies = getDefaultProposalDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()
  if (!currentUser.ok) return currentUser

  try {
    await dependencies.persistence.authorizeCounterofferResponse({
      actorUserId: currentUser.data.id,
      counterofferId: input.counterofferId,
    })
    return ok(
      await dependencies.persistence.respondToCounteroffer({
        ...input,
        actorUserId: currentUser.data.id,
        now: dependencies.now().toISOString(),
      }),
    )
  } catch (error) {
    const failure = toAppError(error)
    return failure.code === 'internal_error'
      ? err(
          appError(
            'external_service_error',
            'Counteroffer response could not be saved.',
          ),
        )
      : err(failure)
  }
}

export async function saveEventProposedCast(
  input: z.infer<typeof saveEventProposedCastInputSchema>,
  dependencies: ProposalCommandDependencies = getDefaultProposalDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()
  if (!currentUser.ok) return currentUser

  try {
    await dependencies.persistence.authorizeProducerDraft({
      actorUserId: currentUser.data.id,
      eventId: input.eventId,
    })
    return ok(
      await dependencies.persistence.saveProposedCast({
        actorUserId: currentUser.data.id,
        ...input,
      }),
    )
  } catch (error) {
    const failure = toAppError(error)
    return failure.code === 'internal_error'
      ? err(
          appError(
            'external_service_error',
            'Proposed Cast could not be saved.',
          ),
        )
      : err(failure)
  }
}

export async function submitEventProposalRevision(
  input: z.infer<typeof submitEventProposalRevisionInputSchema>,
  dependencies: ProposalCommandDependencies = getDefaultProposalDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()
  if (!currentUser.ok) return currentUser

  try {
    await dependencies.persistence.authorizeProducerDraft({
      actorUserId: currentUser.data.id,
      eventId: input.eventId,
    })
    return ok(
      await dependencies.persistence.submitRevision({
        actorUserId: currentUser.data.id,
        ...input,
      }),
    )
  } catch (error) {
    const failure = toAppError(error)
    return failure.code === 'internal_error'
      ? err(
          appError(
            'external_service_error',
            'Proposal Revision could not be submitted.',
          ),
        )
      : err(failure)
  }
}

export async function reviewProposalRevision(
  input: z.infer<typeof reviewProposalRevisionInputSchema>,
  dependencies: ProposalCommandDependencies = getDefaultProposalDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()
  if (!currentUser.ok) return currentUser

  try {
    return ok(
      await dependencies.persistence.reviewRevision({
        ...input,
        actorUserId: currentUser.data.id,
        reason: input.reason?.trim() || null,
      }),
    )
  } catch (error) {
    const failure = toAppError(error)
    return failure.code === 'internal_error'
      ? err(
          appError(
            'external_service_error',
            'Proposal decision could not be saved.',
          ),
        )
      : err(failure)
  }
}

export async function seedDeniedProposalReplacement(
  input: z.infer<typeof seedDeniedProposalReplacementInputSchema>,
  dependencies: ProposalCommandDependencies = getDefaultProposalDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()
  if (!currentUser.ok) return currentUser

  try {
    await dependencies.persistence.authorizeReplacement({
      actorUserId: currentUser.data.id,
      proposalRevisionId: input.proposalRevisionId,
    })
    return ok(
      await dependencies.persistence.seedReplacement({
        ...input,
        actorUserId: currentUser.data.id,
        title: input.title.trim(),
      }),
    )
  } catch (error) {
    const failure = toAppError(error)
    return failure.code === 'internal_error'
      ? err(
          appError(
            'external_service_error',
            'Replacement Event could not be created.',
          ),
        )
      : err(failure)
  }
}

export async function saveEventPublicContent(
  input: z.infer<typeof saveEventPublicContentInputSchema>,
  dependencies: EventPublicContentCommandDependencies = getDefaultPublicContentDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()
  if (!currentUser.ok) return currentUser

  try {
    await dependencies.persistence.authorizeEdit({
      actorUserId: currentUser.data.id,
      eventId: input.eventId,
    })

    return ok(
      await dependencies.persistence.saveDraft({
        actorUserId: currentUser.data.id,
        ...input,
        description: input.description.trim(),
        title: input.title.trim(),
      }),
    )
  } catch (error) {
    const failure = toAppError(error)
    return failure.code === 'internal_error'
      ? err(
          appError(
            'external_service_error',
            'Public Event content could not be saved.',
          ),
        )
      : err(failure)
  }
}

export async function publishEvent(
  input: z.infer<typeof publishEventInputSchema>,
  dependencies: EventPublicContentCommandDependencies = getDefaultPublicContentDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()
  if (!currentUser.ok) return currentUser

  try {
    await dependencies.persistence.authorizePublication({
      actorUserId: currentUser.data.id,
      eventId: input.eventId,
    })

    return ok(
      await dependencies.persistence.publish({
        actorUserId: currentUser.data.id,
        ...input,
      }),
    )
  } catch (error) {
    const failure = toAppError(error)
    return failure.code === 'internal_error'
      ? err(appError('external_service_error', 'Event could not be published.'))
      : err(failure)
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

export async function inviteEventStaffMember(
  input: z.infer<typeof inviteEventStaffMemberInputSchema>,
  dependencies: EventCommandDependencies = getDefaultDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()
  if (!currentUser.ok) return currentUser
  try {
    await dependencies.persistence.authorizeStaffInvitation!({
      actorUserId: currentUser.data.id,
      ...input,
    })
    return ok(
      await dependencies.persistence.inviteStaffMember!({
        actorUserId: currentUser.data.id,
        ...input,
      }),
    )
  } catch (error) {
    const failure = toAppError(error)
    return failure.code === 'internal_error'
      ? err(
          appError(
            'external_service_error',
            'Event staff invitation could not be created.',
          ),
        )
      : err(failure)
  }
}

export async function respondToEventStaffInvitation(
  input: z.infer<typeof respondToEventStaffInvitationInputSchema>,
  dependencies: EventCommandDependencies = getDefaultDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()
  if (!currentUser.ok) return currentUser
  try {
    await dependencies.persistence.authorizeStaffResponse!({
      actorUserId: currentUser.data.id,
      ...input,
    })
    return ok(
      await dependencies.persistence.respondToStaffInvitation!({
        actorUserId: currentUser.data.id,
        ...input,
      }),
    )
  } catch (error) {
    const failure = toAppError(error)
    return failure.code === 'internal_error'
      ? err(
          appError(
            'external_service_error',
            'Event staff invitation response could not be saved.',
          ),
        )
      : err(failure)
  }
}

export async function revokeEventStaffAssignment(
  input: z.infer<typeof revokeEventStaffAssignmentInputSchema>,
  dependencies: EventCommandDependencies = getDefaultDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()
  if (!currentUser.ok) return currentUser
  try {
    await dependencies.persistence.authorizeStaffRevocation!({
      actorUserId: currentUser.data.id,
      ...input,
    })
    return ok(
      await dependencies.persistence.revokeStaffAssignment!({
        actorUserId: currentUser.data.id,
        ...input,
      }),
    )
  } catch (error) {
    const failure = toAppError(error)
    return failure.code === 'internal_error'
      ? err(
          appError(
            'external_service_error',
            'Event staff assignment could not be revoked.',
          ),
        )
      : err(failure)
  }
}

export async function recordCandidateSlotAvailability(
  input: z.infer<typeof recordCandidateSlotAvailabilityInputSchema>,
  dependencies: EventCommandDependencies = getDefaultDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()

  if (!currentUser.ok) return currentUser

  try {
    await dependencies.persistence.authorizeAvailabilityResponse({
      actorUserId: currentUser.data.id,
      candidateSlotId: input.candidateSlotId,
    })

    return ok(
      await dependencies.persistence.recordAvailabilityResponse({
        actorUserId: currentUser.data.id,
        candidateSlotId: input.candidateSlotId,
        commandId: input.commandId,
        expectedVersion: input.expectedVersion,
        response: input.response,
      }),
    )
  } catch (error) {
    const failure = toAppError(error)
    return failure.code === 'internal_error'
      ? err(
          appError(
            'external_service_error',
            'Availability Response could not be saved.',
          ),
        )
      : err(failure)
  }
}

export async function setOccurrenceCall(
  input: z.infer<typeof setOccurrenceCallInputSchema>,
  dependencies: EventCommandDependencies = getDefaultDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()

  if (!currentUser.ok) return currentUser

  try {
    await dependencies.persistence.authorizeOccurrenceCall({
      actorUserId: currentUser.data.id,
      occurrenceId: input.occurrenceId,
    })

    return ok(
      await dependencies.persistence.setOccurrenceCall({
        actorUserId: currentUser.data.id,
        call: input.call,
        participantUserId: input.participantUserId,
        commandId: input.commandId,
        expectedVersion: input.expectedVersion,
        occurrenceId: input.occurrenceId,
      }),
    )
  } catch (error) {
    const failure = toAppError(error)
    return failure.code === 'internal_error'
      ? err(
          appError(
            'external_service_error',
            'Occurrence Call could not be saved.',
          ),
        )
      : err(failure)
  }
}
