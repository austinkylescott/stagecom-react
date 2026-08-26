import { appError } from '@/server/errors'
import { getBearerTokenFromRequest } from '@/server/auth/session'
import {
  createSupabaseAnonClient,
  createSupabaseServiceRoleClient,
} from '@/server/supabase/client'

export type ProducerEligibility =
  'all_members' | 'designated_proposers' | 'admins_only'

export type TheaterCapability = 'proposer' | 'reviewer'

export type TheaterGovernance = {
  counterofferResponseHours: number
  ownerSelfApprovalEnabled: boolean
  primaryVenueId: string
  primaryVenueName: string
  producerEligibility: ProducerEligibility
  setupBufferMinutes: number
  theaterId: string
  turnoverBufferMinutes: number
}

export type GovernancePersistence = {
  authorizeOwner: (input: {
    theaterId: string
    userId: string
  }) => Promise<boolean>
  getOwnerSelfApprovalEnabled: (input: {
    theaterId: string
  }) => Promise<boolean>
  authorizeManagement: (input: {
    theaterId: string
    userId: string
  }) => Promise<boolean>
  setMemberCapability: (input: {
    actorUserId: string
    capability: TheaterCapability
    enabled: boolean
    theaterId: string
    userId: string
  }) => Promise<{ changed: boolean }>
  updateGovernance: (
    input: Omit<TheaterGovernance, 'primaryVenueId'> & { actorUserId: string },
  ) => Promise<TheaterGovernance>
}

export function createSupabaseGovernancePersistence(): GovernancePersistence {
  return {
    async authorizeOwner(input) {
      const supabase = createAuthenticatedClient()
      const { data, error } = await supabase
        .from('theater_memberships')
        .select('roles')
        .eq('theater_id', input.theaterId)
        .eq('user_id', input.userId)
        .eq('status', 'active')
        .maybeSingle()
      if (error) {
        throw appError(
          'external_service_error',
          'Theater access could not be checked.',
        )
      }
      return data?.roles.includes('owner') ?? false
    },
    async getOwnerSelfApprovalEnabled({ theaterId }) {
      const { data, error } = await createSupabaseServiceRoleClient()
        .from('theaters')
        .select('owner_self_approval_enabled')
        .eq('id', theaterId)
        .single()
      if (error) {
        throw appError(
          'external_service_error',
          'Theater governance could not be loaded.',
        )
      }
      return data.owner_self_approval_enabled
    },
    async authorizeManagement(input) {
      const supabase = createAuthenticatedClient()
      const { data, error } = await supabase
        .from('theater_memberships')
        .select('roles')
        .eq('theater_id', input.theaterId)
        .eq('user_id', input.userId)
        .eq('status', 'active')
        .maybeSingle()

      if (error) {
        throw appError(
          'external_service_error',
          'Theater access could not be checked.',
        )
      }

      return (
        data?.roles.some((role) => role === 'owner' || role === 'admin') ??
        false
      )
    },
    async setMemberCapability(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc(
        'set_theater_member_capability',
        {
          p_actor_user_id: input.actorUserId,
          p_capability: input.capability,
          p_enabled: input.enabled,
          p_theater_id: input.theaterId,
          p_user_id: input.userId,
        },
      )

      if (error) {
        if (error.code === '42501') {
          throw appError('forbidden', 'Owner or Admin access is required.')
        }

        if (error.code === '22023') {
          throw appError(
            'validation_error',
            'Active Theater membership is required.',
          )
        }

        throw appError(
          'external_service_error',
          'Theater capability could not be saved.',
        )
      }

      return { changed: data }
    },
    async updateGovernance(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc('update_theater_governance', {
        p_actor_user_id: input.actorUserId,
        p_counteroffer_response_hours: input.counterofferResponseHours,
        p_owner_self_approval_enabled: input.ownerSelfApprovalEnabled,
        p_primary_venue_name: input.primaryVenueName,
        p_producer_eligibility: input.producerEligibility,
        p_setup_buffer_minutes: input.setupBufferMinutes,
        p_theater_id: input.theaterId,
        p_turnover_buffer_minutes: input.turnoverBufferMinutes,
      })

      if (error) {
        if (error.code === '42501') {
          throw appError('forbidden', 'Owner or Admin access is required.')
        }

        if (error.code === '23514' || error.code === '22023') {
          throw appError('validation_error', error.message)
        }

        throw appError(
          'external_service_error',
          'Theater governance could not be saved.',
        )
      }

      const row = data.at(0)

      if (!row) {
        throw appError('not_found', 'Theater was not found.')
      }

      return {
        counterofferResponseHours: row.counteroffer_response_hours,
        ownerSelfApprovalEnabled: row.owner_self_approval_enabled,
        primaryVenueId: row.primary_venue_id,
        primaryVenueName: row.primary_venue_name ?? '',
        producerEligibility: row.producer_eligibility,
        setupBufferMinutes: row.setup_buffer_minutes,
        theaterId: row.id,
        turnoverBufferMinutes: row.turnover_buffer_minutes,
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
