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

  const supabase = createSupabaseServiceRoleClient()
  const { data: managedEvent, error } = await supabase
    .from('shows')
    .select(
      'id, title, slug, lifecycle_status, publication_status, operational_health, show_leadership(user_id, role, profiles!show_leadership_user_id_fkey(display_name)), show_cast(user_id)',
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

  const canManage = access.data.membership.roles.some(
    (role) => role === 'owner' || role === 'admin',
  )
  const isLeader = managedEvent.show_leadership.some(
    (leader) => leader.user_id === access.data.actorUserId,
  )

  if (!canManage && !isLeader) {
    return err(appError('forbidden', 'Event collaborator access is required.'))
  }

  return ok({ event: managedEvent, theater: access.data.theater })
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
    .select('id, name, slug, producer_eligibility')
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

  return ok({ actorUserId: currentUser.data.id, membership, theater })
}
