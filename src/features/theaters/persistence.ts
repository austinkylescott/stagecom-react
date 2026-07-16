import { appError } from '@/server/errors'
import { getBearerTokenFromRequest } from '@/server/auth/session'
import {
  createSupabaseAnonClient,
  createSupabaseServiceRoleClient,
} from '@/server/supabase/client'

import type { Database, Json } from '@/server/db/database.types'
import type { TheaterSummary } from './commands'

type TheaterRole = Database['public']['Enums']['theater_role']

export type TheaterRecord = TheaterSummary & {
  city?: string
  country?: string
  logoUrl?: string
  postalCode?: string
  socialLinks?: Record<string, string>
  stateRegion?: string
  street?: string
  tagline?: string
  timezone?: string
  websiteUrl?: string
}

export type TheaterAccess = {
  roles: TheaterRole[]
  theater: TheaterRecord
}

export type TheaterPersistence = {
  createWithOwner: (input: {
    actorUserId: string
    name: string
    slug: string
    timezone?: string
  }) => Promise<{ created: boolean; theater: TheaterSummary }>
  findAuthorizedById: (input: {
    theaterId: string
    userId: string
  }) => Promise<TheaterAccess | null>
  findAuthorizedBySlug: (input: {
    theaterSlug: string
    userId: string
  }) => Promise<TheaterAccess | null>
  findPublishedBySlug: (input: {
    theaterSlug: string
  }) => Promise<TheaterRecord | null>
  listForUser: (input: {
    userId: string
  }) => Promise<Array<{ isDefault: boolean; theater: TheaterRecord }>>
  publish: (input: {
    actorUserId: string
    theaterId: string
  }) => Promise<TheaterRecord>
  setDefault: (input: {
    theaterId: string
    userId: string
  }) => Promise<TheaterRecord | null>
  updateSetup: (input: {
    actorUserId: string
    changes: Partial<Omit<TheaterRecord, 'id' | 'status'>>
    theaterId: string
  }) => Promise<TheaterRecord>
}

const theaterFields =
  'id, name, slug, status, tagline, timezone, street, city, state_region, postal_code, country, website_url, logo_url, social_links'

export function createSupabaseTheaterPersistence(): TheaterPersistence {
  return {
    async createWithOwner(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc('create_theater_with_owner', {
        p_actor_user_id: input.actorUserId,
        p_name: input.name,
        p_slug: input.slug,
        p_timezone: input.timezone ?? null,
      })

      if (error) {
        if (error.code === '23505') {
          throw appError('conflict', 'That Theater slug is already in use.')
        }

        throw appError(
          'external_service_error',
          'Theater could not be created.',
        )
      }

      const row = data.at(0)

      if (!row) {
        throw appError(
          'external_service_error',
          'Theater could not be created.',
        )
      }

      return {
        created: row.created,
        theater: {
          id: row.id,
          name: row.name,
          slug: row.slug,
          status: row.status,
        },
      }
    },
    async findAuthorizedById(input) {
      const supabase = createAuthenticatedClient()
      const { data: membership, error: membershipError } = await supabase
        .from('theater_memberships')
        .select('roles')
        .eq('theater_id', input.theaterId)
        .eq('user_id', input.userId)
        .eq('status', 'active')
        .maybeSingle()

      if (membershipError) {
        throw appError(
          'external_service_error',
          'Theater access could not be checked.',
        )
      }

      if (!membership) {
        return null
      }

      const { data: theater, error: theaterError } = await supabase
        .from('theaters')
        .select(theaterFields)
        .eq('id', input.theaterId)
        .maybeSingle()

      if (theaterError) {
        throw appError(
          'external_service_error',
          'Theater access could not be checked.',
        )
      }

      return theater
        ? { roles: membership.roles, theater: mapTheater(theater) }
        : null
    },
    async findAuthorizedBySlug(input) {
      const supabase = createAuthenticatedClient()
      const { data: theater, error: theaterError } = await supabase
        .from('theaters')
        .select(theaterFields)
        .eq('slug', input.theaterSlug)
        .maybeSingle()

      if (theaterError) {
        throw appError(
          'external_service_error',
          'Theater access could not be checked.',
        )
      }

      if (!theater) {
        return null
      }

      const { data: membership, error: membershipError } = await supabase
        .from('theater_memberships')
        .select('roles')
        .eq('theater_id', theater.id)
        .eq('user_id', input.userId)
        .eq('status', 'active')
        .maybeSingle()

      if (membershipError) {
        throw appError(
          'external_service_error',
          'Theater access could not be checked.',
        )
      }

      return membership
        ? { roles: membership.roles, theater: mapTheater(theater) }
        : null
    },
    async findPublishedBySlug(input) {
      const supabase = createSupabaseAnonClient()
      const { data, error } = await supabase
        .from('theaters')
        .select(theaterFields)
        .eq('slug', input.theaterSlug)
        .eq('status', 'published')
        .maybeSingle()

      if (error) {
        throw appError(
          'external_service_error',
          'Published Theater could not be loaded.',
        )
      }

      return data ? mapTheater(data) : null
    },
    async listForUser(input) {
      const supabase = createAuthenticatedClient()
      const { data: memberships, error: membershipsError } = await supabase
        .from('theater_memberships')
        .select('theater_id, is_home, created_at')
        .eq('user_id', input.userId)
        .eq('status', 'active')
        .order('is_home', { ascending: false })
        .order('created_at', { ascending: true })

      if (membershipsError) {
        throw appError(
          'external_service_error',
          'Theaters could not be loaded.',
        )
      }

      if (memberships.length === 0) {
        return []
      }

      const { data: theaters, error: theatersError } = await supabase
        .from('theaters')
        .select(theaterFields)
        .in(
          'id',
          memberships.map((membership) => membership.theater_id),
        )

      if (theatersError) {
        throw appError(
          'external_service_error',
          'Theaters could not be loaded.',
        )
      }

      return memberships.flatMap((membership) => {
        const theater = theaters.find(
          (candidate) => candidate.id === membership.theater_id,
        )

        return theater
          ? [{ isDefault: membership.is_home, theater: mapTheater(theater) }]
          : []
      })
    },
    async publish(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc('publish_theater', {
        p_actor_user_id: input.actorUserId,
        p_theater_id: input.theaterId,
      })

      if (error) {
        if (error.code === '42501') {
          throw appError('forbidden', 'Owner or Admin access is required.')
        }

        if (error.code === '23514') {
          throw appError(
            'validation_error',
            'Complete the Theater profile before Publication.',
          )
        }

        throw appError(
          'external_service_error',
          'Theater could not be published.',
        )
      }

      const row = data.at(0)

      if (!row) {
        throw appError('not_found', 'Theater was not found.')
      }

      return mapTheater(row)
    },
    async setDefault(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc('set_default_theater', {
        p_theater_id: input.theaterId,
        p_user_id: input.userId,
      })

      if (error) {
        if (error.code === '42501') {
          return null
        }

        throw appError(
          'external_service_error',
          'Default Theater could not be saved.',
        )
      }

      const row = data.at(0)
      return row ? mapTheater(row) : null
    },
    async updateSetup(input) {
      const supabase = createSupabaseServiceRoleClient()
      const changes = input.changes
      const { data, error } = await supabase.rpc('update_theater_setup', {
        p_actor_user_id: input.actorUserId,
        p_changes: {
          ...(changes.city === undefined ? {} : { city: changes.city }),
          ...(changes.country === undefined
            ? {}
            : { country: changes.country }),
          ...(changes.name === undefined ? {} : { name: changes.name }),
          ...(changes.postalCode === undefined
            ? {}
            : { postalCode: changes.postalCode }),
          ...(changes.slug === undefined ? {} : { slug: changes.slug }),
          ...(changes.socialLinks === undefined
            ? {}
            : { socialLinks: changes.socialLinks }),
          ...(changes.stateRegion === undefined
            ? {}
            : { stateRegion: changes.stateRegion }),
          ...(changes.street === undefined ? {} : { street: changes.street }),
          ...(changes.tagline === undefined
            ? {}
            : { tagline: changes.tagline }),
          ...(changes.timezone === undefined
            ? {}
            : { timezone: changes.timezone }),
          ...(changes.websiteUrl === undefined
            ? {}
            : { websiteUrl: changes.websiteUrl }),
        },
        p_theater_id: input.theaterId,
      })

      if (error) {
        if (error.code === '42501') {
          throw appError('forbidden', 'Owner or Admin access is required.')
        }

        if (error.code === '23505') {
          throw appError('conflict', 'That Theater slug is already in use.')
        }

        throw appError(
          'external_service_error',
          'Theater setup could not be saved.',
        )
      }

      const row = data.at(0)

      if (!row) {
        throw appError('not_found', 'Theater was not found.')
      }

      return mapTheater(row)
    },
  }
}

function mapTheater(row: {
  city: string | null
  country: string | null
  id: string
  logo_url: string | null
  name: string
  postal_code: string | null
  slug: string
  social_links: Json
  state_region: string | null
  status: Database['public']['Enums']['theater_status']
  street: string | null
  tagline: string | null
  timezone: string | null
  website_url: string | null
}): TheaterRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    ...(row.city ? { city: row.city } : {}),
    ...(row.country ? { country: row.country } : {}),
    ...(row.logo_url ? { logoUrl: row.logo_url } : {}),
    ...(row.postal_code ? { postalCode: row.postal_code } : {}),
    ...(row.state_region ? { stateRegion: row.state_region } : {}),
    ...(row.street ? { street: row.street } : {}),
    ...(isStringRecord(row.social_links)
      ? { socialLinks: row.social_links }
      : {}),
    ...(row.tagline ? { tagline: row.tagline } : {}),
    ...(row.timezone ? { timezone: row.timezone } : {}),
    ...(row.website_url ? { websiteUrl: row.website_url } : {}),
  }
}

function isStringRecord(value: Json): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === 'string')
  )
}

function createAuthenticatedClient() {
  const token = getBearerTokenFromRequest()

  if (!token) {
    throw appError('unauthenticated', 'Sign in is required.')
  }

  return createSupabaseAnonClient(token)
}
