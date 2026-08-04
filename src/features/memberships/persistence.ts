import { getBearerTokenFromRequest } from '@/server/auth/session'
import { appError } from '@/server/errors'
import {
  createSupabaseAnonClient,
  createSupabaseServiceRoleClient,
} from '@/server/supabase/client'

export type MembershipDeactivationResult = {
  affectedEventIds: string[]
  atRiskEventIds: string[]
  capabilitiesEnded: number
  castAssignmentsEnded: number
  leadershipAssignmentsEnded: number
  memberUserId: string
  membershipStatus: 'inactive'
  membershipVersion: number
  theaterId: string
}

export type MembershipPersistence = {
  authorizeManagement: (input: {
    theaterId: string
    userId: string
  }) => Promise<boolean>
  deactivateMembership: (input: {
    actorUserId: string
    commandId: string
    expectedMembershipVersion: number
    memberUserId: string
    theaterId: string
  }) => Promise<MembershipDeactivationResult>
}

export function createSupabaseMembershipPersistence(): MembershipPersistence {
  return {
    async authorizeManagement(input) {
      const token = getBearerTokenFromRequest()

      if (!token) {
        throw appError('unauthenticated', 'Sign in is required.')
      }

      const supabase = createSupabaseAnonClient(token)
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

    async deactivateMembership(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc(
        'deactivate_theater_membership',
        {
          p_actor_user_id: input.actorUserId,
          p_command_id: input.commandId,
          p_expected_membership_version: input.expectedMembershipVersion,
          p_member_user_id: input.memberUserId,
          p_theater_id: input.theaterId,
        },
      )

      if (error) {
        throw mapMembershipPersistenceError(error)
      }

      const row = data.at(0)

      if (!row) {
        throw appError(
          'external_service_error',
          'Theater membership could not be deactivated.',
        )
      }

      if (row.membership_status !== 'inactive') {
        throw appError(
          'external_service_error',
          'Theater membership could not be deactivated.',
        )
      }

      return {
        affectedEventIds: row.affected_event_ids,
        atRiskEventIds: row.at_risk_event_ids,
        capabilitiesEnded: row.capabilities_ended,
        castAssignmentsEnded: row.cast_assignments_ended,
        leadershipAssignmentsEnded: row.leadership_assignments_ended,
        memberUserId: row.member_user_id,
        membershipStatus: row.membership_status,
        membershipVersion: row.membership_version,
        theaterId: row.theater_id,
      }
    },
  }
}

function mapMembershipPersistenceError(error: {
  code?: string
  message: string
}) {
  if (error.code === '42501') {
    return appError('forbidden', 'Active Owner or Admin access is required.')
  }

  if (error.code === 'P0002') {
    return appError('not_found', 'Theater membership was not found.')
  }

  if (error.code === '55000' || error.code === '23505') {
    return appError('conflict', error.message)
  }

  if (error.code === '23514') {
    return appError(
      'conflict',
      'A Theater must retain at least one active Owner.',
    )
  }

  return appError(
    'external_service_error',
    'Theater membership could not be deactivated.',
  )
}
