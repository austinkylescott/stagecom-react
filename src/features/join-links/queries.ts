import { getCurrentUserFromRequest } from '@/server/auth/session'
import { appError, err, ok, toAppError } from '@/server/errors'
import { inviteTokenSchema } from '@/server/schemas'

import { hashInvitationToken } from '../invitations/tokens'
import { createSupabaseJoinLinkPersistence } from './persistence'

import type { AppResult } from '@/server/errors'
import type {
  ReusableJoinLinkListItem,
  ReusableJoinLinkPersistence,
} from './persistence'

export type ReusableJoinLinkView =
  | { state: 'active'; theaterName: string }
  | { state: 'exhausted' | 'expired' | 'invalid' | 'revoked' }

type PreviewDependencies = {
  hashToken: (token: string) => Promise<string>
  persistence: Pick<ReusableJoinLinkPersistence, 'preview'>
}

type ListDependencies = {
  getCurrentUser: () => Promise<AppResult<{ id: string }>>
  persistence: Pick<ReusableJoinLinkPersistence, 'canManage' | 'list'>
}

export async function getReusableJoinLinkPreview(
  input: { joinToken: string },
  dependencies: PreviewDependencies = {
    hashToken: hashInvitationToken,
    persistence: createSupabaseJoinLinkPersistence(),
  },
) {
  if (!inviteTokenSchema.safeParse(input.joinToken).success) {
    return ok({ state: 'invalid' as const })
  }

  try {
    const tokenHash = await dependencies.hashToken(input.joinToken)
    const preview = await dependencies.persistence.preview({ tokenHash })

    if (preview.result === 'active' && preview.theaterName) {
      return ok({
        state: 'active' as const,
        theaterName: preview.theaterName,
      })
    }

    return ok({
      state:
        preview.result === 'active' ? ('invalid' as const) : preview.result,
    })
  } catch (error) {
    return err(toAppError(error))
  }
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
