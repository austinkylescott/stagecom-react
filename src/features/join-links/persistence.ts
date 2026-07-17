import { getBearerTokenFromRequest } from '@/server/auth/session'
import { appError } from '@/server/errors'
import {
  createSupabaseAnonClient,
  createSupabaseServiceRoleClient,
} from '@/server/supabase/client'

import type { JoinLinkPersistence } from './commands'

export type ReusableJoinLinkListItem = {
  createdAt: string
  expiresAt: string | null
  id: string
  maxUses: number | null
  revokedAt: string | null
  rotatedFromId: string | null
  status: 'active' | 'exhausted' | 'expired' | 'revoked'
  useCount: number
}

export type ReusableJoinLinkPersistence = JoinLinkPersistence & {
  list: (input: {
    actorUserId: string
    theaterId: string
  }) => Promise<ReusableJoinLinkListItem[]>
  preview: (input: { tokenHash: string }) => Promise<{
    result: 'active' | 'exhausted' | 'expired' | 'invalid' | 'revoked'
    theaterName?: string
  }>
}

export function createSupabaseJoinLinkPersistence(): ReusableJoinLinkPersistence {
  return {
    async accept(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc(
        'accept_reusable_theater_join_link',
        {
          p_actor_user_id: input.actorUserId,
          p_token_hash: input.tokenHash,
        },
      )

      if (error) {
        throw mapJoinLinkPersistenceError(
          error,
          'Reusable Join Link could not be accepted.',
        )
      }

      const row = data.at(0)

      if (!row || !isAcceptanceResult(row.result)) {
        throw appError(
          'external_service_error',
          'Reusable Join Link could not be accepted.',
        )
      }

      if (row.result !== 'accepted') {
        return { result: row.result }
      }

      return {
        acceptedAt: row.accepted_at,
        membershipCreated: row.membership_created,
        result: 'accepted',
        theater: {
          id: row.theater_id,
          name: row.theater_name,
          slug: row.theater_slug,
        },
      }
    },
    async canManage(input) {
      const accessToken = getBearerTokenFromRequest()

      if (!accessToken) {
        throw appError('unauthenticated', 'Sign in is required.')
      }

      const supabase = createSupabaseAnonClient(accessToken)
      const theaterId =
        'joinLinkId' in input
          ? await getManagedJoinLinkTheaterId(supabase, input.joinLinkId)
          : input.theaterId

      if (!theaterId) {
        return false
      }

      const { data, error } = await supabase
        .from('theater_memberships')
        .select('roles')
        .eq('theater_id', theaterId)
        .eq('user_id', input.userId)
        .eq('status', 'active')
        .maybeSingle()

      if (error) {
        throw appError(
          'external_service_error',
          'Join Link access could not be checked.',
        )
      }

      return Boolean(
        data?.roles.some((role) => role === 'owner' || role === 'admin'),
      )
    },
    async create(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc(
        'create_reusable_theater_join_link',
        {
          p_actor_user_id: input.actorUserId,
          ...(input.expiresAt ? { p_expires_at: input.expiresAt } : {}),
          ...(input.maxUses ? { p_max_uses: input.maxUses } : {}),
          p_theater_id: input.theaterId,
          p_token_hash: input.tokenHash,
        },
      )

      if (error) {
        throw mapJoinLinkPersistenceError(
          error,
          'Reusable Join Link could not be created.',
        )
      }

      const row = data.at(0)

      if (!row) {
        throw appError(
          'external_service_error',
          'Reusable Join Link could not be created.',
        )
      }

      return {
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        id: row.id,
        maxUses: row.max_uses,
        theaterId: row.theater_id,
      }
    },
    async list(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc(
        'list_reusable_theater_join_links',
        {
          p_actor_user_id: input.actorUserId,
          p_theater_id: input.theaterId,
        },
      )

      if (error) {
        throw mapJoinLinkPersistenceError(
          error,
          'Reusable Join Links could not be loaded.',
        )
      }

      return data.map((row) => {
        if (!isListStatus(row.status)) {
          throw appError(
            'external_service_error',
            'Reusable Join Links could not be loaded.',
          )
        }

        return {
          createdAt: row.created_at,
          expiresAt: row.expires_at,
          id: row.id,
          maxUses: row.max_uses,
          revokedAt: row.revoked_at,
          rotatedFromId: row.rotated_from_id,
          status: row.status,
          useCount: row.use_count,
        }
      })
    },
    async preview(input) {
      const supabase = createSupabaseAnonClient()
      const { data, error } = await supabase.rpc(
        'get_reusable_theater_join_link',
        { p_token_hash: input.tokenHash },
      )

      if (error) {
        throw mapJoinLinkPersistenceError(
          error,
          'Reusable Join Link could not be checked.',
        )
      }

      const row = data.at(0)

      if (!row || !isPreviewResult(row.result)) {
        throw appError(
          'external_service_error',
          'Reusable Join Link could not be checked.',
        )
      }

      return {
        result: row.result,
        ...(row.theater_name ? { theaterName: row.theater_name } : {}),
      }
    },
    async revoke(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc(
        'revoke_reusable_theater_join_link',
        {
          p_actor_user_id: input.actorUserId,
          p_join_link_id: input.joinLinkId,
        },
      )

      if (error) {
        throw mapJoinLinkPersistenceError(
          error,
          'Reusable Join Link could not be revoked.',
        )
      }

      return { revoked: data }
    },
    async rotate(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc(
        'rotate_reusable_theater_join_link',
        {
          p_actor_user_id: input.actorUserId,
          p_join_link_id: input.joinLinkId,
          p_token_hash: input.tokenHash,
        },
      )

      if (error) {
        throw mapJoinLinkPersistenceError(
          error,
          'Reusable Join Link could not be rotated.',
        )
      }

      const row = data.at(0)

      if (!row) {
        throw appError(
          'external_service_error',
          'Reusable Join Link could not be rotated.',
        )
      }

      return {
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        id: row.id,
        maxUses: row.max_uses,
        rotatedFromId: row.rotated_from_id,
        theaterId: row.theater_id,
      }
    },
  }
}

async function getManagedJoinLinkTheaterId(
  supabase: ReturnType<typeof createSupabaseAnonClient>,
  joinLinkId: string,
) {
  const { data, error } = await supabase
    .from('theater_join_links')
    .select('theater_id')
    .eq('id', joinLinkId)
    .maybeSingle()

  if (error) {
    throw appError(
      'external_service_error',
      'Join Link access could not be checked.',
    )
  }

  return data?.theater_id
}

function isAcceptanceResult(
  value: string,
): value is 'accepted' | 'exhausted' | 'expired' | 'invalid' | 'revoked' {
  return ['accepted', 'exhausted', 'expired', 'invalid', 'revoked'].includes(
    value,
  )
}

function isPreviewResult(
  value: string,
): value is 'active' | 'exhausted' | 'expired' | 'invalid' | 'revoked' {
  return ['active', 'exhausted', 'expired', 'invalid', 'revoked'].includes(
    value,
  )
}

function isListStatus(
  value: string,
): value is 'active' | 'exhausted' | 'expired' | 'revoked' {
  return ['active', 'exhausted', 'expired', 'revoked'].includes(value)
}

function mapJoinLinkPersistenceError(
  error: { code?: string },
  fallbackMessage: string,
) {
  if (error.code === '42501') {
    return appError('forbidden', 'Owner or Admin access is required.')
  }

  if (error.code === '23505') {
    return appError('conflict', 'That Reusable Join Link token is in use.')
  }

  if (error.code === '23514') {
    return appError('validation_error', 'The Reusable Join Link is invalid.')
  }

  return appError('external_service_error', fallbackMessage)
}
