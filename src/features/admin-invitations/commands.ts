import { getCurrentUserFromRequest } from '@/server/auth/session'
import { appError, err, ok, toAppError } from '@/server/errors'

import { createSupabaseAdminInvitationPersistence } from './persistence'

import type { AppResult } from '@/server/errors'
import type { AdminInvitationPersistence } from './persistence'

type Dependencies = {
  getCurrentUser: () => Promise<AppResult<{ id: string }>>
  persistence: AdminInvitationPersistence
}

function defaultDependencies(): Dependencies {
  return {
    getCurrentUser: getCurrentUserFromRequest,
    persistence: createSupabaseAdminInvitationPersistence(),
  }
}

export async function inviteTheaterAdmin(
  input: { commandId: string; memberUserId: string; theaterId: string },
  dependencies: Dependencies = defaultDependencies(),
) {
  const actor = await dependencies.getCurrentUser()
  if (!actor.ok) return actor
  try {
    if (
      !(await dependencies.persistence.canManage({
        theaterId: input.theaterId,
        userId: actor.data.id,
      }))
    ) {
      return err(
        appError('forbidden', 'Active Owner or Admin access is required.'),
      )
    }
    return ok(
      await dependencies.persistence.invite({
        ...input,
        actorUserId: actor.data.id,
      }),
    )
  } catch (error) {
    return err(toAppError(error))
  }
}

export async function respondToTheaterAdminInvitation(
  input: {
    commandId: string
    invitationId: string
    response: 'accepted' | 'declined'
  },
  dependencies: Dependencies = defaultDependencies(),
) {
  const actor = await dependencies.getCurrentUser()
  if (!actor.ok) return actor
  try {
    if (
      !(await dependencies.persistence.canRespond({
        invitationId: input.invitationId,
      }))
    ) {
      return err(
        appError(
          'forbidden',
          'Only the invited Theater Member can respond to a pending Admin Invitation.',
        ),
      )
    }
    return ok(
      await dependencies.persistence.respond({
        ...input,
        actorUserId: actor.data.id,
      }),
    )
  } catch (error) {
    return err(toAppError(error))
  }
}

export async function removeTheaterAdmin(
  input: { commandId: string; memberUserId: string; theaterId: string },
  dependencies: Dependencies = defaultDependencies(),
) {
  const actor = await dependencies.getCurrentUser()
  if (!actor.ok) return actor
  try {
    if (
      !(await dependencies.persistence.canManage({
        theaterId: input.theaterId,
        userId: actor.data.id,
      }))
    ) {
      return err(
        appError('forbidden', 'Active Owner or Admin access is required.'),
      )
    }
    return ok(
      await dependencies.persistence.remove({
        ...input,
        actorUserId: actor.data.id,
      }),
    )
  } catch (error) {
    return err(toAppError(error))
  }
}
