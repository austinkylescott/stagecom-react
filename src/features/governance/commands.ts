import { getCurrentUserFromRequest } from '@/server/auth/session'
import { appError, err, ok, toAppError } from '@/server/errors'

import { createSupabaseGovernancePersistence } from './persistence'

import type { z } from 'zod'
import type { AppResult } from '@/server/errors'
import type { GovernancePersistence } from './persistence'
import type {
  setTheaterMemberCapabilityInputSchema,
  updateTheaterGovernanceInputSchema,
} from './schemas'

export type GovernanceCommandDependencies = {
  getCurrentUser: () => Promise<AppResult<{ id: string }>>
  persistence: GovernancePersistence
}

function getDefaultDependencies(): GovernanceCommandDependencies {
  return {
    getCurrentUser: getCurrentUserFromRequest,
    persistence: createSupabaseGovernancePersistence(),
  }
}

export async function updateTheaterGovernance(
  input: z.infer<typeof updateTheaterGovernanceInputSchema>,
  dependencies: GovernanceCommandDependencies = getDefaultDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()

  if (!currentUser.ok) {
    return currentUser
  }

  try {
    const governance = await dependencies.persistence.updateGovernance({
      actorUserId: currentUser.data.id,
      counterofferResponseHours: input.counterofferResponseHours,
      ownerSelfApprovalEnabled: input.ownerSelfApprovalEnabled,
      primaryVenueName: input.primaryVenueName.trim(),
      producerEligibility: input.producerEligibility,
      setupBufferMinutes: input.setupBufferMinutes,
      theaterId: input.theaterId,
      turnoverBufferMinutes: input.turnoverBufferMinutes,
    })

    return ok(governance)
  } catch (error) {
    const failure = toAppError(error)

    if (failure.code !== 'internal_error') {
      return err(failure)
    }

    return err(
      appError(
        'external_service_error',
        'Theater governance could not be saved.',
      ),
    )
  }
}

export async function setTheaterMemberCapability(
  input: z.infer<typeof setTheaterMemberCapabilityInputSchema>,
  dependencies: GovernanceCommandDependencies = getDefaultDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()

  if (!currentUser.ok) {
    return currentUser
  }

  try {
    return ok(
      await dependencies.persistence.setMemberCapability({
        actorUserId: currentUser.data.id,
        capability: input.capability,
        enabled: input.enabled,
        theaterId: input.theaterId,
        userId: input.userId,
      }),
    )
  } catch (error) {
    const failure = toAppError(error)

    if (failure.code !== 'internal_error') {
      return err(failure)
    }

    return err(
      appError(
        'external_service_error',
        'Theater capability could not be saved.',
      ),
    )
  }
}
