import {
  getBearerTokenFromRequest,
  getCurrentUserFromRequest,
} from '@/server/auth/session'
import { appError, err, ok } from '@/server/errors'
import {
  createSupabaseAnonClient,
  createSupabaseServiceRoleClient,
} from '@/server/supabase/client'

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

  const authenticated = createSupabaseAnonClient(access.data.bearerToken)
  const { data: visibleEvent, error: visibilityError } = await authenticated
    .from('shows')
    .select('id')
    .eq('theater_id', access.data.theater.id)
    .eq('slug', input.eventSlug)
    .maybeSingle()

  if (visibilityError) {
    return err(appError('external_service_error', 'Event could not be loaded.'))
  }

  if (!visibleEvent) {
    return err(appError('not_found', 'Event was not found.'))
  }

  const canManage = access.data.membership.roles.some(
    (role) => role === 'owner' || role === 'admin',
  )
  let isEventLeader = false

  if (!canManage) {
    const { data: leadership, error: leadershipError } = await authenticated
      .from('show_leadership')
      .select('user_id')
      .eq('show_id', visibleEvent.id)
      .eq('user_id', access.data.actorUserId)
      .limit(1)

    if (leadershipError) {
      return err(
        appError('external_service_error', 'Event could not be loaded.'),
      )
    }

    isEventLeader = leadership.length > 0

    if (!isEventLeader) {
      return err(
        appError('forbidden', 'Event collaborator access is required.'),
      )
    }
  }

  // The actor is now explicitly authorized as Theater staff or Event
  // leadership, so the detailed cross-table workspace read may elevate.
  const supabase = createSupabaseServiceRoleClient()
  const { data: managedEvent, error } = await supabase
    .from('shows')
    .select(
      'id, title, slug, lifecycle_status, publication_status, operational_health, target_cast_size, minimum_viable_cast, show_leadership(user_id, role, profiles!show_leadership_user_id_fkey(display_name)), show_cast(user_id), show_occurrences(id, occurrence_type, visibility, position, confirmed_candidate_slot_id, candidate_slots:show_candidate_slots!show_candidate_slots_occurrence_id_fkey(id, starts_at, duration_minutes, local_starts_at, timezone_name, timezone_source, utc_offset_minutes, location_kind, resource_id, location_name, off_site_approved, position)), show_resource_requests(id, resource_type, label, quantity, position)',
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

  const canEditOperationalPlan =
    managedEvent.lifecycle_status === 'draft' &&
    managedEvent.show_leadership.some(
      (leader) =>
        leader.user_id === access.data.actorUserId &&
        leader.role === 'producer',
    )

  return ok({
    allowedActions: { editOperationalPlan: canEditOperationalPlan },
    event: {
      ...managedEvent,
      show_occurrences: managedEvent.show_occurrences
        .sort((left, right) => left.position - right.position)
        .map((occurrence) => ({
          ...occurrence,
          show_candidate_slots: occurrence.candidate_slots.sort(
            (left, right) => left.position - right.position,
          ),
        })),
      show_resource_requests: managedEvent.show_resource_requests.sort(
        (left, right) => left.position - right.position,
      ),
    },
    theater: access.data.theater,
  })
}

async function getTheaterAccess(theaterSlug: string) {
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
    .select(
      'id, name, slug, producer_eligibility, primary_venue_id, primary_venue_name, timezone, timezone_source',
    )
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

  return ok({
    actorUserId: currentUser.data.id,
    bearerToken: token,
    membership,
    theater,
  })
}
