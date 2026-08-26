import { getBearerTokenFromRequest } from '@/server/auth/session'
import { appError } from '@/server/errors'
import {
  createSupabaseAnonClient,
  createSupabaseServiceRoleClient,
} from '@/server/supabase/client'

export type AdminInvitation = {
  id: string
  memberUserId: string
  status: 'accepted' | 'declined' | 'pending' | 'revoked'
  theaterId: string
}

export type AdminAuthorityRemoval = {
  memberUserId: string
  removedAt: string
  roles: string[]
  theaterId: string
}

export type AdminInvitationPersistence = {
  canManage: (input: { theaterId: string; userId: string }) => Promise<boolean>
  canRespond: (input: { invitationId: string }) => Promise<boolean>
  invite: (input: {
    actorUserId: string
    commandId: string
    memberUserId: string
    theaterId: string
  }) => Promise<AdminInvitation>
  remove: (input: {
    actorUserId: string
    commandId: string
    memberUserId: string
    theaterId: string
  }) => Promise<AdminAuthorityRemoval>
  respond: (input: {
    actorUserId: string
    commandId: string
    invitationId: string
    response: 'accepted' | 'declined'
  }) => Promise<AdminInvitation>
}

export function createSupabaseAdminInvitationPersistence(): AdminInvitationPersistence {
  return {
    async canManage({ theaterId, userId }) {
      const token = getBearerTokenFromRequest()
      if (!token) throw appError('unauthenticated', 'Sign in is required.')

      const { data, error } = await createSupabaseAnonClient(token)
        .from('theater_memberships')
        .select('roles')
        .eq('theater_id', theaterId)
        .eq('user_id', userId)
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
    async canRespond({ invitationId }) {
      const token = getBearerTokenFromRequest()
      if (!token) throw appError('unauthenticated', 'Sign in is required.')
      const { data, error } = await createSupabaseAnonClient(token).rpc(
        'can_respond_to_theater_admin_invitation',
        { p_invitation_id: invitationId },
      )
      if (error) {
        throw appError(
          'external_service_error',
          'Admin Invitation access could not be checked.',
        )
      }
      return data
    },
    async invite(input) {
      const { data, error } = await createSupabaseServiceRoleClient().rpc(
        'invite_theater_admin',
        {
          p_actor_user_id: input.actorUserId,
          p_command_id: input.commandId,
          p_member_user_id: input.memberUserId,
          p_theater_id: input.theaterId,
        },
      )
      if (error) throw mapAdminAuthorityError(error)
      const invitation = data
      if (!invitation)
        throw appError(
          'external_service_error',
          'Admin Invitation could not be created.',
        )
      return toInvitation(invitation)
    },
    async remove(input) {
      const { data, error } = await createSupabaseServiceRoleClient().rpc(
        'remove_theater_admin',
        {
          p_actor_user_id: input.actorUserId,
          p_command_id: input.commandId,
          p_member_user_id: input.memberUserId,
          p_theater_id: input.theaterId,
        },
      )
      if (error) throw mapAdminAuthorityError(error)
      if (!data) {
        throw appError(
          'external_service_error',
          'Admin authority could not be removed.',
        )
      }
      const { data: history, error: historyError } =
        await createSupabaseServiceRoleClient()
          .from('activity_events')
          .select('created_at')
          .eq('id', input.commandId)
          .eq('action', 'theater.admin.removed')
          .maybeSingle()
      if (historyError || !history) {
        throw appError(
          'external_service_error',
          'Admin authority history could not be loaded.',
        )
      }
      return {
        memberUserId: data.user_id,
        removedAt: history.created_at,
        roles: data.roles,
        theaterId: data.theater_id,
      }
    },
    async respond(input) {
      const { data, error } = await createSupabaseServiceRoleClient().rpc(
        'respond_to_theater_admin_invitation',
        {
          p_actor_user_id: input.actorUserId,
          p_command_id: input.commandId,
          p_invitation_id: input.invitationId,
          p_response: input.response,
        },
      )
      if (error) throw mapAdminAuthorityError(error)
      const invitation = data
      if (!invitation)
        throw appError(
          'external_service_error',
          'Admin Invitation could not be updated.',
        )
      return toInvitation(invitation)
    },
  }
}

function toInvitation(invitation: {
  id: string
  member_user_id: string
  status: AdminInvitation['status']
  theater_id: string
}): AdminInvitation {
  return {
    id: invitation.id,
    memberUserId: invitation.member_user_id,
    status: invitation.status,
    theaterId: invitation.theater_id,
  }
}

function mapAdminAuthorityError(error: { code?: string; message: string }) {
  if (error.code === '42501') return appError('forbidden', error.message)
  if (error.code === 'P0002') return appError('not_found', error.message)
  if (['23505', '55000', '23514'].includes(error.code ?? '')) {
    return appError('conflict', error.message)
  }
  return appError(
    'external_service_error',
    'Admin authority could not be completed.',
  )
}
