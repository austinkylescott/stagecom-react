import { appError } from '@/server/errors'
import { getBearerTokenFromRequest } from '@/server/auth/session'
import {
  createSupabaseAnonClient,
  createSupabaseServiceRoleClient,
} from '@/server/supabase/client'

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

export type EventPersistence = {
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
}

export function createSupabaseEventPersistence(): EventPersistence {
  return {
    async authorizeCreation(input) {
      const supabase = createAuthenticatedClient()
      const { data: theater, error: theaterError } = await supabase
        .from('theaters')
        .select('producer_eligibility')
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
      const [
        { data: memberships, error: membershipError },
        { data: capabilities, error: capabilityError },
      ] = await Promise.all([
        supabase
          .from('theater_memberships')
          .select('user_id, roles')
          .eq('theater_id', input.theaterId)
          .eq('status', 'active')
          .in('user_id', collaboratorUserIds),
        supabase
          .from('theater_member_capabilities')
          .select('user_id, capability')
          .eq('theater_id', input.theaterId)
          .eq('capability', 'proposer')
          .in('user_id', producerUserIds),
      ])

      if (membershipError || capabilityError) {
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
            theater.producer_eligibility === 'all_members' ||
            (theater.producer_eligibility === 'designated_proposers' &&
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
  }
}

function createAuthenticatedClient() {
  const token = getBearerTokenFromRequest()

  if (!token) {
    throw appError('unauthenticated', 'Sign in is required.')
  }

  return createSupabaseAnonClient(token)
}
