import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  acceptReusableJoinLink,
  createReusableJoinLink,
  revokeReusableJoinLink,
  rotateReusableJoinLink,
} from './commands'

import type {
  JoinLinkCommandDependencies,
  JoinLinkPersistence,
} from './commands'

describe('Reusable Join Link commands', () => {
  it('returns the shareable token once and persists only its hash and limits', async () => {
    const createdLinks: Parameters<JoinLinkPersistence['create']>[0][] = []
    const dependencies: JoinLinkCommandDependencies = {
      generateToken: () => 'reusable-join-link-token-1234567890',
      getCurrentUser: async () => ({
        ok: true,
        data: { id: 'owner-1' },
      }),
      hashToken: async (token) =>
        createHash('sha256').update(token).digest('hex'),
      persistence: {
        accept: async () => {
          throw new Error('not used')
        },
        canManage: async () => true,
        create: async (input) => {
          createdLinks.push(input)
          return {
            createdAt: '2026-07-17T16:00:00.000Z',
            expiresAt: '2026-08-01T12:00:00.000Z',
            id: 'link-1',
            maxUses: 25,
            theaterId: input.theaterId,
          }
        },
        revoke: async () => {
          throw new Error('not used')
        },
        rotate: async () => {
          throw new Error('not used')
        },
      },
    }

    const result = await createReusableJoinLink(
      {
        expiresAt: '2026-08-01T12:00:00.000Z',
        maxUses: 25,
        theaterId: '8c2f0b07-7ba4-4c41-963c-b2a369049555',
      },
      dependencies,
    )

    expect(result).toEqual({
      ok: true,
      data: {
        createdAt: '2026-07-17T16:00:00.000Z',
        expiresAt: '2026-08-01T12:00:00.000Z',
        id: 'link-1',
        joinToken: 'reusable-join-link-token-1234567890',
        maxUses: 25,
        theaterId: '8c2f0b07-7ba4-4c41-963c-b2a369049555',
      },
    })
    expect(createdLinks).toEqual([
      {
        actorUserId: 'owner-1',
        expiresAt: '2026-08-01T12:00:00.000Z',
        maxUses: 25,
        theaterId: '8c2f0b07-7ba4-4c41-963c-b2a369049555',
        tokenHash:
          '22b4c7ffe545f061ef53c24e4264987637754e55d8c2f28aca79f63b78614d17',
      },
    ])
    expect(JSON.stringify(createdLinks)).not.toContain(
      'reusable-join-link-token-1234567890',
    )
  })

  it('accepts through the atomic persistence boundary without an elevated role', async () => {
    const acceptedLinks: Parameters<JoinLinkPersistence['accept']>[0][] = []
    const dependencies = createDependencies({
      accept: async (input) => {
        acceptedLinks.push(input)
        return {
          acceptedAt: '2026-07-17T17:00:00.000Z',
          membershipCreated: true,
          result: 'accepted',
          theater: { id: 'theater-1', name: 'Main Stage', slug: 'main-stage' },
        }
      },
    })

    const result = await acceptReusableJoinLink(
      { joinToken: 'reusable-join-link-token-1234567890' },
      dependencies,
    )

    expect(result).toEqual({
      ok: true,
      data: {
        acceptedAt: '2026-07-17T17:00:00.000Z',
        membershipCreated: true,
        theater: { id: 'theater-1', name: 'Main Stage', slug: 'main-stage' },
      },
    })
    expect(acceptedLinks).toEqual([
      {
        actorUserId: 'owner-1',
        tokenHash:
          '22b4c7ffe545f061ef53c24e4264987637754e55d8c2f28aca79f63b78614d17',
      },
    ])
  })

  it.each([
    ['expired', 'This Reusable Join Link has expired.'],
    ['revoked', 'This Reusable Join Link was revoked.'],
    ['exhausted', 'This Reusable Join Link has reached its use limit.'],
  ] as const)(
    'returns a typed %s acceptance result',
    async (reason, message) => {
      const result = await acceptReusableJoinLink(
        { joinToken: 'reusable-join-link-token-1234567890' },
        createDependencies({ accept: async () => ({ result: reason }) }),
      )

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'conflict',
          details: { reason },
          message,
          status: 409,
        },
      })
    },
  )

  it('revokes a managed link', async () => {
    const revokedLinks: Parameters<JoinLinkPersistence['revoke']>[0][] = []
    const result = await revokeReusableJoinLink(
      { joinLinkId: 'link-1' },
      createDependencies({
        revoke: async (input) => {
          revokedLinks.push(input)
          return { revoked: true }
        },
      }),
    )

    expect(result).toEqual({ ok: true, data: { revoked: true } })
    expect(revokedLinks).toEqual([
      { actorUserId: 'owner-1', joinLinkId: 'link-1' },
    ])
  })

  it('rotates a managed link and returns only the new shareable token', async () => {
    const rotatedLinks: Parameters<JoinLinkPersistence['rotate']>[0][] = []
    const result = await rotateReusableJoinLink(
      { joinLinkId: 'link-1' },
      createDependencies({
        rotate: async (input) => {
          rotatedLinks.push(input)
          return {
            createdAt: '2026-07-17T18:00:00.000Z',
            expiresAt: null,
            id: 'link-2',
            maxUses: 10,
            rotatedFromId: 'link-1',
            theaterId: 'theater-1',
          }
        },
      }),
    )

    expect(result).toEqual({
      ok: true,
      data: {
        createdAt: '2026-07-17T18:00:00.000Z',
        expiresAt: null,
        id: 'link-2',
        joinToken: 'reusable-join-link-token-1234567890',
        maxUses: 10,
        rotatedFromId: 'link-1',
        theaterId: 'theater-1',
      },
    })
    expect(rotatedLinks).toEqual([
      {
        actorUserId: 'owner-1',
        joinLinkId: 'link-1',
        tokenHash:
          '22b4c7ffe545f061ef53c24e4264987637754e55d8c2f28aca79f63b78614d17',
      },
    ])
  })
})

function createDependencies(
  persistenceOverrides: Partial<JoinLinkPersistence>,
): JoinLinkCommandDependencies {
  return {
    generateToken: () => 'reusable-join-link-token-1234567890',
    getCurrentUser: async () => ({ ok: true, data: { id: 'owner-1' } }),
    hashToken: async (token) =>
      createHash('sha256').update(token).digest('hex'),
    persistence: {
      accept: async () => {
        throw new Error('not used')
      },
      canManage: async () => true,
      create: async () => {
        throw new Error('not used')
      },
      revoke: async () => {
        throw new Error('not used')
      },
      rotate: async () => {
        throw new Error('not used')
      },
      ...persistenceOverrides,
    },
  }
}
