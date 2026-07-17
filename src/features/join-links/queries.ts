import { getCurrentUserFromRequest } from '@/server/auth/session'
import { appError, err, ok, toAppError } from '@/server/errors'

import { createSupabaseJoinLinkPersistence } from './persistence'

import type { AppResult } from '@/server/errors'
import type {
  ReusableJoinLinkListItem,
  ReusableJoinLinkPersistence,
} from './persistence'

type ListDependencies = {
  getCurrentUser: () => Promise<AppResult<{ id: string }>>
  persistence: Pick<ReusableJoinLinkPersistence, 'canManage' | 'list'>
}

export async function listReusableJoinLinks(
  input: { theaterId: string },
  dependencies: ListDependencies = {
    getCurrentUser: getCurrentUserFromRequest,
    persistence: createSupabaseJoinLinkPersistence(),
  },
): Promise<AppResult<{ links: ReusableJoinLinkListItem[] }>> {
  const currentUser = await dependencies.getCurrentUser()

  if (!currentUser.ok) {
    return currentUser
  }

  try {
    const canManage = await dependencies.persistence.canManage({
      theaterId: input.theaterId,
      userId: currentUser.data.id,
    })

    if (!canManage) {
      return err(appError('forbidden', 'Owner or Admin access is required.'))
    }

    const links = await dependencies.persistence.list({
      actorUserId: currentUser.data.id,
      theaterId: input.theaterId,
    })

    return ok({ links })
  } catch (error) {
    return err(toAppError(error))
  }
}
