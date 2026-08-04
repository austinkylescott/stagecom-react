import { describe, expect, it } from 'vitest'

import { deactivateTheaterMembership } from './commands'

import type { MembershipCommandDependencies } from './commands'

describe('Theater membership commands', () => {
  it('rejects service-role deactivation work until app authorization succeeds', async () => {
    let deactivated = false
    const dependencies: MembershipCommandDependencies = {
      getCurrentUser: async () => ({ ok: true, data: { id: 'member-1' } }),
      persistence: {
        authorizeManagement: async () => false,
        deactivateMembership: async () => {
          deactivated = true
          throw new Error('must not run')
        },
      },
    }

    const result = await deactivateTheaterMembership(
      {
        commandId: '10000000-0000-0000-0000-000000000001',
        expectedMembershipVersion: 1,
        memberUserId: '20000000-0000-0000-0000-000000000002',
        theaterId: '30000000-0000-0000-0000-000000000003',
      },
      dependencies,
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'forbidden',
        message: 'Active Owner or Admin access is required.',
        status: 403,
      },
    })
    expect(deactivated).toBe(false)
  })

  it('deactivates through the authorized transactional boundary', async () => {
    const calls: unknown[] = []
    const dependencies: MembershipCommandDependencies = {
      getCurrentUser: async () => ({ ok: true, data: { id: 'owner-1' } }),
      persistence: {
        authorizeManagement: async () => true,
        deactivateMembership: async (input) => {
          calls.push(input)
          return {
            affectedEventIds: ['event-1'],
            atRiskEventIds: ['event-1'],
            capabilitiesEnded: 2,
            castAssignmentsEnded: 1,
            leadershipAssignmentsEnded: 1,
            memberUserId: input.memberUserId,
            membershipStatus: 'inactive',
            membershipVersion: 2,
            theaterId: input.theaterId,
          }
        },
      },
    }

    const result = await deactivateTheaterMembership(
      {
        commandId: '10000000-0000-0000-0000-000000000001',
        expectedMembershipVersion: 1,
        memberUserId: '20000000-0000-0000-0000-000000000002',
        theaterId: '30000000-0000-0000-0000-000000000003',
      },
      dependencies,
    )

    expect(result).toEqual({
      ok: true,
      data: {
        affectedEventIds: ['event-1'],
        atRiskEventIds: ['event-1'],
        capabilitiesEnded: 2,
        castAssignmentsEnded: 1,
        leadershipAssignmentsEnded: 1,
        memberUserId: '20000000-0000-0000-0000-000000000002',
        membershipStatus: 'inactive',
        membershipVersion: 2,
        theaterId: '30000000-0000-0000-0000-000000000003',
      },
    })
    expect(calls).toEqual([
      {
        actorUserId: 'owner-1',
        commandId: '10000000-0000-0000-0000-000000000001',
        expectedMembershipVersion: 1,
        memberUserId: '20000000-0000-0000-0000-000000000002',
        theaterId: '30000000-0000-0000-0000-000000000003',
      },
    ])
  })
})
