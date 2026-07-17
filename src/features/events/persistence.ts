import { appError } from '@/server/errors'
import { createSupabaseServiceRoleClient } from '@/server/supabase/client'

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
