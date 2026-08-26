import { describe, expect, it } from 'vitest'

import { setTheaterMemberCapability, updateTheaterGovernance } from './commands'

import type { GovernanceCommandDependencies } from './commands'

describe('Theater governance commands', () => {
  it('rejects service-role governance work until app authorization succeeds', async () => {
    let updated = false
    const dependencies: GovernanceCommandDependencies = {
      getCurrentUser: async () => ({ ok: true, data: { id: 'member-1' } }),
      persistence: {
        authorizeManagement: async () => false,
        authorizeOwner: async () => false,
        getOwnerSelfApprovalEnabled: async () => false,
        setMemberCapability: async () => ({ changed: false }),
        updateGovernance: async () => {
          updated = true
          throw new Error('must not run')
        },
      },
    }

    const result = await updateTheaterGovernance(
      {
        counterofferResponseHours: 72,
        ownerSelfApprovalEnabled: false,
        primaryVenueName: 'Main Stage',
        producerEligibility: 'admins_only',
        setupBufferMinutes: 0,
        theaterId: '10000000-0000-0000-0000-000000000001',
        turnoverBufferMinutes: 0,
      },
      dependencies,
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'forbidden',
        message: 'Owner or Admin access is required.',
        status: 403,
      },
    })
    expect(updated).toBe(false)
  })

  it('persists Event governance through the authorized command boundary', async () => {
    const updates: unknown[] = []
    const dependencies: GovernanceCommandDependencies = {
      getCurrentUser: async () => ({ ok: true, data: { id: 'owner-1' } }),
      persistence: {
        authorizeManagement: async () => true,
        authorizeOwner: async () => true,
        getOwnerSelfApprovalEnabled: async () => false,
        setMemberCapability: async () => ({ changed: false }),
        updateGovernance: async (input) => {
          updates.push(input)
          return {
            counterofferResponseHours: input.counterofferResponseHours,
            ownerSelfApprovalEnabled: input.ownerSelfApprovalEnabled,
            primaryVenueId: 'venue-1',
            primaryVenueName: input.primaryVenueName,
            producerEligibility: input.producerEligibility,
            setupBufferMinutes: input.setupBufferMinutes,
            theaterId: input.theaterId,
            turnoverBufferMinutes: input.turnoverBufferMinutes,
          }
        },
      },
    }

    const result = await updateTheaterGovernance(
      {
        counterofferResponseHours: 96,
        ownerSelfApprovalEnabled: true,
        primaryVenueName: 'Main Stage',
        producerEligibility: 'designated_proposers',
        setupBufferMinutes: 30,
        theaterId: '10000000-0000-0000-0000-000000000001',
        turnoverBufferMinutes: 45,
      },
      dependencies,
    )

    expect(result).toEqual({
      ok: true,
      data: {
        counterofferResponseHours: 96,
        ownerSelfApprovalEnabled: true,
        primaryVenueId: 'venue-1',
        primaryVenueName: 'Main Stage',
        producerEligibility: 'designated_proposers',
        setupBufferMinutes: 30,
        theaterId: '10000000-0000-0000-0000-000000000001',
        turnoverBufferMinutes: 45,
      },
    })
    expect(updates).toEqual([
      {
        actorUserId: 'owner-1',
        counterofferResponseHours: 96,
        ownerSelfApprovalEnabled: true,
        primaryVenueName: 'Main Stage',
        producerEligibility: 'designated_proposers',
        setupBufferMinutes: 30,
        theaterId: '10000000-0000-0000-0000-000000000001',
        turnoverBufferMinutes: 45,
      },
    ])
  })

  it('designates a narrow Reviewer capability without granting Admin authority', async () => {
    const changes: unknown[] = []
    const dependencies: GovernanceCommandDependencies = {
      getCurrentUser: async () => ({ ok: true, data: { id: 'owner-1' } }),
      persistence: {
        authorizeManagement: async () => true,
        authorizeOwner: async () => true,
        getOwnerSelfApprovalEnabled: async () => false,
        setMemberCapability: async (input) => {
          changes.push(input)
          return { changed: true }
        },
        updateGovernance: async () => {
          throw new Error('not used')
        },
      },
    }

    const result = await setTheaterMemberCapability(
      {
        capability: 'reviewer',
        enabled: true,
        theaterId: '10000000-0000-0000-0000-000000000001',
        userId: '20000000-0000-0000-0000-000000000002',
      },
      dependencies,
    )

    expect(result).toEqual({ ok: true, data: { changed: true } })
    expect(changes).toEqual([
      {
        actorUserId: 'owner-1',
        capability: 'reviewer',
        enabled: true,
        theaterId: '10000000-0000-0000-0000-000000000001',
        userId: '20000000-0000-0000-0000-000000000002',
      },
    ])
  })
})
