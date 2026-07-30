import { createServerFn } from '@tanstack/react-start'

import {
  createManagedEvent,
  inviteEventCastMember,
  issueProposalCounteroffer,
  publishEvent,
  recordCandidateSlotAvailability,
  respondToEventCastInvitation,
  respondToProposalCounteroffer,
  reviewProposalRevision,
  saveEventPublicContent,
  saveEventOperationalPlan,
  setOccurrenceCall,
  saveEventProposedCast,
  submitEventProposalRevision,
  seedDeniedProposalReplacement,
} from './commands'
import {
  getEventCreationOptions,
  getManagedEventWorkspace,
  listManagedEvents,
} from './queries'
import { getEventPublicContentReadiness } from './public-content-queries'
import { getPublishedEventBySlug } from './public-queries'
import {
  createManagedEventInputSchema,
  eventWorkspaceInputSchema,
  inviteEventCastMemberInputSchema,
  issueProposalCounterofferInputSchema,
  publishEventInputSchema,
  recordCandidateSlotAvailabilityInputSchema,
  respondToEventCastInvitationInputSchema,
  respondToProposalCounterofferInputSchema,
  reviewProposalRevisionInputSchema,
  saveEventPublicContentInputSchema,
  saveEventOperationalPlanInputSchema,
  setOccurrenceCallInputSchema,
  saveEventProposedCastInputSchema,
  submitEventProposalRevisionInputSchema,
  seedDeniedProposalReplacementInputSchema,
  theaterEventsInputSchema,
} from './schemas'

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

export const respondToEventCastInvitationFn = createServerFn({ method: 'POST' })
  .validator(respondToEventCastInvitationInputSchema)
  .handler(async ({ data }) => respondToEventCastInvitation(data))

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
