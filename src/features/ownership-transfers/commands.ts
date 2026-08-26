import { getCurrentUserFromRequest } from '@/server/auth/session'
import { appError, err, ok, toAppError } from '@/server/errors'

import { createSupabaseOwnershipTransferPersistence } from './persistence'

import type { AppResult } from '@/server/errors'
import type { OwnershipTransferPersistence } from './persistence'

type Dependencies = {
  getCurrentUser: () => Promise<AppResult<{ id: string }>>
  persistence: OwnershipTransferPersistence
}

function defaultDependencies(): Dependencies {
  return {
    getCurrentUser: getCurrentUserFromRequest,
    persistence: createSupabaseOwnershipTransferPersistence(),
  }
}

export async function proposeTheaterOwnershipTransfer(
  input: {
    commandId: string
    formerOwnerRole: 'admin' | 'member'
    memberUserId: string
    theaterId: string
  },
  dependencies: Dependencies = defaultDependencies(),
) {
  const actor = await dependencies.getCurrentUser()
  if (!actor.ok) return actor
  try {
    if (
      !(await dependencies.persistence.canPropose({
        theaterId: input.theaterId,
        userId: actor.data.id,
      }))
    ) {
      return err(
        appError(
          'forbidden',
          'Only the current Owner can propose an ownership transfer.',
        ),
      )
    }
    return ok(
      await dependencies.persistence.propose({
        ...input,
        actorUserId: actor.data.id,
      }),
    )
  } catch (error) {
    return err(toAppError(error))
  }
}

export async function respondToTheaterOwnershipTransfer(
  input: {
    commandId: string
    response: 'accepted' | 'declined'
    transferId: string
  },
  dependencies: Dependencies = defaultDependencies(),
) {
  const actor = await dependencies.getCurrentUser()
  if (!actor.ok) return actor
  try {
    if (
      !(await dependencies.persistence.canRespond({
        transferId: input.transferId,
      }))
    ) {
      return err(
        appError(
          'forbidden',
          'Only the proposed successor can respond to a pending ownership transfer.',
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
