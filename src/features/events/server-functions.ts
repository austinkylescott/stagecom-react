import { createServerFn } from '@tanstack/react-start'

import {
  cancelEvent,
  createManagedEvent,
  inviteEventCastMember,
  inviteEventStaffMember,
  issueProposalCounteroffer,
  manageAtRiskEvent,
  publishEvent,
  recordCandidateSlotAvailability,
  requestEventCancellation,
  respondToEventCastInvitation,
  respondToEventStaffInvitation,
  revokeEventStaffAssignment,
  respondToProposalCounteroffer,
  reviewProposalRevision,
  saveEventPublicContent,
  saveEventOperationalPlan,
  setOccurrenceCall,
  saveEventProposedCast,
  submitEventProposalRevision,
  withdrawFromEventCast,
  seedDeniedProposalReplacement,
} from './commands'
import {
  getEventCreationOptions,
  getManagedEventWorkspace,
  listManagedEvents,
} from './queries'
import { getProposalPreparation } from './proposal-preparation/query'
import { getEventPublicContentReadiness } from './public-content-queries'
import { getPublishedEventBySlug } from './public-queries'
import {
  cancelEventInputSchema,
  createManagedEventInputSchema,
  eventWorkspaceInputSchema,
  inviteEventCastMemberInputSchema,
  inviteEventStaffMemberInputSchema,
  issueProposalCounterofferInputSchema,
  manageAtRiskEventInputSchema,
  publishEventInputSchema,
  recordCandidateSlotAvailabilityInputSchema,
  requestEventCancellationInputSchema,
  respondToEventCastInvitationInputSchema,
  respondToEventStaffInvitationInputSchema,
  revokeEventStaffAssignmentInputSchema,
  respondToProposalCounterofferInputSchema,
  reviewProposalRevisionInputSchema,
  saveEventPublicContentInputSchema,
  saveEventOperationalPlanInputSchema,
  setOccurrenceCallInputSchema,
  saveEventProposedCastInputSchema,
  submitEventProposalRevisionInputSchema,
  seedDeniedProposalReplacementInputSchema,
  theaterEventsInputSchema,
  withdrawFromEventCastInputSchema,
} from './schemas'

export const requestEventCancellationFn = createServerFn({ method: 'POST' })
  .validator(requestEventCancellationInputSchema)
  .handler(async ({ data }) => requestEventCancellation(data))

export const cancelEventFn = createServerFn({ method: 'POST' })
  .validator(cancelEventInputSchema)
  .handler(async ({ data }) => cancelEvent(data))

export const withdrawFromEventCastFn = createServerFn({ method: 'POST' })
  .validator(withdrawFromEventCastInputSchema)
  .handler(async ({ data }) => withdrawFromEventCast(data))

export const manageAtRiskEventFn = createServerFn({ method: 'POST' })
  .validator(manageAtRiskEventInputSchema)
  .handler(async ({ data }) => manageAtRiskEvent(data))

export const createManagedEventFn = createServerFn({ method: 'POST' })
  .validator(createManagedEventInputSchema)
  .handler(async ({ data }) => createManagedEvent(data))

export const getEventCreationOptionsFn = createServerFn({ method: 'GET' })
  .validator(theaterEventsInputSchema)
  .handler(async ({ data }) => getEventCreationOptions(data))

export const listManagedEventsFn = createServerFn({ method: 'GET' })
  .validator(theaterEventsInputSchema)
  .handler(async ({ data }) => listManagedEvents(data))

export const getManagedEventWorkspaceFn = createServerFn({ method: 'GET' })
  .validator(eventWorkspaceInputSchema)
  .handler(async ({ data }) => getManagedEventWorkspace(data))

export const getProposalPreparationFn = createServerFn({ method: 'GET' })
  .validator(eventWorkspaceInputSchema)
  .handler(async ({ data }) => getProposalPreparation(data))

export const getEventPublicContentReadinessFn = createServerFn({
  method: 'GET',
})
  .validator(eventWorkspaceInputSchema)
  .handler(async ({ data }) => getEventPublicContentReadiness(data))

export const getPublishedEventBySlugFn = createServerFn({ method: 'GET' })
  .validator(eventWorkspaceInputSchema)
  .handler(async ({ data }) => getPublishedEventBySlug(data))

export const saveEventOperationalPlanFn = createServerFn({ method: 'POST' })
  .validator(saveEventOperationalPlanInputSchema)
  .handler(async ({ data }) => saveEventOperationalPlan(data))

export const saveEventPublicContentFn = createServerFn({ method: 'POST' })
  .validator(saveEventPublicContentInputSchema)
  .handler(async ({ data }) => saveEventPublicContent(data))

export const publishEventFn = createServerFn({ method: 'POST' })
  .validator(publishEventInputSchema)
  .handler(async ({ data }) => publishEvent(data))

export const inviteEventCastMemberFn = createServerFn({ method: 'POST' })
  .validator(inviteEventCastMemberInputSchema)
  .handler(async ({ data }) => inviteEventCastMember(data))

export const inviteEventStaffMemberFn = createServerFn({ method: 'POST' })
  .validator(inviteEventStaffMemberInputSchema)
  .handler(async ({ data }) => inviteEventStaffMember(data))

export const respondToEventCastInvitationFn = createServerFn({ method: 'POST' })
  .validator(respondToEventCastInvitationInputSchema)
  .handler(async ({ data }) => respondToEventCastInvitation(data))

export const respondToEventStaffInvitationFn = createServerFn({
  method: 'POST',
})
  .validator(respondToEventStaffInvitationInputSchema)
  .handler(async ({ data }) => respondToEventStaffInvitation(data))

export const revokeEventStaffAssignmentFn = createServerFn({ method: 'POST' })
  .validator(revokeEventStaffAssignmentInputSchema)
  .handler(async ({ data }) => revokeEventStaffAssignment(data))

export const recordCandidateSlotAvailabilityFn = createServerFn({
  method: 'POST',
})
  .validator(recordCandidateSlotAvailabilityInputSchema)
  .handler(async ({ data }) => recordCandidateSlotAvailability(data))

export const setOccurrenceCallFn = createServerFn({ method: 'POST' })
  .validator(setOccurrenceCallInputSchema)
  .handler(async ({ data }) => setOccurrenceCall(data))

export const saveEventProposedCastFn = createServerFn({ method: 'POST' })
  .validator(saveEventProposedCastInputSchema)
  .handler(async ({ data }) => saveEventProposedCast(data))

export const submitEventProposalRevisionFn = createServerFn({ method: 'POST' })
  .validator(submitEventProposalRevisionInputSchema)
  .handler(async ({ data }) => submitEventProposalRevision(data))

export const reviewProposalRevisionFn = createServerFn({ method: 'POST' })
  .validator(reviewProposalRevisionInputSchema)
  .handler(async ({ data }) => reviewProposalRevision(data))

export const issueProposalCounterofferFn = createServerFn({ method: 'POST' })
  .validator(issueProposalCounterofferInputSchema)
  .handler(async ({ data }) => issueProposalCounteroffer(data))

export const respondToProposalCounterofferFn = createServerFn({
  method: 'POST',
})
  .validator(respondToProposalCounterofferInputSchema)
  .handler(async ({ data }) => respondToProposalCounteroffer(data))

export const seedDeniedProposalReplacementFn = createServerFn({
  method: 'POST',
})
  .validator(seedDeniedProposalReplacementInputSchema)
  .handler(async ({ data }) => seedDeniedProposalReplacement(data))
