import { getCurrentUserFromRequest } from '@/server/auth/session'
import { appError, err, ok, toAppError } from '@/server/errors'
import { inviteTokenSchema } from '@/server/schemas'

import { createSupabaseInvitationPersistence } from './persistence'
import { generateInvitationToken, hashInvitationToken } from './tokens'

import type { AppResult } from '@/server/errors'

export type InvitationPersistence = {
  acceptTargeted: (input: {
    actorEmail: string
    actorUserId: string
    tokenHash: string
  }) => Promise<
    | {
        acceptedAt: string
        membershipCreated: boolean
        result: 'accepted'
        theater: { id: string; name: string; slug: string }
      }
    | {
        result: 'consumed' | 'expired' | 'invalid' | 'revoked' | 'wrong_email'
      }
  >
  canManageTargeted: (
    input:
      | { invitationId: string; userId: string }
      | { theaterId: string; userId: string },
  ) => Promise<boolean>
  createTargeted: (input: {
    actorUserId: string
    email: string
    expiresAt?: string
    theaterId: string
    tokenHash: string
  }) => Promise<{
    expiresAt: string
    id: string
    theaterId: string
  }>
  revokeTargeted: (input: {
    actorUserId: string
    invitationId: string
  }) => Promise<{ revoked: boolean }>
}

export async function acceptTargetedInvitation(
  input: { inviteToken: string },
  dependencies: InvitationCommandDependencies = getDefaultDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()

  if (!currentUser.ok) {
    return currentUser
  }

  if (!currentUser.data.email) {
    return err(
      appError(
        'forbidden',
        'A verified email address is required to accept this invitation.',
      ),
    )
  }

  if (!inviteTokenSchema.safeParse(input.inviteToken).success) {
    return err(invitationAcceptanceError('invalid'))
  }

  try {
    const tokenHash = await dependencies.hashToken(input.inviteToken)
    const acceptance = await dependencies.persistence.acceptTargeted({
      actorEmail: currentUser.data.email.trim().toLowerCase(),
      actorUserId: currentUser.data.id,
      tokenHash,
    })

    if (acceptance.result !== 'accepted') {
      return err(invitationAcceptanceError(acceptance.result))
    }

    return ok({
      acceptedAt: acceptance.acceptedAt,
      membershipCreated: acceptance.membershipCreated,
      theater: acceptance.theater,
    })
  } catch (error) {
    return err(toAppError(error))
  }
}

function invitationAcceptanceError(
  reason: 'consumed' | 'expired' | 'invalid' | 'revoked' | 'wrong_email',
) {
  const details = { reason }

  switch (reason) {
    case 'wrong_email':
      return appError(
        'forbidden',
        'This invitation was sent to a different email address.',
        details,
      )
    case 'expired':
      return appError('conflict', 'This invitation has expired.', details)
    case 'revoked':
      return appError('conflict', 'This invitation was revoked.', details)
    case 'consumed':
      return appError('conflict', 'This invitation was already used.', details)
    case 'invalid':
      return appError('not_found', 'This invitation is invalid.', details)
  }
}

export type InvitationCommandDependencies = {
  generateToken: () => string
  getCurrentUser: () => Promise<AppResult<{ email?: string; id: string }>>
  hashToken: (token: string) => Promise<string>
  persistence: InvitationPersistence
}

function getDefaultDependencies(): InvitationCommandDependencies {
  return {
    generateToken: generateInvitationToken,
    getCurrentUser: getCurrentUserFromRequest,
    hashToken: hashInvitationToken,
    persistence: createSupabaseInvitationPersistence(),
  }
}

export async function createTargetedInvitation(
  input: { email: string; expiresAt?: string; theaterId: string },
  dependencies: InvitationCommandDependencies = getDefaultDependencies(),
) {
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

    const inviteToken = dependencies.generateToken()
    const tokenHash = await dependencies.hashToken(inviteToken)
    const invitation = await dependencies.persistence.createTargeted({
      actorUserId: currentUser.data.id,
      email: input.email.trim().toLowerCase(),
      ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
      theaterId: input.theaterId,
      tokenHash,
    })

    return ok({ ...invitation, inviteToken })
  } catch (error) {
    return err(toAppError(error))
  }
}

export async function revokeTargetedInvitation(
  input: { invitationId: string },
  dependencies: InvitationCommandDependencies = getDefaultDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()

  if (!currentUser.ok) {
    return currentUser
  }

  try {
    const canManage = await dependencies.persistence.canManageTargeted({
      invitationId: input.invitationId,
      userId: currentUser.data.id,
    })

    if (!canManage) {
      return err(appError('forbidden', 'Owner or Admin access is required.'))
    }

    const result = await dependencies.persistence.revokeTargeted({
      actorUserId: currentUser.data.id,
      invitationId: input.invitationId,
    })

    if (!result.revoked) {
      return err(appError('not_found', 'Pending invitation was not found.'))
    }

    return ok(result)
  } catch (error) {
    return err(toAppError(error))
  }
}
