import {
  getBearerTokenFromRequest,
  getCurrentUserFromRequest,
} from '@/server/auth/session'
import { appError, err, ok } from '@/server/errors'
import {
  createSupabaseAnonClient,
  createSupabaseServiceRoleClient,
} from '@/server/supabase/client'
import { canManageTheater } from '@/features/theaters/permissions'

import type { z } from 'zod'
import type { Json } from '@/server/db/database.types'
import type { getTheaterMembershipInputSchema } from './schemas'

export type TheaterMemberListItem = {
  capabilities: Array<'proposer' | 'reviewer'>
  displayName: string
  membershipVersion: number
  roles: string[]
  userId: string
}

export type TheaterDirectoryMember = {
  displayName: string
  roles: Array<'admin' | 'owner'>
  userId: string
}

export type FormerTheaterMember = {
  displayName: string
  endedMembership: true
  roles: string[]
  userId: string
}

export type PeopleWorkspace = {
  adminAuthorityHistory: AdminAuthorityHistoryEntry[]
  directory: TheaterDirectoryMember[]
  operator: null | {
    formerMembers: FormerTheaterMember[]
    members: TheaterMemberListItem[]
  }
}

export type AdminAuthorityHistoryEntry = {
  actorDisplayName: string
  createdAt: string
  memberDisplayName: string
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

export async function getPeopleWorkspace(input: { theaterId: string }) {
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
      appError('external_service_error', 'People could not be loaded.'),
    )
  }

  if (!actorMembership) {
    return err(appError('forbidden', 'Active Theater membership is required.'))
  }

  const canManage = canManageTheater(actorMembership.roles)
  const supabase = createSupabaseServiceRoleClient()
  const { data: activeMemberships, error: activeError } = await supabase
    .from('theater_memberships')
    .select('user_id, roles, membership_version, profiles!inner(display_name)')
    .eq('theater_id', input.theaterId)
    .eq('status', 'active')
    .order('created_at')

  if (activeError) {
    return err(
      appError('external_service_error', 'People could not be loaded.'),
    )
  }

  const directory = activeMemberships.map(
    (membership): TheaterDirectoryMember => ({
      displayName: membership.profiles.display_name,
      roles: membership.roles.filter(
        (role): role is 'admin' | 'owner' =>
          role === 'admin' || role === 'owner',
      ),
      userId: membership.user_id,
    }),
  )

  if (!canManage) {
    return ok({
      adminAuthorityHistory: [],
      directory,
      operator: null,
    } satisfies PeopleWorkspace)
  }

  const [
    { data: capabilities, error: capabilityError },
    { data: inactiveMemberships, error: inactiveError },
    { data: adminAuthorityEvents, error: historyError },
  ] = await Promise.all([
    supabase
      .from('theater_member_capabilities')
      .select('user_id, capability')
      .eq('theater_id', input.theaterId),
    supabase
      .from('theater_memberships')
      .select('user_id, roles, profiles!inner(display_name)')
      .eq('theater_id', input.theaterId)
      .eq('status', 'inactive')
      .order('created_at'),
    supabase
      .from('activity_events')
      .select('actor_user_id, created_at, payload')
      .eq('theater_id', input.theaterId)
      .eq('action', 'theater.admin.removed')
      .order('created_at', { ascending: false }),
  ])

  if (capabilityError || inactiveError || historyError) {
    return err(
      appError('external_service_error', 'People could not be loaded.'),
    )
  }

  const membershipsByUserId = new Map(
    [...activeMemberships, ...inactiveMemberships].map((membership) => [
      membership.user_id,
      membership,
    ]),
  )

  return ok({
    adminAuthorityHistory: (adminAuthorityEvents ?? []).flatMap((event) => {
      const memberUserId = getPayloadUserId(event.payload)
      const actor = membershipsByUserId.get(event.actor_user_id ?? '')
      const member = membershipsByUserId.get(memberUserId ?? '')
      if (!actor || !member) return []
      return [
        {
          actorDisplayName: actor.profiles.display_name,
          createdAt: event.created_at,
          memberDisplayName: member.profiles.display_name,
        },
      ]
    }),
    directory,
    operator: {
      formerMembers: inactiveMemberships.map(
        (membership): FormerTheaterMember => ({
          displayName: membership.profiles.display_name,
          endedMembership: true,
          roles: membership.roles,
          userId: membership.user_id,
        }),
      ),
      members: activeMemberships.map((membership): TheaterMemberListItem => ({
        capabilities: capabilities
          .filter((capability) => capability.user_id === membership.user_id)
          .map((capability) => capability.capability),
        displayName: membership.profiles.display_name,
        membershipVersion: membership.membership_version,
        roles: membership.roles,
        userId: membership.user_id,
      })),
    },
  } satisfies PeopleWorkspace)
}

function getPayloadUserId(payload: Json) {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    !Array.isArray(payload) &&
    typeof payload.memberUserId === 'string'
  ) {
    return payload.memberUserId
  }
  return null
}
