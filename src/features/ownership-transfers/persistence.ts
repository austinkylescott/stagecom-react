import { getBearerTokenFromRequest } from '@/server/auth/session'
import { appError } from '@/server/errors'
import {
  createSupabaseAnonClient,
  createSupabaseServiceRoleClient,
} from '@/server/supabase/client'

export type OwnershipTransfer = {
  formerOwnerRole: 'admin' | 'member'
  id: string
  memberUserId: string
  status: 'accepted' | 'declined' | 'pending'
  theaterId: string
}

export type OwnershipTransferPersistence = {
  canPropose: (input: { theaterId: string; userId: string }) => Promise<boolean>
  canRespond: (input: { transferId: string }) => Promise<boolean>
  propose: (input: {
    actorUserId: string
    commandId: string
    formerOwnerRole: 'admin' | 'member'
    memberUserId: string
    theaterId: string
  }) => Promise<OwnershipTransfer>
  respond: (input: {
    actorUserId: string
    commandId: string
    response: 'accepted' | 'declined'
    transferId: string
  }) => Promise<OwnershipTransfer>
}

export function createSupabaseOwnershipTransferPersistence(): OwnershipTransferPersistence {
  return {
    async canPropose({ theaterId, userId }) {
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
          'Theater ownership could not be checked.',
        )
      }
      return data?.roles.includes('owner') ?? false
    },
    async canRespond({ transferId }) {
      const token = getBearerTokenFromRequest()
      if (!token) throw appError('unauthenticated', 'Sign in is required.')
      const { data, error } = await createSupabaseAnonClient(token).rpc(
        'can_respond_to_theater_ownership_transfer',
        { p_transfer_id: transferId },
      )
      if (error) {
        throw appError(
          'external_service_error',
          'Ownership transfer access could not be checked.',
        )
      }
      return data
    },
    async propose(input) {
      const { data, error } = await createSupabaseServiceRoleClient().rpc(
        'propose_theater_ownership_transfer',
        {
          p_actor_user_id: input.actorUserId,
          p_command_id: input.commandId,
          p_former_owner_role: input.formerOwnerRole,
          p_member_user_id: input.memberUserId,
          p_theater_id: input.theaterId,
        },
      )
      if (error) throw mapOwnershipTransferError(error)
      if (!data)
        throw appError(
          'external_service_error',
          'Ownership transfer could not be proposed.',
        )
      return toOwnershipTransfer(data)
    },
    async respond(input) {
      const { data, error } = await createSupabaseServiceRoleClient().rpc(
        'respond_to_theater_ownership_transfer',
        {
          p_actor_user_id: input.actorUserId,
          p_command_id: input.commandId,
          p_response: input.response,
          p_transfer_id: input.transferId,
        },
      )
      if (error) throw mapOwnershipTransferError(error)
      if (!data)
        throw appError(
          'external_service_error',
          'Ownership transfer could not be updated.',
        )
      return toOwnershipTransfer(data)
    },
  }
}

function toOwnershipTransfer(transfer: {
  former_owner_role: string
  id: string
  member_user_id: string
  status: OwnershipTransfer['status']
  theater_id: string
}): OwnershipTransfer {
  if (
    transfer.former_owner_role !== 'admin' &&
    transfer.former_owner_role !== 'member'
  ) {
    throw appError(
      'external_service_error',
      'Ownership transfer has an invalid former Owner role.',
    )
  }
  return {
    formerOwnerRole: transfer.former_owner_role,
    id: transfer.id,
    memberUserId: transfer.member_user_id,
    status: transfer.status,
    theaterId: transfer.theater_id,
  }
}

function mapOwnershipTransferError(error: { code?: string; message: string }) {
  if (error.code === '42501') return appError('forbidden', error.message)
  if (error.code === 'P0002') return appError('not_found', error.message)
  if (['22023', '23505', '23514', '55000'].includes(error.code ?? '')) {
    return appError('conflict', error.message)
  }
  return appError(
    'external_service_error',
    'Ownership transfer could not be completed.',
  )
}
