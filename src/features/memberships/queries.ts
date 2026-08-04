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
import type { getTheaterMembershipInputSchema } from './schemas'

export type TheaterMemberListItem = {
  capabilities: Array<'proposer' | 'reviewer'>
  displayName: string
  membershipVersion: number
  roles: string[]
  userId: string
}

export async function getTheaterMembership(
  input: z.infer<typeof getTheaterMembershipInputSchema>,
) {
  const currentUser = await getCurrentUserFromRequest()

  if (!currentUser.ok) {
    return currentUser
  }

  const supabase = createSupabaseServiceRoleClient()
  const { data: theater, error: theaterError } = await supabase
    .from('theaters')
    .select('id, name, slug')
    .eq('slug', input.theaterSlug)
    .maybeSingle()

  if (theaterError) {
    return err(
      appError(
        'external_service_error',
        'Theater access could not be checked.',
      ),
    )
  }

  if (!theater) {
    return err(appError('not_found', 'Theater was not found.'))
  }

  const { data: membership, error: membershipError } = await supabase
    .from('theater_memberships')
    .select(
      'theater_id, user_id, roles, status, is_home, home_rank, created_at',
    )
    .eq('theater_id', theater.id)
    .eq('user_id', currentUser.data.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) {
    return err(
      appError(
        'external_service_error',
        'Theater membership could not be checked.',
      ),
    )
  }

  if (!membership) {
    return err(appError('forbidden', 'You do not have access to this theater.'))
  }

  return ok({
    membership,
    theater,
  })
}

export async function listTheaterMembers(input: { theaterId: string }) {
  const currentUser = await getCurrentUserFromRequest()

  if (!currentUser.ok) {
    return currentUser
  }

  const token = getBearerTokenFromRequest()

  if (!token) {
    return err(appError('unauthenticated', 'Sign in is required.'))
  }

  const userSupabase = createSupabaseAnonClient(token)
  const { data: actorMembership, error: actorError } = await userSupabase
    .from('theater_memberships')
    .select('roles')
    .eq('theater_id', input.theaterId)
    .eq('user_id', currentUser.data.id)
    .eq('status', 'active')
    .maybeSingle()

  if (actorError) {
    return err(
      appError(
        'external_service_error',
        'Theater Members could not be loaded.',
      ),
    )
  }

  if (
    !actorMembership?.roles.some((role) => role === 'owner' || role === 'admin')
  ) {
    return err(
      appError('forbidden', 'Active Owner or Admin access is required.'),
    )
  }

  const supabase = createSupabaseServiceRoleClient()

  const [
    { data: memberships, error },
    { data: capabilities, error: capabilityError },
  ] = await Promise.all([
    supabase
      .from('theater_memberships')
      .select(
        'user_id, roles, membership_version, profiles!inner(display_name)',
      )
      .eq('theater_id', input.theaterId)
      .eq('status', 'active')
      .order('created_at'),
    supabase
      .from('theater_member_capabilities')
      .select('user_id, capability')
      .eq('theater_id', input.theaterId),
  ])

  if (error || capabilityError) {
    return err(
      appError(
        'external_service_error',
        'Theater Members could not be loaded.',
      ),
    )
  }

  return ok({
    members: memberships.map((membership): TheaterMemberListItem => ({
      capabilities: capabilities
        .filter((capability) => capability.user_id === membership.user_id)
        .map((capability) => capability.capability),
      displayName: membership.profiles.display_name,
      membershipVersion: membership.membership_version,
      roles: membership.roles,
      userId: membership.user_id,
    })),
  })
}
