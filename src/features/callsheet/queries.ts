import {
  getBearerTokenFromRequest,
  getCurrentUserFromRequest,
} from '@/server/auth/session'
import { appError, err, ok } from '@/server/errors'
import {
  createSupabaseAnonClient,
  createSupabaseServiceRoleClient,
} from '@/server/supabase/client'

import { createCallsheetReadModel } from './read-model'

export async function getMyCallsheet() {
  const currentUser = await getCurrentUserFromRequest()
  if (!currentUser.ok) return currentUser

  const token = getBearerTokenFromRequest()
  if (!token) return err(appError('unauthenticated', 'Sign in is required.'))

  const userSupabase = createSupabaseAnonClient(token)
  const { data: memberships, error: membershipError } = await userSupabase
    .from('theater_memberships')
    .select('is_home, theater_id, theaters!inner(name, slug, status)')
    .eq('user_id', currentUser.data.id)
    .eq('status', 'active')

  if (membershipError) {
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )
  }

  const theaters = memberships.map((membership) => ({
    id: membership.theater_id,
    isDefault: membership.is_home,
    name: membership.theaters.name,
    slug: membership.theaters.slug,
    status: membership.theaters.status,
  }))
  const theaterById = new Map(theaters.map((theater) => [theater.id, theater]))

  if (theaters.length === 0) return ok({ commitments: [], theaters })

  const supabase = createSupabaseServiceRoleClient()
  const { data: adminInvitations, error: adminInvitationError } = await supabase
    .from('admin_invitations')
    .select('id, theater_id')
    .eq('member_user_id', currentUser.data.id)
    .eq('status', 'pending')
    .in(
      'theater_id',
      theaters.map((theater) => theater.id),
    )

  if (adminInvitationError) {
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )
  }

  const adminCommitments = adminInvitations.flatMap((invitation) => {
    const theater = theaterById.get(invitation.theater_id)
    if (!theater) return []
    return [
      {
        action: 'Respond to Admin invitation',
        actionableAt: null,
        event: { slug: '', title: 'Admin authority invitation' },
        id: `admin-invitation:${invitation.id}`,
        responseId: invitation.id,
        kind: 'admin_invitation' as const,
        relationship: 'Theater Member',
        targetAnchor: '',
        theater: { slug: theater.slug, title: theater.name },
      },
    ]
  })

  const { data: ownershipTransfers, error: ownershipTransferError } =
    await supabase
      .from('theater_ownership_transfers')
      .select('id, theater_id')
      .eq('member_user_id', currentUser.data.id)
      .eq('status', 'pending')
      .in(
        'theater_id',
        theaters.map((theater) => theater.id),
      )

  if (ownershipTransferError) {
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )
  }

  const ownershipTransferCommitments = ownershipTransfers.flatMap(
    (transfer) => {
      const theater = theaterById.get(transfer.theater_id)
      if (!theater) return []
      return [
        {
          action: 'Respond to ownership transfer',
          actionableAt: null,
          event: { slug: '', title: 'Theater ownership transfer' },
          id: `ownership-transfer:${transfer.id}`,
          responseId: transfer.id,
          kind: 'ownership_transfer' as const,
          relationship: 'Proposed successor',
          targetAnchor: '',
          theater: { slug: theater.slug, title: theater.name },
        },
      ]
    },
  )

  // The actor-scoped read establishes every active Theater membership before
  // the service-role client assembles the cross-Theater projection.
  const { data: events, error: eventError } = await supabase
    .from('shows')
    .select('id, theater_id, slug, title')
    .in(
      'theater_id',
      theaters.map((theater) => theater.id),
    )
    .eq('event_type', 'show')
    .not('lifecycle_status', 'in', '(cancelled,completed)')

  if (eventError) {
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )
  }

  const eventById = new Map(events.map((event) => [event.id, event]))
  if (events.length === 0) {
    return ok({
      ...createCallsheetReadModel({
        commitments: [...adminCommitments, ...ownershipTransferCommitments],
      }),
      theaters,
    })
  }

  const eventIds = events.map((event) => event.id)
  const [
    staffResult,
    castResult,
    leadershipResult,
    availabilityRequestResult,
    callResult,
  ] = await Promise.all([
    supabase
      .from('show_staff_assignments')
      .select('id, show_id, responsibility, status')
      .in('show_id', eventIds)
      .eq('user_id', currentUser.data.id)
      .in('status', ['pending', 'accepted']),
    supabase
      .from('show_cast')
      .select('show_id, status, source')
      .in('show_id', eventIds)
      .eq('user_id', currentUser.data.id),
    supabase
      .from('show_leadership')
      .select('show_id')
      .in('show_id', eventIds)
      .eq('user_id', currentUser.data.id)
      .eq('role', 'producer'),
    supabase
      .from('show_availability_requests')
      .select('candidate_slot_id, counteroffer_id')
      .eq('user_id', currentUser.data.id)
      .is('responded_at', null)
      .is('closed_at', null),
    supabase
      .from('show_occurrence_calls')
      .select('call, occurrence_id, show_id')
      .in('show_id', eventIds)
      .eq('user_id', currentUser.data.id)
      .neq('call', 'not_called'),
  ])

  if (
    castResult.error ||
    staffResult.error ||
    leadershipResult.error ||
    availabilityRequestResult.error ||
    callResult.error
  ) {
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )
  }

  const producerEventIds = leadershipResult.data.map(
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
          .gt('response_deadline', new Date().toISOString())
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
    availabilityRequestResult.data.length > 0
      ? await supabase
          .from('show_candidate_slots')
          .select('id, starts_at')
          .in(
            'id',
            availabilityRequestResult.data.map(
              (request) => request.candidate_slot_id,
            ),
          )
      : { data: [], error: null }

  if (availabilitySlotError) {
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )
  }

  const {
    data: availabilityCounteroffers,
    error: availabilityCounterofferError,
  } =
    availabilityRequestResult.data.length > 0
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

  if (availabilityCounterofferError) {
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )
  }

  const { data: availabilityRevisions, error: availabilityRevisionError } =
    availabilityCounteroffers.length > 0
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

  if (availabilityRevisionError) {
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
    ...adminCommitments,
    ...ownershipTransferCommitments,
    ...castResult.data.flatMap((cast) => {
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
    ...staffResult.data.flatMap((assignment) =>
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
    ...availabilityRequestResult.data.flatMap((request) => {
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
      const staffAssignment = staffResult.data.find(
        (assignment) =>
          assignment.show_id === call.show_id &&
          assignment.status === 'accepted',
      )
      const castMember = castResult.data.find(
        (cast) => cast.show_id === call.show_id && cast.status === 'accepted',
      )
      if (!staffAssignment && !castMember) return []
      const startsAt = callStartsAtByOccurrenceId.get(call.occurrence_id)
      if (!startsAt || Date.parse(startsAt) < Date.now()) return []
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

  return ok({ ...createCallsheetReadModel({ commitments }), theaters })
}

function toCommitment({
  theaterById,
  event,
  ...commitment
}: Omit<
  Parameters<typeof createCallsheetReadModel>[0]['commitments'][number],
  'event' | 'theater'
> & {
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
