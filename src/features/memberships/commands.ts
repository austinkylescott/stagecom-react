import { getCurrentUserFromRequest } from '@/server/auth/session'
import { appError, err, ok, toAppError } from '@/server/errors'

import { createSupabaseMembershipPersistence } from './persistence'

import type { z } from 'zod'
import type { AppResult } from '@/server/errors'
import type { MembershipPersistence } from './persistence'
import type { deactivateTheaterMembershipInputSchema } from './schemas'

export type MembershipCommandDependencies = {
  getCurrentUser: () => Promise<AppResult<{ id: string }>>
  persistence: MembershipPersistence
}

function getDefaultDependencies(): MembershipCommandDependencies {
  return {
    getCurrentUser: getCurrentUserFromRequest,
    persistence: createSupabaseMembershipPersistence(),
  }
}

export async function deactivateTheaterMembership(
  input: z.infer<typeof deactivateTheaterMembershipInputSchema>,
  dependencies: MembershipCommandDependencies = getDefaultDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()

  if (!currentUser.ok) {
    return currentUser
  }

  try {
    const authorized = await dependencies.persistence.authorizeManagement({
      theaterId: input.theaterId,
      userId: currentUser.data.id,
    })

    if (!authorized) {
      return err(
        appError('forbidden', 'Active Owner or Admin access is required.'),
      )
    }

    return ok(
      await dependencies.persistence.deactivateMembership({
        actorUserId: currentUser.data.id,
        commandId: input.commandId,
        expectedMembershipVersion: input.expectedMembershipVersion,
        memberUserId: input.memberUserId,
        theaterId: input.theaterId,
      }),
    )
  } catch (error) {
    const failure = toAppError(error)

    return failure.code === 'internal_error'
      ? err(
          appError(
            'external_service_error',
            'Theater membership could not be deactivated.',
          ),
        )
      : err(failure)
  }
}
