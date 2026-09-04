import { appError } from '@/server/errors'
import { getBearerTokenFromRequest } from '@/server/auth/session'
import {
  createSupabaseAnonClient,
  createSupabaseServiceRoleClient,
} from '@/server/supabase/client'

import type { Json } from '@/server/db/database.types'

function throwStaffAssignmentError(
  error: { code: string; message: string },
  fallback: string,
): never {
  if (error.code === 'P0002') throw appError('not_found', error.message)
  if (error.code === '42501') throw appError('forbidden', error.message)
  if (error.code === '55000' || error.code === '23505') {
    throw appError('conflict', error.message)
  }
  if (error.code === '22023' || error.code === '23514') {
    throw appError('validation_error', error.message)
  }
  throw appError('external_service_error', fallback)
}

export type ManagedEvent = {
  castMemberCount: number
  directorUserId: string | null
  id: string
  lifecycleStatus:
    'draft' | 'in_review' | 'approved' | 'cancelled' | 'completed'
  operationalHealth: 'on_track' | 'at_risk'
  producerUserIds: string[]
  publicationStatus: 'unpublished' | 'published'
  slug: string
  theaterId: string
  title: string
}

export type EventCancellationPersistence = {
  authorizeCancellation: (input: {
    actorUserId: string
    eventId: string
  }) => Promise<void>
  authorizeRequest: (input: {
    actorUserId: string
    eventId: string
  }) => Promise<void>
  cancel: (input: {
    actorUserId: string
    commandId: string
    eventId: string
    expectedLifecycleStatus: 'draft' | 'in_review' | 'approved'
    now: string
    reason: string
  }) => Promise<{
    cancelledAt: string
    eventId: string
    lifecycleStatus: 'cancelled'
    publicationStatus: ManagedEvent['publicationStatus']
  }>
  request: (input: {
    actorUserId: string
    commandId: string
    eventId: string
    now: string
    reason: string
  }) => Promise<{
    eventId: string
    reason: string
    requestId: string
    requestedAt: string
  }>
}

export function createSupabaseEventCancellationPersistence(): EventCancellationPersistence {
  return {
    async authorizeCancellation(input) {
      const supabase = createAuthenticatedClient()
      const { data: event, error: eventError } = await supabase
        .from('shows')
        .select('theater_id')
        .eq('id', input.eventId)
        .maybeSingle()

      if (eventError) {
        throw appError(
          'external_service_error',
          'Cancellation authorization could not be checked.',
        )
      }
      if (!event) throw appError('not_found', 'Event was not found.')

      const { data: membership, error } = await supabase
        .from('theater_memberships')
        .select('roles')
        .eq('theater_id', event.theater_id)
        .eq('user_id', input.actorUserId)
        .eq('status', 'active')
        .maybeSingle()

      if (error) {
        throw appError(
          'external_service_error',
          'Cancellation authorization could not be checked.',
        )
      }
      if (
        !membership?.roles.some((role) => role === 'owner' || role === 'admin')
      ) {
        throw appError(
          'forbidden',
          'Active Owner or Admin access is required to cancel an Event.',
        )
      }
    },
    async authorizeRequest(input) {
      const supabase = createAuthenticatedClient()
      const { data, error } = await supabase.rpc('is_show_producer', {
        p_show_id: input.eventId,
      })

      if (error) {
        throw appError(
          'external_service_error',
          'Cancellation request authorization could not be checked.',
        )
      }
      if (!data) {
        throw appError(
          'forbidden',
          'Active Event Producer access is required to request cancellation.',
        )
      }
    },
    async cancel(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc('cancel_event', {
        p_actor_user_id: input.actorUserId,
        p_command_id: input.commandId,
        p_expected_lifecycle_status: input.expectedLifecycleStatus,
        p_now: input.now,
        p_reason: input.reason,
        p_show_id: input.eventId,
      })

      if (error) {
        if (error.code === 'P0002') throw appError('not_found', error.message)
        if (error.code === '42501') throw appError('forbidden', error.message)
        if (error.code === '55000' || error.code === '23505') {
          throw appError('conflict', error.message)
        }
        if (error.code === '22023' || error.code === '23514') {
          throw appError('validation_error', error.message)
        }
        throw appError(
          'external_service_error',
          'Event could not be cancelled.',
        )
      }

      if (data.lifecycle_status !== 'cancelled' || !data.cancelled_at) {
        throw appError(
          'external_service_error',
          'Cancelled Event state could not be loaded.',
        )
      }
      return {
        cancelledAt: data.cancelled_at,
        eventId: data.id,
        lifecycleStatus: data.lifecycle_status,
        publicationStatus: data.publication_status,
      }
    },
    async request(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc('request_event_cancellation', {
        p_actor_user_id: input.actorUserId,
        p_command_id: input.commandId,
        p_now: input.now,
        p_reason: input.reason,
        p_show_id: input.eventId,
      })

      if (error) {
        if (error.code === 'P0002') throw appError('not_found', error.message)
        if (error.code === '42501') throw appError('forbidden', error.message)
        if (error.code === '55000' || error.code === '23505') {
          throw appError('conflict', error.message)
        }
        if (error.code === '22023' || error.code === '23514') {
          throw appError('validation_error', error.message)
        }
        throw appError(
          'external_service_error',
          'Cancellation request could not be saved.',
        )
      }

      return {
        eventId: data.show_id,
        reason: data.reason,
        requestId: data.id,
        requestedAt: data.requested_at,
      }
    },
  }
}

export type EventRiskPersistence = {
  authorizeCastWithdrawal: (input: {
    actorUserId: string
    eventId: string
  }) => Promise<void>
  authorizeRiskManagement: (input: {
    actorUserId: string
    eventId: string
  }) => Promise<void>
  manage: (input: {
    action: 'revise' | 'reschedule' | 'allow'
    actorUserId: string
    commandId: string
    eventId: string
    expectedHealthVersion: number
    reason: string
  }) => Promise<{
    atRiskContinuationAllowed: boolean
    eventId: string
    lifecycleStatus: ManagedEvent['lifecycleStatus']
    operationalHealth: ManagedEvent['operationalHealth']
    operationalHealthVersion: number
    publicationStatus: ManagedEvent['publicationStatus']
  }>
  withdraw: (input: {
    actorUserId: string
    commandId: string
    eventId: string
    expectedHealthVersion: number
  }) => Promise<{
    eventId: string
    memberUserId: string
    operationalHealth: ManagedEvent['operationalHealth']
    operationalHealthVersion: number
    status: 'withdrawn'
  }>
}

export type EventPersistence = {
  authorizeAvailabilityResponse: (input: {
    actorUserId: string
    candidateSlotId: string
  }) => Promise<void>
  authorizeCreation: (input: {
    actorUserId: string
    directorUserId?: string
    producerUserIds: string[]
    theaterId: string
  }) => Promise<void>
  create: (input: {
    actorUserId: string
    directorUserId?: string
    producerUserIds: string[]
    slug: string
    theaterId: string
    title: string
  }) => Promise<ManagedEvent>
  authorizePlanEdit: (input: {
    actorUserId: string
    eventId: string
  }) => Promise<void>
  authorizeCastInvitation: (input: {
    actorUserId: string
    eventId: string
    memberUserId: string
  }) => Promise<void>
  authorizeCastResponse: (input: {
    actorUserId: string
    eventId: string
    response: 'accepted' | 'declined'
  }) => Promise<void>
  authorizeStaffInvitation?: (input: {
    actorUserId: string
    eventId: string
    memberUserId: string
    resourceRequestId: string
  }) => Promise<void>
  authorizeStaffResponse?: (input: {
    actorUserId: string
    assignmentId: string
    response: 'accepted' | 'declined'
  }) => Promise<void>
  authorizeStaffRevocation?: (input: {
    actorUserId: string
    assignmentId: string
  }) => Promise<void>
  authorizeOccurrenceCall: (input: {
    actorUserId: string
    occurrenceId: string
  }) => Promise<void>
  inviteCastMember: (input: {
    actorUserId: string
    eventId: string
    memberUserId: string
  }) => Promise<{
    eventId: string
    memberUserId: string
    status: 'pending'
  }>
  respondToCastInvitation: (input: {
    actorUserId: string
    eventId: string
    response: 'accepted' | 'declined'
  }) => Promise<{
    eventId: string
    memberUserId: string
    status: 'accepted' | 'declined'
  }>
  inviteStaffMember?: (input: {
    actorUserId: string
    eventId: string
    memberUserId: string
    resourceRequestId: string
  }) => Promise<{
    assignmentId: string
    eventId: string
    memberUserId: string
    responsibility: string
    status: 'pending'
  }>
  respondToStaffInvitation?: (input: {
    actorUserId: string
    assignmentId: string
    response: 'accepted' | 'declined'
  }) => Promise<{
    assignmentId: string
    eventId: string
    status: 'accepted' | 'declined'
  }>
  revokeStaffAssignment?: (input: {
    actorUserId: string
    assignmentId: string
  }) => Promise<{ assignmentId: string; eventId: string; status: 'revoked' }>
  recordAvailabilityResponse: (input: {
    actorUserId: string
    candidateSlotId: string
    commandId: string
    expectedVersion: number | null
    response: 'available' | 'unavailable' | 'uncertain'
  }) => Promise<{
    actorUserId: string
    candidateSlotId: string
    commandId: string
    respondedAt: string
    response: 'available' | 'unavailable' | 'uncertain'
    userId: string
    version: number
  }>
  saveOperationalPlan: (input: {
    actorUserId: string
    eventId: string
    minimumViableCast: number
    occurrences: Json
    resourceRequests: Json
    targetCastSize: number
  }) => Promise<{
    candidateSlotCount: number
    eventId: string
    occurrenceCount: number
    resourceRequestCount: number
  }>
  setOccurrenceCall: (input: {
    actorUserId: string
    call: 'required' | 'optional' | 'not_called'
    participantUserId: string
    commandId: string
    expectedVersion: number | null
    occurrenceId: string
  }) => Promise<{
    actorUserId: string
    assignedAt: string
    call: 'required' | 'optional' | 'not_called'
    commandId: string
    occurrenceId: string
    userId: string
    version: number
  }>
}

export function createSupabaseEventRiskPersistence(): EventRiskPersistence {
  return {
    async authorizeCastWithdrawal(input) {
      const supabase = createAuthenticatedClient()
      const { data, error } = await supabase
        .from('show_cast')
        .select('status')
        .eq('show_id', input.eventId)
        .eq('user_id', input.actorUserId)
        .maybeSingle()

      if (error) {
        throw appError(
          'external_service_error',
          'Cast withdrawal authorization could not be checked.',
        )
      }
      if (!data) throw appError('not_found', 'Cast membership was not found.')
      if (data.status !== 'accepted' && data.status !== 'withdrawn') {
        throw appError('conflict', 'Only an accepted Cast Member can withdraw.')
      }
    },
    async authorizeRiskManagement(input) {
      const supabase = createAuthenticatedClient()
      const { data: event, error: eventError } = await supabase
        .from('shows')
        .select('theater_id')
        .eq('id', input.eventId)
        .maybeSingle()

      if (eventError) {
        throw appError(
          'external_service_error',
          'Risk management authorization could not be checked.',
        )
      }
      if (!event) throw appError('not_found', 'Event was not found.')

      const { data: membership, error } = await supabase
        .from('theater_memberships')
        .select('roles')
        .eq('theater_id', event.theater_id)
        .eq('user_id', input.actorUserId)
        .eq('status', 'active')
        .maybeSingle()

      if (error) {
        throw appError(
          'external_service_error',
          'Risk management authorization could not be checked.',
        )
      }
      if (
        !membership?.roles.some((role) => role === 'owner' || role === 'admin')
      ) {
        throw appError(
          'forbidden',
          'Owner or Admin access is required to manage an At Risk Event.',
        )
      }
    },
    async manage(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc('manage_at_risk_event', {
        p_action: input.action,
        p_actor_user_id: input.actorUserId,
        p_command_id: input.commandId,
        p_expected_health_version: input.expectedHealthVersion,
        p_reason: input.reason,
        p_show_id: input.eventId,
      })

      if (error) {
        if (error.code === 'P0002') throw appError('not_found', error.message)
        if (error.code === '42501') throw appError('forbidden', error.message)
        if (error.code === '55000' || error.code === '23505') {
          throw appError('conflict', error.message)
        }
        if (error.code === '22023' || error.code === '23514') {
          throw appError('validation_error', error.message)
        }
        throw appError(
          'external_service_error',
          'At Risk Event action could not be saved.',
        )
      }

      const row = data.at(0)
      if (!row) {
        throw appError(
          'external_service_error',
          'At Risk Event state could not be loaded.',
        )
      }
      return {
        atRiskContinuationAllowed: row.at_risk_continuation_allowed,
        eventId: row.event_id,
        lifecycleStatus: row.lifecycle_status,
        operationalHealth: row.operational_health,
        operationalHealthVersion: row.operational_health_version,
        publicationStatus: row.publication_status,
      }
    },
    async withdraw(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc('withdraw_from_event_cast', {
        p_actor_user_id: input.actorUserId,
        p_command_id: input.commandId,
        p_expected_health_version: input.expectedHealthVersion,
        p_show_id: input.eventId,
      })

      if (error) {
        if (error.code === 'P0002') throw appError('not_found', error.message)
        if (error.code === '42501') throw appError('forbidden', error.message)
        if (error.code === '55000' || error.code === '23505') {
          throw appError('conflict', error.message)
        }
        throw appError(
          'external_service_error',
          'Cast withdrawal could not be saved.',
        )
      }

      const row = data.at(0)
      if (!row) {
        throw appError(
          'external_service_error',
          'Cast withdrawal state could not be loaded.',
        )
      }
      return {
        eventId: row.event_id,
        memberUserId: row.member_user_id,
        operationalHealth: row.operational_health,
        operationalHealthVersion: row.operational_health_version,
        status: 'withdrawn',
      }
    },
  }
}

export function createSupabaseEventPersistence(): EventPersistence {
  return {
    async authorizeStaffInvitation(input) {
      const supabase = createAuthenticatedClient()
      const { data: event, error } = await supabase
        .from('shows')
        .select('theater_id')
        .eq('id', input.eventId)
        .maybeSingle()
      if (error)
        throw appError(
          'external_service_error',
          'Event staff authorization could not be checked.',
        )
      if (!event) throw appError('not_found', 'Event was not found.')
      const [
        { data: membership, error: membershipError },
        { data: request, error: requestError },
      ] = await Promise.all([
        supabase
          .from('theater_memberships')
          .select('roles')
          .eq('theater_id', event.theater_id)
          .eq('user_id', input.actorUserId)
          .eq('status', 'active')
          .maybeSingle(),
        supabase
          .from('show_resource_requests')
          .select('id')
          .eq('id', input.resourceRequestId)
          .eq('show_id', input.eventId)
          .eq('resource_type', 'staff')
          .maybeSingle(),
      ])
      if (membershipError || requestError)
        throw appError(
          'external_service_error',
          'Event staff authorization could not be checked.',
        )
      if (
        !membership?.roles.some((role) => role === 'owner' || role === 'admin')
      )
        throw appError(
          'forbidden',
          'Active Theater Operator access is required to invite Event staff.',
        )
      if (!request)
        throw appError(
          'validation_error',
          'A staff staffing request for this Event is required.',
        )
    },
    async authorizeStaffResponse(input) {
      const supabase = createAuthenticatedClient()
      const { data, error } = await supabase
        .from('show_staff_assignments')
        .select('status')
        .eq('id', input.assignmentId)
        .eq('user_id', input.actorUserId)
        .maybeSingle()
      if (error)
        throw appError(
          'external_service_error',
          'Event staff invitation response authorization could not be checked.',
        )
      if (!data)
        throw appError('not_found', 'Event staff invitation was not found.')
      if (data.status !== 'pending' && data.status !== input.response)
        throw appError(
          'conflict',
          'This Event staff invitation has already received a response.',
        )
    },
    async authorizeStaffRevocation(input) {
      const supabase = createAuthenticatedClient()
      const { data, error } = await supabase
        .from('show_staff_assignments')
        .select('show_id, shows!inner(theater_id)')
        .eq('id', input.assignmentId)
        .maybeSingle()
      if (error)
        throw appError(
          'external_service_error',
          'Event staff revocation authorization could not be checked.',
        )
      if (!data)
        throw appError('not_found', 'Event Staff Assignment was not found.')
      const { data: membership, error: membershipError } = await supabase
        .from('theater_memberships')
        .select('roles')
        .eq('theater_id', data.shows.theater_id)
        .eq('user_id', input.actorUserId)
        .eq('status', 'active')
        .maybeSingle()
      if (membershipError)
        throw appError(
          'external_service_error',
          'Event staff revocation authorization could not be checked.',
        )
      if (
        !membership?.roles.some((role) => role === 'owner' || role === 'admin')
      )
        throw appError(
          'forbidden',
          'Active Theater Operator access is required to revoke Event staff.',
        )
    },
    async authorizeAvailabilityResponse(input) {
      const supabase = createAuthenticatedClient()
      const { data, error } = await supabase.rpc(
        'can_record_candidate_slot_availability',
        { p_candidate_slot_id: input.candidateSlotId },
      )

      if (error) {
        throw appError(
          'external_service_error',
          'Availability Response authorization could not be checked.',
        )
      }

      if (!data) {
        throw appError(
          'forbidden',
          'An active pending or accepted Cast invitation is required.',
        )
      }
    },
    async authorizeCastInvitation(input) {
      const supabase = createAuthenticatedClient()
      const { data: event, error: eventError } = await supabase
        .from('shows')
        .select('id, theater_id')
        .eq('id', input.eventId)
        .maybeSingle()

      if (eventError) {
        throw appError(
          'external_service_error',
          'Cast invitation authorization could not be checked.',
        )
      }

      if (!event) {
        throw appError('not_found', 'Event was not found.')
      }

      const [
        { data: isEventLeader, error: leadershipError },
        { data: membership, error: membershipError },
      ] = await Promise.all([
        supabase.rpc('is_show_leader', {
          p_show_id: input.eventId,
          p_user_id: input.actorUserId,
        }),
        supabase
          .from('theater_memberships')
          .select('user_id')
          .eq('theater_id', event.theater_id)
          .eq('user_id', input.memberUserId)
          .eq('status', 'active')
          .limit(1),
      ])

      if (leadershipError || membershipError) {
        throw appError(
          'external_service_error',
          'Cast invitation authorization could not be checked.',
        )
      }

      if (!isEventLeader) {
        throw appError(
          'forbidden',
          'Active Event leader access is required to invite Cast Members.',
        )
      }

      if (!membership.some((row) => row.user_id === input.memberUserId)) {
        throw appError(
          'validation_error',
          'The invitee must be an active Theater Member.',
        )
      }
    },
    async authorizeCastResponse(input) {
      const supabase = createAuthenticatedClient()
      const { data, error } = await supabase
        .from('show_cast')
        .select('source, status')
        .eq('show_id', input.eventId)
        .eq('user_id', input.actorUserId)
        .maybeSingle()

      if (error) {
        throw appError(
          'external_service_error',
          'Cast invitation response authorization could not be checked.',
        )
      }

      if (!data || data.source !== 'invited') {
        throw appError('not_found', 'Cast invitation was not found.')
      }

      if (data.status !== 'pending' && data.status !== input.response) {
        throw appError(
          'conflict',
          'This Cast invitation has already received a response.',
        )
      }
    },
    async authorizeOccurrenceCall(input) {
      const supabase = createAuthenticatedClient()
      const { data, error } = await supabase.rpc('can_assign_occurrence_call', {
        p_occurrence_id: input.occurrenceId,
      })

      if (error) {
        throw appError(
          'external_service_error',
          'Occurrence Call authorization could not be checked.',
        )
      }

      if (!data) {
        throw appError(
          'forbidden',
          'Active Event Director access is required to assign Occurrence Calls.',
        )
      }
    },
    async authorizePlanEdit(input) {
      const supabase = createAuthenticatedClient()
      const [{ data: event, error: eventError }, { data: isProducer, error }] =
        await Promise.all([
          supabase
            .from('shows')
            .select('id, lifecycle_status')
            .eq('id', input.eventId)
            .maybeSingle(),
          supabase.rpc('is_show_producer', { p_show_id: input.eventId }),
        ])

      if (eventError || error) {
        throw appError(
          'external_service_error',
          'Event plan authorization could not be checked.',
        )
      }

      if (!event) {
        throw appError('not_found', 'Event was not found.')
      }

      if (!isProducer) {
        throw appError(
          'forbidden',
          'Eligible Event Producer access is required.',
        )
      }

      if (
        event.lifecycle_status !== 'draft' &&
        event.lifecycle_status !== 'approved'
      ) {
        throw appError(
          'conflict',
          'The operational plan is editable only while the Event is a draft or approved.',
        )
      }
    },
    async authorizeCreation(input) {
      const supabase = createAuthenticatedClient()
      const { data: theater, error: theaterError } = await supabase
        .from('theaters')
        .select('id')
        .eq('id', input.theaterId)
        .maybeSingle()

      if (theaterError) {
        throw appError(
          'external_service_error',
          'Event authorization could not be checked.',
        )
      }

      if (!theater) {
        throw appError('forbidden', 'Active Theater membership is required.')
      }

      const producerUserIds = [
        ...new Set([...input.producerUserIds, input.actorUserId]),
      ]
      const collaboratorUserIds = input.directorUserId
        ? [...new Set([...producerUserIds, input.directorUserId])]
        : producerUserIds

      const { data: actorMembership, error: actorMembershipError } =
        await supabase
          .from('theater_memberships')
          .select('user_id')
          .eq('theater_id', input.theaterId)
          .eq('user_id', input.actorUserId)
          .eq('status', 'active')
          .maybeSingle()

      if (actorMembershipError) {
        throw appError(
          'external_service_error',
          'Event authorization could not be checked.',
        )
      }

      if (!actorMembership) {
        throw appError('forbidden', 'Active Theater membership is required.')
      }

      const serviceRole = createSupabaseServiceRoleClient()
      const [
        { data: memberships, error: membershipError },
        { data: capabilities, error: capabilityError },
        { data: governance, error: governanceError },
      ] = await Promise.all([
        serviceRole
          .from('theater_memberships')
          .select('user_id, roles')
          .eq('theater_id', input.theaterId)
          .eq('status', 'active')
          .in('user_id', collaboratorUserIds),
        serviceRole
          .from('theater_member_capabilities')
          .select('user_id, capability')
          .eq('theater_id', input.theaterId)
          .eq('capability', 'proposer')
          .in('user_id', producerUserIds),
        serviceRole
          .from('theaters')
          .select('producer_eligibility')
          .eq('id', input.theaterId)
          .single(),
      ])

      if (membershipError || capabilityError || governanceError) {
        throw appError(
          'external_service_error',
          'Event authorization could not be checked.',
        )
      }

      const isEligible = (userId: string) => {
        const membership = memberships.find(
          (candidate) => candidate.user_id === userId,
        )

        return Boolean(
          membership &&
          (membership.roles.some(
            (role) => role === 'owner' || role === 'admin',
          ) ||
            governance.producer_eligibility === 'all_members' ||
            (governance.producer_eligibility === 'designated_proposers' &&
              capabilities.some(
                (capability) => capability.user_id === userId,
              ))),
        )
      }

      if (!producerUserIds.every(isEligible)) {
        throw appError(
          'forbidden',
          'Every Producer must be eligible under current Theater policy.',
        )
      }

      if (
        input.directorUserId &&
        !memberships.some(
          (membership) => membership.user_id === input.directorUserId,
        )
      ) {
        throw appError(
          'validation_error',
          'The Director must be an active Theater Member.',
        )
      }
    },
    async create(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc('create_managed_event', {
        p_actor_user_id: input.actorUserId,
        ...(input.directorUserId
          ? { p_director_user_id: input.directorUserId }
          : {}),
        p_producer_user_ids: input.producerUserIds,
        p_slug: input.slug,
        p_theater_id: input.theaterId,
        p_title: input.title,
      })

      if (error) {
        if (error.code === '42501') {
          throw appError('forbidden', error.message)
        }

        if (error.code === '22023' || error.code === '23514') {
          throw appError('validation_error', error.message)
        }

        if (error.code === '23505') {
          throw appError('conflict', 'That Event slug is already in use.')
        }

        throw appError('external_service_error', 'Event could not be created.')
      }

      const row = data.at(0)

      if (!row) {
        throw appError('not_found', 'Theater was not found.')
      }

      const [
        { data: leadership, error: leadershipError },
        { count, error: castError },
      ] = await Promise.all([
        supabase
          .from('show_leadership')
          .select('user_id, role')
          .eq('show_id', row.id),
        supabase
          .from('show_cast')
          .select('*', { count: 'exact', head: true })
          .eq('show_id', row.id),
      ])

      if (leadershipError || castError) {
        throw appError('external_service_error', 'Event could not be loaded.')
      }

      return {
        castMemberCount: count ?? 0,
        directorUserId:
          leadership.find((leader) => leader.role === 'director')?.user_id ??
          null,
        id: row.id,
        lifecycleStatus: row.lifecycle_status,
        operationalHealth: row.operational_health,
        producerUserIds: leadership
          .filter((leader) => leader.role === 'producer')
          .map((leader) => leader.user_id),
        publicationStatus: row.publication_status,
        slug: row.slug,
        theaterId: row.theater_id,
        title: row.title,
      }
    },
    async inviteCastMember(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc('invite_event_cast_member', {
        p_actor_user_id: input.actorUserId,
        p_member_user_id: input.memberUserId,
        p_show_id: input.eventId,
      })

      if (error) {
        if (error.code === '42501') {
          throw appError('forbidden', error.message)
        }
        if (error.code === 'P0002') {
          throw appError('not_found', 'Event was not found.')
        }
        if (error.code === '22023') {
          throw appError('validation_error', error.message)
        }
        if (error.code === '23505') {
          throw appError('conflict', error.message)
        }
        throw appError(
          'external_service_error',
          'Cast invitation could not be created.',
        )
      }

      return {
        eventId: data.show_id,
        memberUserId: data.user_id,
        status: 'pending',
      }
    },
    async respondToCastInvitation(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc(
        'respond_to_event_cast_invitation',
        {
          p_actor_user_id: input.actorUserId,
          p_response: input.response,
          p_show_id: input.eventId,
        },
      )

      if (error) {
        if (error.code === 'P0002') {
          throw appError('not_found', error.message)
        }
        if (error.code === '55000') {
          throw appError('conflict', error.message)
        }
        if (error.code === '22023') {
          throw appError('validation_error', error.message)
        }
        throw appError(
          'external_service_error',
          'Cast invitation response could not be saved.',
        )
      }

      return {
        eventId: data.show_id,
        memberUserId: data.user_id,
        status: input.response,
      }
    },
    async inviteStaffMember(input) {
      const { data, error } = await createSupabaseServiceRoleClient().rpc(
        'invite_event_staff_member',
        {
          p_actor_user_id: input.actorUserId,
          p_member_user_id: input.memberUserId,
          p_resource_request_id: input.resourceRequestId,
          p_show_id: input.eventId,
        },
      )
      if (error)
        throwStaffAssignmentError(
          error,
          'Event staff invitation could not be created.',
        )
      return {
        assignmentId: data.id,
        eventId: data.show_id,
        memberUserId: data.user_id,
        responsibility: data.responsibility ?? 'Event staff responsibility',
        status: 'pending',
      }
    },
    async respondToStaffInvitation(input) {
      const { data, error } = await createSupabaseServiceRoleClient().rpc(
        'respond_to_event_staff_invitation',
        {
          p_actor_user_id: input.actorUserId,
          p_response: input.response,
          p_assignment_id: input.assignmentId,
        },
      )
      if (error)
        throwStaffAssignmentError(
          error,
          'Event staff invitation response could not be saved.',
        )
      return {
        assignmentId: data.id,
        eventId: data.show_id,
        status: input.response,
      }
    },
    async revokeStaffAssignment(input) {
      const { data, error } = await createSupabaseServiceRoleClient().rpc(
        'revoke_event_staff_assignment',
        {
          p_actor_user_id: input.actorUserId,
          p_assignment_id: input.assignmentId,
        },
      )
      if (error)
        throwStaffAssignmentError(
          error,
          'Event staff assignment could not be revoked.',
        )
      return { assignmentId: data.id, eventId: data.show_id, status: 'revoked' }
    },
    async recordAvailabilityResponse(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc(
        'record_candidate_slot_availability',
        {
          p_actor_user_id: input.actorUserId,
          p_candidate_slot_id: input.candidateSlotId,
          p_command_id: input.commandId,
          p_expected_version: input.expectedVersion ?? undefined,
          p_response: input.response,
        },
      )

      if (error) {
        if (error.code === 'P0002') throw appError('not_found', error.message)
        if (error.code === '42501') throw appError('forbidden', error.message)
        if (error.code === '55000' || error.code === '23505') {
          throw appError('conflict', error.message)
        }
        if (error.code === '22023') {
          throw appError('validation_error', error.message)
        }
        throw appError(
          'external_service_error',
          'Availability Response could not be saved.',
        )
      }

      return {
        actorUserId: data.actor_user_id,
        candidateSlotId: data.candidate_slot_id,
        commandId: data.last_command_id,
        respondedAt: data.responded_at,
        response: data.response,
        userId: data.user_id,
        version: data.version,
      }
    },
    async saveOperationalPlan(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc(
        'save_event_operational_plan',
        {
          p_actor_user_id: input.actorUserId,
          p_minimum_viable_cast: input.minimumViableCast,
          p_occurrences: input.occurrences,
          p_resource_requests: input.resourceRequests,
          p_show_id: input.eventId,
          p_target_cast_size: input.targetCastSize,
        },
      )

      if (error) {
        if (error.code === '42501') {
          throw appError('forbidden', error.message)
        }

        if (error.code === 'P0002') {
          throw appError('not_found', 'Event was not found.')
        }

        if (error.code === '55000') {
          throw appError('conflict', error.message)
        }

        if (
          error.code === '22023' ||
          error.code === '23502' ||
          error.code === '23505' ||
          error.code === '23514'
        ) {
          throw appError('validation_error', error.message)
        }

        throw appError(
          'external_service_error',
          'Event operational plan could not be saved.',
        )
      }

      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw appError(
          'external_service_error',
          'Event operational plan could not be loaded after saving.',
        )
      }

      return {
        candidateSlotCount: Number(data.candidateSlotCount),
        eventId: String(data.eventId),
        occurrenceCount: Number(data.occurrenceCount),
        resourceRequestCount: Number(data.resourceRequestCount),
      }
    },
    async setOccurrenceCall(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc('set_occurrence_call', {
        p_actor_user_id: input.actorUserId,
        p_call: input.call,
        p_participant_user_id: input.participantUserId,
        p_command_id: input.commandId,
        p_expected_version: input.expectedVersion ?? undefined,
        p_occurrence_id: input.occurrenceId,
      })

      if (error) {
        if (error.code === 'P0002') throw appError('not_found', error.message)
        if (error.code === '42501') throw appError('forbidden', error.message)
        if (error.code === '55000' || error.code === '23505') {
          throw appError('conflict', error.message)
        }
        if (error.code === '22023') {
          throw appError('validation_error', error.message)
        }
        throw appError(
          'external_service_error',
          'Occurrence Call could not be saved.',
        )
      }

      return {
        actorUserId: data.actor_user_id,
        assignedAt: data.assigned_at,
        call: data.call,
        commandId: data.last_command_id,
        occurrenceId: data.occurrence_id,
        userId: data.user_id,
        version: data.version,
      }
    },
  }
}

function createAuthenticatedClient() {
  const token = getBearerTokenFromRequest()

  if (!token) {
    throw appError('unauthenticated', 'Sign in is required.')
  }

  return createSupabaseAnonClient(token)
}
