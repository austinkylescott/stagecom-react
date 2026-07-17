import { getCurrentUserFromRequest } from '@/server/auth/session'
import { appError, err, ok, toAppError } from '@/server/errors'
import { inviteTokenSchema } from '@/server/schemas'

import { createSupabaseJoinLinkPersistence } from './persistence'
import {
  generateInvitationToken,
  hashInvitationToken,
} from '../invitations/tokens'

import type { AppResult } from '@/server/errors'

export type JoinLinkPersistence = {
  accept: (input: { actorUserId: string; tokenHash: string }) => Promise<
    | {
        acceptedAt: string
        membershipCreated: boolean
        result: 'accepted'
        theater: { id: string; name: string; slug: string }
      }
    | { result: 'exhausted' | 'expired' | 'invalid' | 'revoked' }
  >
  canManage: (
    input:
      | { joinLinkId: string; userId: string }
      | { theaterId: string; userId: string },
  ) => Promise<boolean>
  create: (input: {
    actorUserId: string
    expiresAt?: string
    maxUses?: number
    theaterId: string
    tokenHash: string
  }) => Promise<{
    createdAt: string
    expiresAt: string | null
    id: string
    maxUses: number | null
    theaterId: string
  }>
  revoke: (input: {
    actorUserId: string
    joinLinkId: string
  }) => Promise<{ revoked: boolean }>
  rotate: (input: {
    actorUserId: string
    joinLinkId: string
    tokenHash: string
  }) => Promise<{
    createdAt: string
    expiresAt: string | null
    id: string
    maxUses: number | null
    rotatedFromId: string
    theaterId: string
  }>
}

export type JoinLinkCommandDependencies = {
  generateToken: () => string
  getCurrentUser: () => Promise<AppResult<{ id: string }>>
  hashToken: (token: string) => Promise<string>
  persistence: JoinLinkPersistence
}

export async function createReusableJoinLink(
  input: { expiresAt?: string; maxUses?: number; theaterId: string },
  dependencies: JoinLinkCommandDependencies = getDefaultDependencies(),
) {
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

    const joinToken = dependencies.generateToken()
    const tokenHash = await dependencies.hashToken(joinToken)
    const link = await dependencies.persistence.create({
      actorUserId: currentUser.data.id,
      ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
      ...(input.maxUses ? { maxUses: input.maxUses } : {}),
      theaterId: input.theaterId,
      tokenHash,
    })

    return ok({ ...link, joinToken })
  } catch (error) {
    return err(toAppError(error))
  }
}

export async function acceptReusableJoinLink(
  input: { joinToken: string },
  dependencies: JoinLinkCommandDependencies = getDefaultDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()

  if (!currentUser.ok) {
    return currentUser
  }

  if (!inviteTokenSchema.safeParse(input.joinToken).success) {
    return err(joinLinkAcceptanceError('invalid'))
  }

  try {
    const tokenHash = await dependencies.hashToken(input.joinToken)
    const acceptance = await dependencies.persistence.accept({
      actorUserId: currentUser.data.id,
      tokenHash,
    })

    if (acceptance.result !== 'accepted') {
      return err(joinLinkAcceptanceError(acceptance.result))
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

export async function revokeReusableJoinLink(
  input: { joinLinkId: string },
  dependencies: JoinLinkCommandDependencies = getDefaultDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()

  if (!currentUser.ok) {
    return currentUser
  }

  try {
    const canManage = await dependencies.persistence.canManage({
      joinLinkId: input.joinLinkId,
      userId: currentUser.data.id,
    })

    if (!canManage) {
      return err(appError('forbidden', 'Owner or Admin access is required.'))
    }

    const result = await dependencies.persistence.revoke({
      actorUserId: currentUser.data.id,
      joinLinkId: input.joinLinkId,
    })

    if (!result.revoked) {
      return err(appError('not_found', 'Reusable Join Link was not found.'))
    }

    return ok(result)
  } catch (error) {
    return err(toAppError(error))
  }
}

export async function rotateReusableJoinLink(
  input: { joinLinkId: string },
  dependencies: JoinLinkCommandDependencies = getDefaultDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()

  if (!currentUser.ok) {
    return currentUser
  }

  try {
    const canManage = await dependencies.persistence.canManage({
      joinLinkId: input.joinLinkId,
      userId: currentUser.data.id,
    })

    if (!canManage) {
      return err(appError('forbidden', 'Owner or Admin access is required.'))
    }

    const joinToken = dependencies.generateToken()
    const tokenHash = await dependencies.hashToken(joinToken)
    const link = await dependencies.persistence.rotate({
      actorUserId: currentUser.data.id,
      joinLinkId: input.joinLinkId,
      tokenHash,
    })

    return ok({ ...link, joinToken })
  } catch (error) {
    return err(toAppError(error))
  }
}

function joinLinkAcceptanceError(
  reason: 'exhausted' | 'expired' | 'invalid' | 'revoked',
) {
  const details = { reason }

  switch (reason) {
    case 'expired':
      return appError(
        'conflict',
        'This Reusable Join Link has expired.',
        details,
      )
    case 'revoked':
      return appError(
        'conflict',
        'This Reusable Join Link was revoked.',
        details,
      )
    case 'exhausted':
      return appError(
        'conflict',
        'This Reusable Join Link has reached its use limit.',
        details,
      )
    case 'invalid':
      return appError(
        'not_found',
        'This Reusable Join Link is invalid.',
        details,
      )
  }
}

function getDefaultDependencies(): JoinLinkCommandDependencies {
  return {
    generateToken: generateInvitationToken,
    getCurrentUser: getCurrentUserFromRequest,
    hashToken: hashInvitationToken,
    persistence: createSupabaseJoinLinkPersistence(),
  }
}
