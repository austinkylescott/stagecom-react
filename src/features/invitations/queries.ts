import { getCurrentUserFromRequest } from '@/server/auth/session'
import { appError, err, ok, toAppError } from '@/server/errors'
import { inviteTokenSchema } from '@/server/schemas'

import { createSupabaseInvitationPersistence } from './persistence'
import { hashInvitationToken } from './tokens'

import type { AppResult } from '@/server/errors'
import type {
  TargetedInvitationListItem,
  TargetedInvitationPersistence,
  TargetedInvitationPreview,
} from './persistence'

type InvitationPreviewDependencies = {
  hashToken: (token: string) => Promise<string>
  persistence: Pick<TargetedInvitationPersistence, 'previewTargeted'>
}

type InvitationListDependencies = {
  getCurrentUser: () => Promise<AppResult<{ id: string }>>
  persistence: Pick<
    TargetedInvitationPersistence,
    'canManageTargeted' | 'listTargeted'
  >
}

export type TargetedInvitationView =
  | { state: 'pending'; theaterName: string }
  | { state: 'accepted' | 'expired' | 'invalid' | 'revoked' }

export async function getTargetedInvitationPreview(
  input: { inviteToken: string },
  dependencies: InvitationPreviewDependencies = {
    hashToken: hashInvitationToken,
    persistence: createSupabaseInvitationPersistence(),
  },
) {
  if (!inviteTokenSchema.safeParse(input.inviteToken).success) {
    return ok({ state: 'invalid' as const })
  }

  try {
    const tokenHash = await dependencies.hashToken(input.inviteToken)
    const preview = await dependencies.persistence.previewTargeted({
      tokenHash,
    })

    return ok(mapPreview(preview))
  } catch (error) {
    return err(toAppError(error))
  }
}

export async function listTargetedInvitations(
  input: { theaterId: string },
  dependencies: InvitationListDependencies = {
    getCurrentUser: getCurrentUserFromRequest,
    persistence: createSupabaseInvitationPersistence(),
  },
): Promise<AppResult<{ invitations: TargetedInvitationListItem[] }>> {
  const currentUser = await dependencies.getCurrentUser()

  if (!currentUser.ok) {
    return currentUser
  }

  try {
    const canManage = await dependencies.persistence.canManageTargeted({
      theaterId: input.theaterId,
      userId: currentUser.data.id,
    })

    if (!canManage) {
      return err(appError('forbidden', 'Owner or Admin access is required.'))
    }

    const invitations = await dependencies.persistence.listTargeted({
      actorUserId: currentUser.data.id,
      theaterId: input.theaterId,
    })

    return ok({ invitations })
  } catch (error) {
    return err(toAppError(error))
  }
}

function mapPreview(
  preview: TargetedInvitationPreview,
): TargetedInvitationView {
  if (preview.result === 'pending' && preview.theaterName) {
    return { state: 'pending' as const, theaterName: preview.theaterName }
  }

  return {
    state: preview.result === 'pending' ? 'invalid' : preview.result,
  }
}
