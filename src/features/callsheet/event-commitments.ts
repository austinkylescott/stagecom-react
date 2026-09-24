import { getProducerContentCommitment } from '@/features/events/public-content-readiness'
import { appError, err, ok } from '@/server/errors'
import {
  createSupabaseAnonClient,
  createSupabaseServiceRoleClient,
} from '@/server/supabase/client'

import type { CallsheetCommitmentInput } from './read-model'

type Theater = { id: string; name: string; slug: string }
type EventCommitmentScope =
  { kind: 'all_active_theaters' } | { kind: 'theater'; theaterSlug: string }

/** Authentication and active membership precede every service-role Event read. */
export async function getEventCommitments({
  accessToken,
  scope,
}: {
  accessToken: string
  scope: EventCommitmentScope
}) {
  const actorClient = createSupabaseAnonClient(accessToken)
  const { data: identity, error: identityError } =
    await actorClient.auth.getUser(accessToken)
  if (identityError)
    return err(appError('unauthenticated', 'Sign in is required.'))
  const actorUserId = identity.user.id
  const { data: memberships, error: membershipError } = await actorClient
    .from('theater_memberships')
    .select('theater_id, theaters!inner(name, slug)')
    .eq('user_id', actorUserId)
    .eq('status', 'active')
  if (membershipError)
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )
  const theaters: Theater[] = memberships
    .filter(
      (membership) =>
        scope.kind === 'all_active_theaters' ||
        membership.theaters.slug === scope.theaterSlug,
    )
    .map((membership) => ({
      id: membership.theater_id,
      name: membership.theaters.name,
      slug: membership.theaters.slug,
    }))
  if (!theaters.length)
    return scope.kind === 'theater'
      ? err(appError('forbidden', 'Active Theater membership is required.'))
      : ok([] as CallsheetCommitmentInput[])

  const now = new Date().toISOString()
  const theaterById = new Map(theaters.map((theater) => [theater.id, theater]))
  const supabase = createSupabaseServiceRoleClient()

  // Discover the actor's relationships before reading private Event summaries.
  const [staffResult, castResult, leadershipResult, availabilityRequestResult] =
    await Promise.all([
      supabase
        .from('show_staff_assignments')
        .select('id, show_id, responsibility, status')
        .eq('user_id', actorUserId)
        .in('status', ['pending', 'accepted']),
      supabase
        .from('show_cast')
        .select('show_id, status, source')
        .eq('user_id', actorUserId),
      supabase
        .from('show_leadership')
        .select('show_id')
        .eq('user_id', actorUserId)
        .eq('role', 'producer'),
      supabase
        .from('show_availability_requests')
        .select('candidate_slot_id, counteroffer_id')
        .eq('user_id', actorUserId)
        .is('responded_at', null)
        .is('closed_at', null),
    ])
  if (
    staffResult.error ||
    castResult.error ||
    leadershipResult.error ||
    availabilityRequestResult.error
  )
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )

  const {
    data: availabilityCounteroffers,
    error: availabilityCounterofferError,
  } = availabilityRequestResult.data.length
    ? await supabase
        .from('show_counteroffers')
        .select('id, proposal_revision_id')
        .in(
          'id',
          availabilityRequestResult.data.map(
            (request) => request.counteroffer_id,
          ),
        )
    : { data: [], error: null }
  if (availabilityCounterofferError)
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )
  const { data: availabilityRevisions, error: availabilityRevisionError } =
    availabilityCounteroffers.length
      ? await supabase
          .from('show_proposal_revisions')
          .select('id, show_id')
          .in(
            'id',
            availabilityCounteroffers.map(
              (counteroffer) => counteroffer.proposal_revision_id,
            ),
          )
      : { data: [], error: null }
  if (availabilityRevisionError)
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )

  const relatedEventIds = [
    ...new Set([
      ...staffResult.data.map((row) => row.show_id),
      ...castResult.data.map((row) => row.show_id),
      ...leadershipResult.data.map((row) => row.show_id),
      ...availabilityRevisions.map((row) => row.show_id),
    ]),
  ]
  if (!relatedEventIds.length) return ok([] as CallsheetCommitmentInput[])

  const { data: events, error: eventError } = await supabase
    .from('shows')
    .select(
      'id, theater_id, slug, title, show_occurrences(candidate_slots:show_candidate_slots!show_candidate_slots_occurrence_id_fkey(id))',
    )
    .in('id', relatedEventIds)
    .in(
      'theater_id',
      theaters.map((theater) => theater.id),
    )
    .eq('event_type', 'show')
    .not('lifecycle_status', 'in', '(cancelled,completed)')
  if (eventError)
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )
  if (!events.length) return ok([] as CallsheetCommitmentInput[])

  const eventById = new Map(events.map((event) => [event.id, event]))
  const eventIds = events.map((event) => event.id)
  const eventIdSet = new Set(eventIds)
  const scopedStaff = staffResult.data.filter((row) =>
    eventIdSet.has(row.show_id),
  )
  const scopedCast = castResult.data.filter((row) =>
    eventIdSet.has(row.show_id),
  )
  const scopedLeadership = leadershipResult.data.filter((row) =>
    eventIdSet.has(row.show_id),
  )
  const scopedCandidateSlotIds = new Set(
    events.flatMap((event) =>
      event.show_occurrences.flatMap((occurrence) =>
        occurrence.candidate_slots.map((slot) => slot.id),
      ),
    ),
  )
  const scopedAvailabilityRequests = availabilityRequestResult.data.filter(
    (request) => scopedCandidateSlotIds.has(request.candidate_slot_id),
  )
  const callResult = await supabase
    .from('show_occurrence_calls')
    .select('call, occurrence_id, show_id')
    .in('show_id', eventIds)
    .eq('user_id', actorUserId)
    .neq('call', 'not_called')
  if (callResult.error)
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )

  const producerEventIds = scopedLeadership.map(
    (leadership) => leadership.show_id,
  )
  const { data: revisions, error: revisionError } = producerEventIds.length
    ? await supabase
        .from('show_proposal_revisions')
        .select('id, show_id, decision_state, revision_number')
        .in('show_id', producerEventIds)
    : { data: [], error: null }

  if (revisionError) {
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )
  }

  // Explicit Producer relationships authorize these private public-content drafts.
  const producerContent = producerEventIds.length
    ? await supabase
        .from('shows')
        .select(
          'id, lifecycle_status, approved_proposal_revision_id, show_public_content_revisions!show_public_content_revisions_show_id_fkey(description, image_url, published_at)',
        )
        .in('id', producerEventIds)
    : { data: [], error: null }
  if (producerContent.error)
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )
  const publicContentCommitments = producerContent.data.flatMap((event) => {
    const draft = event.show_public_content_revisions.find(
      (row) => row.published_at === null,
    )
    const reason = getProducerContentCommitment({
      lifecycle: event.lifecycle_status,
      approvedRevisionId: event.approved_proposal_revision_id,
      hasPublishedContent: event.show_public_content_revisions.some(
        (row) => row.published_at !== null,
      ),
      publicDraft: draft
        ? { description: draft.description, imageUrl: draft.image_url }
        : null,
    })
    return reason
      ? toCommitment({
          action: 'Prepare public content',
          actionableAt: null,
          event: eventById.get(event.id),
          id: `public-content:${event.id}`,
          kind: 'public_content',
          relationship: 'Producer',
          targetAnchor: '#public-page',
          theaterById,
        })
      : []
  })

  const revisionsById = new Map(
    revisions.map((revision) => [revision.id, revision]),
  )
  const latestRevisionByEventId = new Map<string, (typeof revisions)[number]>()
  for (const revision of revisions) {
    const current = latestRevisionByEventId.get(revision.show_id)
    if (!current || current.revision_number < revision.revision_number) {
      latestRevisionByEventId.set(revision.show_id, revision)
    }
  }
  const { data: counteroffers, error: counterofferError } =
    revisions.length > 0
      ? await supabase
          .from('show_counteroffers')
          .select('id, proposal_revision_id, response_deadline')
          .eq('state', 'pending')
          .gt('response_deadline', now)
          .in(
            'proposal_revision_id',
            revisions.map((revision) => revision.id),
          )
      : { data: [], error: null }

  if (counterofferError) {
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )
  }
  const occurrenceIds = callResult.data.map((call) => call.occurrence_id)
  const { data: callOccurrences, error: occurrenceError } = occurrenceIds.length
    ? await supabase
        .from('show_occurrences')
        .select('confirmed_candidate_slot_id, id')
        .in('id', occurrenceIds)
    : { data: [], error: null }

  if (occurrenceError) {
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )
  }

  const candidateSlotIds = callOccurrences.flatMap((occurrence) =>
    occurrence.confirmed_candidate_slot_id
      ? [occurrence.confirmed_candidate_slot_id]
      : [],
  )
  const { data: callSlots, error: slotError } = candidateSlotIds.length
    ? await supabase
        .from('show_candidate_slots')
        .select('id, starts_at')
        .in('id', candidateSlotIds)
    : { data: [], error: null }

  if (slotError) {
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )
  }

  const callStartsAtByOccurrenceId = new Map(
    callOccurrences.map((occurrence) => [
      occurrence.id,
      callSlots.find(
        (slot) => slot.id === occurrence.confirmed_candidate_slot_id,
      )?.starts_at,
    ]),
  )
  const { data: availabilitySlots, error: availabilitySlotError } =
    scopedAvailabilityRequests.length > 0
      ? await supabase
          .from('show_candidate_slots')
          .select('id, starts_at')
          .in(
            'id',
            scopedAvailabilityRequests.map(
              (request) => request.candidate_slot_id,
            ),
          )
      : { data: [], error: null }

  if (availabilitySlotError) {
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )
  }

  const availabilityCounterofferById = new Map(
    availabilityCounteroffers.map((counteroffer) => [
      counteroffer.id,
      counteroffer,
    ]),
  )
  const availabilityRevisionById = new Map(
    availabilityRevisions.map((revision) => [revision.id, revision]),
  )
  const commitments = [
    ...publicContentCommitments,
    ...scopedCast.flatMap((cast) => {
      if (cast.status !== 'pending' || cast.source !== 'invited') return []
      return toCommitment({
        action: 'Respond to invitation',
        actionableAt: null,
        event: eventById.get(cast.show_id),
        id: `cast-invitation:${cast.show_id}`,
        kind: 'cast_invitation',
        relationship: 'Cast invitee',
        targetAnchor: '#cast-participation',
        theaterById,
      })
    }),
    ...scopedStaff.flatMap((assignment) =>
      assignment.status === 'pending'
        ? toCommitment({
            action: 'Respond to staff assignment',
            actionableAt: null,
            event: eventById.get(assignment.show_id),
            id: `staff-assignment:${assignment.id}`,
            responseId: assignment.id,
            kind: 'staff_invitation',
            relationship: `Event staff invitee · ${assignment.responsibility}`,
            targetAnchor: '#event-staff-assignment',
            theaterById,
          })
        : [],
    ),
    ...revisions.flatMap((revision) => {
      if (
        revision.decision_state !== 'changes_requested' ||
        latestRevisionByEventId.get(revision.show_id)?.id !== revision.id
      ) {
        return []
      }
      return toCommitment({
        action: 'Revise proposal',
        actionableAt: null,
        event: eventById.get(revision.show_id),
        id: `proposal-edits:${revision.id}`,
        kind: 'proposal_edits',
        relationship: 'Producer',
        targetAnchor: `#proposal-revision-${revision.id}`,
        theaterById,
      })
    }),
    ...counteroffers.flatMap((counteroffer) => {
      const revision = revisionsById.get(counteroffer.proposal_revision_id)
      if (!revision) return []
      return toCommitment({
        action: 'Respond to counteroffer',
        actionableAt: counteroffer.response_deadline,
        deadline: counteroffer.response_deadline,
        event: eventById.get(revision.show_id),
        id: `counteroffer:${counteroffer.id}`,
        kind: 'counteroffer',
        relationship: 'Producer',
        targetAnchor: `#counteroffer-${counteroffer.id}`,
        theaterById,
      })
    }),
    ...scopedAvailabilityRequests.flatMap((request) => {
      const counteroffer = availabilityCounterofferById.get(
        request.counteroffer_id,
      )
      const revision = counteroffer
        ? availabilityRevisionById.get(counteroffer.proposal_revision_id)
        : undefined
      const slot = availabilitySlots.find(
        (candidate) => candidate.id === request.candidate_slot_id,
      )
      if (!revision || !slot) return []
      return toCommitment({
        action: 'Respond to availability',
        actionableAt: slot.starts_at,
        event: eventById.get(revision.show_id),
        id: `availability:${request.counteroffer_id}:${slot.id}`,
        kind: 'availability_response',
        relationship: 'Cast Member',
        targetAnchor: `#availability-${slot.id}`,
        theaterById,
      })
    }),
    ...callResult.data.flatMap((call) => {
      const staffAssignment = scopedStaff.find(
        (assignment) =>
          assignment.show_id === call.show_id &&
          assignment.status === 'accepted',
      )
      const castMember = scopedCast.find(
        (cast) => cast.show_id === call.show_id && cast.status === 'accepted',
      )
      if (!staffAssignment && !castMember) return []
      const startsAt = callStartsAtByOccurrenceId.get(call.occurrence_id)
      if (!startsAt || Date.parse(startsAt) < Date.parse(now)) return []
      return toCommitment({
        action: 'Review call',
        actionableAt: startsAt,
        event: eventById.get(call.show_id),
        id: `occurrence-call:${call.occurrence_id}`,
        kind: 'occurrence_call',
        relationship: castMember
          ? 'Cast Member'
          : `Event staff · ${staffAssignment?.responsibility ?? 'Assigned responsibility'}`,
        targetAnchor: `#occurrence-call-${call.occurrence_id}`,
        theaterById,
      })
    }),
  ]

  return ok(commitments)
}

function toCommitment({
  theaterById,
  event,
  ...commitment
}: Omit<CallsheetCommitmentInput, 'event' | 'theater'> & {
  event:
    { id: string; slug: string; theater_id: string; title: string } | undefined
  theaterById: Map<string, { name: string; slug: string }>
}) {
  if (!event) return []
  const theater = theaterById.get(event.theater_id)
  if (!theater) return []

  return [
    {
      ...commitment,
      event: { slug: event.slug, title: event.title },
      theater: { slug: theater.slug, title: theater.name },
    },
  ]
}
