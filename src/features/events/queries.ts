import {
  getBearerTokenFromRequest,
  getCurrentUserFromRequest,
} from '@/server/auth/session'
import { appError, err, ok } from '@/server/errors'
import {
  createSupabaseAnonClient,
  createSupabaseServiceRoleClient,
} from '@/server/supabase/client'
import {
  createProposalPreparationRecommendations,
  createProposalPreparationReadModel,
  orderByPosition,
  orderOccurrences,
} from './proposal-preparation/read-model'
import { createEventOverviewReadModel } from './event-overview/read-model'

import type { z } from 'zod'
import type {
  eventWorkspaceInputSchema,
  theaterEventsInputSchema,
} from './schemas'

export async function getEventCreationOptions(
  input: z.infer<typeof theaterEventsInputSchema>,
) {
  const access = await getTheaterAccess(input.theaterSlug)

  if (!access.ok) {
    return access
  }

  const supabase = createSupabaseServiceRoleClient()
  const [
    { data: memberships, error: membershipError },
    { data: capabilities, error: capabilityError },
  ] = await Promise.all([
    supabase
      .from('theater_memberships')
      .select('user_id, roles, profiles!inner(display_name)')
      .eq('theater_id', access.data.theater.id)
      .eq('status', 'active')
      .order('created_at'),
    supabase
      .from('theater_member_capabilities')
      .select('user_id, capability')
      .eq('theater_id', access.data.theater.id),
  ])

  if (membershipError || capabilityError) {
    return err(
      appError('external_service_error', 'Event options could not be loaded.'),
    )
  }

  const members = memberships.map((membership) => {
    const memberCapabilities = capabilities
      .filter((capability) => capability.user_id === membership.user_id)
      .map((capability) => capability.capability)
    const isAdmin = membership.roles.some(
      (role) => role === 'owner' || role === 'admin',
    )
    const isEligibleProducer =
      isAdmin ||
      access.data.theater.producer_eligibility === 'all_members' ||
      (access.data.theater.producer_eligibility === 'designated_proposers' &&
        memberCapabilities.includes('proposer'))

    return {
      capabilities: memberCapabilities,
      displayName: membership.profiles.display_name,
      isEligibleProducer,
      roles: membership.roles,
      userId: membership.user_id,
    }
  })

  return ok({
    actorEligible: members.some(
      (member) =>
        member.userId === access.data.actorUserId && member.isEligibleProducer,
    ),
    members,
    theater: {
      id: access.data.theater.id,
      name: access.data.theater.name,
      slug: access.data.theater.slug,
    },
  })
}

export async function listManagedEvents(
  input: z.infer<typeof theaterEventsInputSchema>,
) {
  const access = await getTheaterAccess(input.theaterSlug)

  if (!access.ok) {
    return access
  }

  const supabase = createSupabaseServiceRoleClient()
  const { data, error } = await supabase
    .from('shows')
    .select(
      'id, title, slug, lifecycle_status, publication_status, operational_health, show_leadership(user_id, role, profiles!show_leadership_user_id_fkey(display_name))',
    )
    .eq('theater_id', access.data.theater.id)
    .eq('event_type', 'show')
    .order('created_at', { ascending: false })

  if (error) {
    return err(
      appError('external_service_error', 'Events could not be loaded.'),
    )
  }

  return ok({ events: data, theater: access.data.theater })
}

export async function getManagedEventWorkspace(
  input: z.infer<typeof eventWorkspaceInputSchema>,
) {
  const access = await getTheaterAccess(input.theaterSlug)

  if (!access.ok) {
    return access
  }

  const supabase = createSupabaseServiceRoleClient()
  const { error: expirationError } = await supabase.rpc(
    'expire_proposal_counteroffers',
    { p_now: new Date().toISOString() },
  )
  if (expirationError) {
    return err(
      appError(
        'external_service_error',
        'Counteroffers could not be refreshed.',
      ),
    )
  }
  const { data: managedEvent, error } = await supabase
    .from('shows')
    .select(
      'id, title, slug, lifecycle_status, publication_status, operational_health, operational_health_version, at_risk_continuation_allowed, approved_proposal_revision_id, target_cast_size, minimum_viable_cast, cancelled_at, cancelled_by_user_id, cancellation_reason, show_cancellation_requests(id, actor_user_id, reason, requested_at, resolved_at, resolved_by_user_id), show_risk_management_decisions(id, action, reason, actor_user_id, prior_health_version, resulting_health_version, created_at), show_leadership(user_id, role, profiles!show_leadership_user_id_fkey(display_name)), show_cast(user_id, status, source, invited_at, responded_at, profiles!show_cast_user_id_fkey(display_name)), show_staff_assignments(id, user_id, status, responsibility, resource_request_id), show_proposed_cast(user_id), show_proposal_revisions!show_proposal_revisions_show_id_fkey(id, revision_number, decision_state, decision_version, submitted_by, submitted_at, command_id, snapshot, show_proposal_decisions(id, action, reason, actor_user_id, owner_override, revision_version, command_id, created_at), show_counteroffers!show_counteroffers_proposal_revision_id_fkey(id, occurrence_id, candidate_slot_id, actor_user_id, response_deadline, state, created_at, resulting_proposal_revision_id)), show_occurrences(id, occurrence_type, visibility, position, confirmed_candidate_slot_id, candidate_slots:show_candidate_slots!show_candidate_slots_occurrence_id_fkey(id, starts_at, duration_minutes, local_starts_at, timezone_name, timezone_source, utc_offset_minutes, location_kind, resource_id, location_name, off_site_approved, position)), show_resource_requests(id, resource_type, label, quantity, position)',
    )
    .eq('theater_id', access.data.theater.id)
    .eq('slug', input.eventSlug)
    .maybeSingle()

  if (error) {
    return err(appError('external_service_error', 'Event could not be loaded.'))
  }

  if (!managedEvent) {
    return err(appError('not_found', 'Event was not found.'))
  }

  const [capabilityResult, membersResult] = await Promise.all([
    supabase
      .from('theater_member_capabilities')
      .select('capability')
      .eq('theater_id', access.data.theater.id)
      .eq('user_id', access.data.actorUserId),
    supabase
      .from('theater_memberships')
      .select('user_id, profiles!inner(display_name)')
      .eq('theater_id', access.data.theater.id)
      .eq('status', 'active')
      .order('created_at'),
  ])

  if (capabilityResult.error || membersResult.error) {
    return err(appError('external_service_error', 'Event could not be loaded.'))
  }

  const actorLeadership = managedEvent.show_leadership.filter(
    (leader) => leader.user_id === access.data.actorUserId,
  )
  const actorCast = managedEvent.show_cast.find(
    (castMember) => castMember.user_id === access.data.actorUserId,
  )
  const actorStaffAssignment = managedEvent.show_staff_assignments.find(
    (assignment) => assignment.user_id === access.data.actorUserId,
  )
  const isTheaterAdmin = access.data.membership.roles.some(
    (role) => role === 'owner' || role === 'admin',
  )
  const isReviewer =
    isTheaterAdmin ||
    capabilityResult.data.some(({ capability }) => capability === 'reviewer')
  const hasOperationalView =
    isTheaterAdmin || isReviewer || actorLeadership.length > 0
  const view = hasOperationalView
    ? ('operational' as const)
    : actorCast?.status === 'accepted'
      ? ('accepted_cast' as const)
      : actorCast?.status === 'pending' && actorCast.source === 'invited'
        ? ('pending_invitee' as const)
        : actorStaffAssignment?.status === 'accepted'
          ? ('accepted_cast' as const)
          : actorStaffAssignment?.status === 'pending'
            ? ('pending_invitee' as const)
            : null

  if (!view) {
    return err(appError('forbidden', 'Event collaborator access is required.'))
  }

  const isProducer = actorLeadership.some(
    (leader) => leader.role === 'producer',
  )
  const isTerminalEvent =
    managedEvent.lifecycle_status === 'cancelled' ||
    managedEvent.lifecycle_status === 'completed'
  const canEditOperationalPlan =
    (managedEvent.lifecycle_status === 'draft' ||
      managedEvent.lifecycle_status === 'approved') &&
    isProducer
  const canEditDraftProposal =
    managedEvent.lifecycle_status === 'draft' &&
    actorLeadership.some((leader) => leader.role === 'producer')
  const canAssignOccurrenceCalls =
    !isTerminalEvent &&
    actorLeadership.some((leader) => leader.role === 'director')
  const canRespondToAvailability =
    !isTerminalEvent &&
    actorCast?.source === 'invited' &&
    (actorCast.status === 'pending' || actorCast.status === 'accepted')
  const confirmedSlotEndsAt = managedEvent.show_occurrences.flatMap(
    (occurrence) => {
      const confirmedSlot = occurrence.candidate_slots.find(
        (slot) => slot.id === occurrence.confirmed_candidate_slot_id,
      )
      return confirmedSlot
        ? [
            new Date(confirmedSlot.starts_at).getTime() +
              confirmedSlot.duration_minutes * 60_000,
          ]
        : []
    },
  )
  const canCompleteEvent =
    isTheaterAdmin &&
    managedEvent.lifecycle_status === 'approved' &&
    confirmedSlotEndsAt.length > 0 &&
    Math.max(...confirmedSlotEndsAt) <= Date.now()

  const visibleCast = managedEvent.show_cast.filter((castMember) => {
    if (view !== 'pending_invitee') return true
    return (
      castMember.user_id === access.data.actorUserId ||
      castMember.status === 'accepted'
    )
  })

  const candidateSlotIds = managedEvent.show_occurrences.flatMap((occurrence) =>
    occurrence.candidate_slots.map((slot) => slot.id),
  )
  const occurrenceIds = managedEvent.show_occurrences.map(
    (occurrence) => occurrence.id,
  )
  const [availabilityResult, callsResult, commitmentsResult] =
    await Promise.all([
      candidateSlotIds.length > 0
        ? supabase
            .from('show_availability_responses')
            .select(
              'candidate_slot_id, user_id, response, actor_user_id, responded_at, version',
            )
            .in('candidate_slot_id', candidateSlotIds)
        : Promise.resolve({ data: [], error: null }),
      view !== 'pending_invitee' && occurrenceIds.length > 0
        ? supabase
            .from('show_occurrence_calls')
            .select(
              'occurrence_id, user_id, call, actor_user_id, assigned_at, version',
            )
            .in('occurrence_id', occurrenceIds)
        : Promise.resolve({ data: [], error: null }),
      view === 'operational'
        ? supabase
            .from('shows')
            .select(
              'show_occurrences(confirmed_slot:show_candidate_slots!show_occurrences_confirmed_candidate_slot_id_fkey(starts_at, duration_minutes, location_kind))',
            )
            .eq('theater_id', access.data.theater.id)
            .eq('lifecycle_status', 'approved')
            .neq('id', managedEvent.id)
        : Promise.resolve({ data: [], error: null }),
    ])

  if (
    availabilityResult.error ||
    callsResult.error ||
    commitmentsResult.error
  ) {
    return err(appError('external_service_error', 'Event could not be loaded.'))
  }

  const visibleAvailability =
    view === 'pending_invitee'
      ? availabilityResult.data.filter(
          (response) => response.user_id === access.data.actorUserId,
        )
      : availabilityResult.data
  const primaryVenueCommitments = commitmentsResult.data.flatMap((event) =>
    event.show_occurrences.flatMap((occurrence) =>
      occurrence.confirmed_slot?.location_kind === 'primary_venue'
        ? [
            {
              durationMinutes: occurrence.confirmed_slot.duration_minutes,
              startsAt: occurrence.confirmed_slot.starts_at,
            },
          ]
        : [],
    ),
  )
  const recommendations =
    view === 'operational'
      ? createProposalPreparationRecommendations({
          availability: availabilityResult.data,
          calls: callsResult.data,
          commitments: primaryVenueCommitments,
          event: managedEvent,
          proposedCastUserIds: managedEvent.show_proposed_cast.map(
            ({ user_id }) => user_id,
          ),
          setupBufferMinutes: access.data.theater.setup_buffer_minutes,
          turnoverBufferMinutes: access.data.theater.turnover_buffer_minutes,
        })
      : []
  const orderedOccurrences = orderOccurrences(managedEvent.show_occurrences)
  const orderedResourceRequests = orderByPosition(
    managedEvent.show_resource_requests,
  )
  const proposalPreparation = createProposalPreparationReadModel({
    acceptedCastMembers: visibleCast
      .filter(({ status }) => status === 'accepted')
      .map((castMember) => ({
        displayName: castMember.profiles.display_name,
        userId: castMember.user_id,
      })),
    capabilities: {
      editOperationalPlan: canEditOperationalPlan,
      selectProposedCast: canEditDraftProposal,
      submitProposalRevision: canEditDraftProposal,
      viewResourceRequests: view === 'operational',
    },
    event: {
      ...managedEvent,
      show_occurrences: orderedOccurrences,
      show_resource_requests: orderedResourceRequests,
    },
    includeResourceRequests: view === 'operational',
    proposedCastUserIds:
      view === 'pending_invitee'
        ? []
        : managedEvent.show_proposed_cast.map(({ user_id }) => user_id),
    recommendations,
    theater: {
      primaryVenueId: access.data.theater.primary_venue_id,
      primaryVenueName:
        access.data.theater.primary_venue_name ?? 'Primary Venue',
      slug: access.data.theater.slug,
      timezoneName: access.data.theater.timezone ?? 'UTC',
      timezoneSource: access.data.theater.timezone_source,
    },
  })
  const overview = createEventOverviewReadModel({
    actions: {
      manageAtRisk:
        isTheaterAdmin &&
        managedEvent.lifecycle_status === 'approved' &&
        managedEvent.operational_health === 'at_risk',
      respondToCounteroffer: !isTerminalEvent && isProducer,
      respondToInvitation:
        !isTerminalEvent &&
        actorCast?.source === 'invited' &&
        actorCast.status === 'pending',
      respondToStaffInvitation:
        !isTerminalEvent && actorStaffAssignment?.status === 'pending',
      reviewProposalRevisions: !isTerminalEvent && isReviewer,
      useOwnerSelfApproval:
        access.data.membership.roles.includes('owner') &&
        access.data.theater.owner_self_approval_enabled,
    },
    actor: {
      castStatus: actorCast?.status,
      isReviewer,
      leadershipRoles: actorLeadership.map(({ role }) => role),
      roles: access.data.membership.roles,
      userId: access.data.actorUserId,
    },
    event: {
      cast: visibleCast.map(({ status }) => ({ status })),
      lifecycleStatus: managedEvent.lifecycle_status,
      leadership: managedEvent.show_leadership.map(({ profiles, role }) => ({
        displayName: profiles.display_name,
        role,
      })),
      minimumViableCast: managedEvent.minimum_viable_cast,
      occurrences: orderedOccurrences.map((occurrence) => {
        const confirmedSlot = occurrence.candidate_slots.find(
          (slot) => slot.id === occurrence.confirmed_candidate_slot_id,
        )
        return {
          confirmedSlot: confirmedSlot
            ? {
                localStartsAt: confirmedSlot.local_starts_at,
                locationName: confirmedSlot.location_name,
                startsAt: confirmedSlot.starts_at,
              }
            : null,
        }
      }),
      operationalHealth: managedEvent.operational_health,
      proposalRevisions: [...managedEvent.show_proposal_revisions]
        .sort((left, right) => right.revision_number - left.revision_number)
        .map((revision) => ({
          decisionState: revision.decision_state,
          submittedBy: revision.submitted_by,
        })),
      publicationStatus: managedEvent.publication_status,
      publicContentAvailable: view === 'operational',
      resourceRequests:
        view === 'operational'
          ? managedEvent.show_resource_requests.map((request) => ({
              acceptedStaffCount: managedEvent.show_staff_assignments.filter(
                (assignment) =>
                  assignment.resource_request_id === request.id &&
                  assignment.status === 'accepted',
              ).length,
              quantity: request.quantity,
              resourceType: request.resource_type,
            }))
          : [],
      view,
    },
  })

  return ok({
    activeMembers:
      view === 'operational'
        ? membersResult.data.map((membership) => ({
            displayName: membership.profiles.display_name,
            userId: membership.user_id,
          }))
        : [],
    actorUserId: access.data.actorUserId,
    allowedActions: {
      assignOccurrenceCalls: canAssignOccurrenceCalls,
      cancelEvent: isTheaterAdmin && !isTerminalEvent,
      completeEvent: canCompleteEvent,
      editOperationalPlan: canEditOperationalPlan,
      inviteCast: !isTerminalEvent && actorLeadership.length > 0,
      inviteStaff: !isTerminalEvent && isTheaterAdmin,
      issueCounteroffer: !isTerminalEvent && isReviewer,
      manageAtRisk:
        isTheaterAdmin &&
        managedEvent.lifecycle_status === 'approved' &&
        managedEvent.operational_health === 'at_risk',
      respondToAvailability: canRespondToAvailability,
      respondToInvitation:
        !isTerminalEvent &&
        actorCast?.source === 'invited' &&
        actorCast.status === 'pending',
      respondToStaffInvitation:
        !isTerminalEvent && actorStaffAssignment?.status === 'pending',
      respondToCounteroffer: !isTerminalEvent && isProducer,
      requestCancellation: isProducer && !isTerminalEvent,
      reviewProposalRevisions: !isTerminalEvent && isReviewer,
      seedDeniedReplacement: !isTerminalEvent && isProducer,
      selectProposedCast: canEditDraftProposal,
      submitProposalRevision: canEditDraftProposal,
      useOwnerSelfApproval:
        access.data.membership.roles.includes('owner') &&
        access.data.theater.owner_self_approval_enabled,
      withdrawFromCast: !isTerminalEvent && actorCast?.status === 'accepted',
    },
    event: {
      ...managedEvent,
      show_availability_responses: visibleAvailability,
      show_cast: visibleCast,
      show_staff_assignments:
        view === 'operational'
          ? managedEvent.show_staff_assignments
          : actorStaffAssignment
            ? [actorStaffAssignment]
            : [],
      show_leadership:
        view === 'pending_invitee' ? [] : managedEvent.show_leadership,
      show_occurrences: orderedOccurrences.map((occurrence) => ({
        ...occurrence,
        show_occurrence_calls: callsResult.data.filter(
          (call) => call.occurrence_id === occurrence.id,
        ),
        show_candidate_slots: occurrence.candidate_slots,
      })),
      show_resource_requests:
        view === 'operational' ? orderedResourceRequests : [],
      show_risk_management_decisions:
        view === 'operational'
          ? managedEvent.show_risk_management_decisions.sort((left, right) =>
              right.created_at.localeCompare(left.created_at),
            )
          : [],
      show_cancellation_requests:
        view === 'operational'
          ? managedEvent.show_cancellation_requests.sort((left, right) =>
              right.requested_at.localeCompare(left.requested_at),
            )
          : [],
      show_proposal_revisions:
        view === 'operational'
          ? managedEvent.show_proposal_revisions.sort(
              (left, right) => right.revision_number - left.revision_number,
            )
          : [],
      show_proposed_cast:
        view === 'pending_invitee' ? [] : managedEvent.show_proposed_cast,
    },
    overview,
    proposalPreparation,
    theater: access.data.theater,
    view,
  })
}

export async function getTheaterAccess(theaterSlug: string) {
  const currentUser = await getCurrentUserFromRequest()

  if (!currentUser.ok) {
    return currentUser
  }

  const token = getBearerTokenFromRequest()

  if (!token) {
    return err(appError('unauthenticated', 'Sign in is required.'))
  }

  const supabase = createSupabaseAnonClient(token)
  const { data: theater, error: theaterError } = await supabase
    .from('theaters')
    .select('id, name, slug, timezone')
    .eq('slug', theaterSlug)
    .maybeSingle()

  if (theaterError) {
    return err(
      appError('external_service_error', 'Theater could not be loaded.'),
    )
  }

  if (!theater) {
    return err(appError('not_found', 'Theater was not found.'))
  }

  const { data: membership, error: membershipError } = await supabase
    .from('theater_memberships')
    .select('roles')
    .eq('theater_id', theater.id)
    .eq('user_id', currentUser.data.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) {
    return err(
      appError('external_service_error', 'Theater could not be loaded.'),
    )
  }

  if (!membership) {
    return err(appError('forbidden', 'Active Theater membership is required.'))
  }

  // Active membership is established with the actor-scoped client before
  // operational Theater configuration is read through the app-owned boundary.
  const serviceRole = createSupabaseServiceRoleClient()
  const { data: operationalTheater, error: operationalTheaterError } =
    await serviceRole
      .from('theaters')
      .select(
        'id, name, slug, status, producer_eligibility, owner_self_approval_enabled, primary_venue_id, primary_venue_name, setup_buffer_minutes, turnover_buffer_minutes, timezone, timezone_source',
      )
      .eq('id', theater.id)
      .single()

  if (operationalTheaterError) {
    return err(
      appError('external_service_error', 'Theater could not be loaded.'),
    )
  }

  return ok({
    actorUserId: currentUser.data.id,
    bearerToken: token,
    membership,
    theater: operationalTheater,
  })
}
