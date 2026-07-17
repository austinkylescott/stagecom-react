import { appError } from '@/server/errors'
import { getBearerTokenFromRequest } from '@/server/auth/session'
import {
  createSupabaseAnonClient,
  createSupabaseServiceRoleClient,
} from '@/server/supabase/client'

import type { Database } from '@/server/db/database.types'
import type { InvitationPersistence } from './commands'

type InviteStatus = Database['public']['Enums']['invite_status']

export type TargetedInvitationListItem = {
  acceptedAt?: string
  createdAt: string
  email: string
  expiresAt: string
  id: string
  status: InviteStatus
}

export type TargetedInvitationPreview = {
  result: InviteStatus | 'invalid'
  theaterName?: string
}

export type TargetedInvitationPersistence = InvitationPersistence & {
  listTargeted: (input: {
    actorUserId: string
    theaterId: string
  }) => Promise<TargetedInvitationListItem[]>
  previewTargeted: (input: {
    tokenHash: string
  }) => Promise<TargetedInvitationPreview>
}

export function createSupabaseInvitationPersistence(): TargetedInvitationPersistence {
  return {
    async acceptTargeted(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc(
        'accept_targeted_theater_invitation',
        {
          p_actor_email: input.actorEmail,
          p_actor_user_id: input.actorUserId,
          p_token_hash: input.tokenHash,
        },
      )

      if (error) {
        throw mapInvitationPersistenceError(
          error,
          'Invitation could not be accepted.',
        )
      }

      const row = data.at(0)

      if (!row || !isAcceptanceResult(row.result)) {
        throw appError(
          'external_service_error',
          'Invitation could not be accepted.',
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
    async canManageTargeted(input) {
      const supabase = createAuthenticatedClient()

      if ('invitationId' in input) {
        const { data, error } = await supabase
          .from('theater_invites')
          .select('id')
          .eq('id', input.invitationId)
          .maybeSingle()

        if (error) {
          throw appError(
            'external_service_error',
            'Invitation access could not be checked.',
          )
        }

        return Boolean(data)
      }

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
          'Invitation access could not be checked.',
        )
      }

      return Boolean(
        data?.roles.some((role) => role === 'owner' || role === 'admin'),
      )
    },
    async createTargeted(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc(
        'create_targeted_theater_invitation',
        {
          p_actor_user_id: input.actorUserId,
          p_email: input.email,
          ...(input.expiresAt ? { p_expires_at: input.expiresAt } : {}),
          p_theater_id: input.theaterId,
          p_token_hash: input.tokenHash,
        },
      )

      if (error) {
        throw mapInvitationPersistenceError(
          error,
          'Invitation could not be created.',
        )
      }

      const row = data.at(0)

      if (!row) {
        throw appError(
          'external_service_error',
          'Invitation could not be created.',
        )
      }

      return {
        expiresAt: row.expires_at,
        id: row.id,
        theaterId: row.theater_id,
      }
    },
    async listTargeted(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc(
        'list_targeted_theater_invitations',
        {
          p_actor_user_id: input.actorUserId,
          p_theater_id: input.theaterId,
        },
      )

      if (error) {
        throw mapInvitationPersistenceError(
          error,
          'Invitations could not be loaded.',
        )
      }

      return data.map((invitation) => ({
        ...(invitation.accepted_at
          ? { acceptedAt: invitation.accepted_at }
          : {}),
        createdAt: invitation.created_at,
        email: invitation.email,
        expiresAt: invitation.expires_at,
        id: invitation.id,
        status: invitation.status,
      }))
    },
    async previewTargeted(input) {
      const supabase = createSupabaseAnonClient()
      const { data, error } = await supabase.rpc(
        'get_targeted_theater_invitation',
        { p_token_hash: input.tokenHash },
      )

      if (error) {
        throw mapInvitationPersistenceError(
          error,
          'Invitation could not be checked.',
        )
      }

      const row = data.at(0)

      if (!row || !isPreviewResult(row.result)) {
        throw appError(
          'external_service_error',
          'Invitation could not be checked.',
        )
      }

      return {
        result: row.result,
        ...(row.theater_name ? { theaterName: row.theater_name } : {}),
      }
    },
    async revokeTargeted(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc(
        'revoke_targeted_theater_invitation',
        {
          p_actor_user_id: input.actorUserId,
          p_invitation_id: input.invitationId,
        },
      )

      if (error) {
        throw mapInvitationPersistenceError(
          error,
          'Invitation could not be revoked.',
        )
      }

      return { revoked: data }
    },
  }
}

function createAuthenticatedClient() {
  const accessToken = getBearerTokenFromRequest()

  if (!accessToken) {
    throw appError('unauthenticated', 'Sign in is required.')
  }

  return createSupabaseAnonClient(accessToken)
}

function isAcceptanceResult(
  value: string,
): value is
  'accepted' | 'consumed' | 'expired' | 'invalid' | 'revoked' | 'wrong_email' {
  return [
    'accepted',
    'consumed',
    'expired',
    'invalid',
    'revoked',
    'wrong_email',
  ].includes(value)
}

function isPreviewResult(value: string): value is InviteStatus | 'invalid' {
  return ['accepted', 'expired', 'invalid', 'pending', 'revoked'].includes(
    value,
  )
}

function mapInvitationPersistenceError(
  error: { code?: string },
  fallbackMessage: string,
) {
  if (error.code === '42501') {
    return appError('forbidden', 'Owner or Admin access is required.')
  }

  if (error.code === '23505') {
    return appError('conflict', 'That invitation token is already in use.')
  }

  if (error.code === '23514') {
    return appError('validation_error', 'The invitation is invalid.')
  }

  return appError('external_service_error', fallbackMessage)
}
