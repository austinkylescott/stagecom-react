import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  acceptTargetedInvitation,
  createTargetedInvitation,
  revokeTargetedInvitation,
} from './commands'

import type {
  InvitationCommandDependencies,
  InvitationPersistence,
} from './commands'

describe('Targeted Invitation commands', () => {
  it('returns the shareable token once and persists only its hash', async () => {
    const createdInvitations: Parameters<
      InvitationPersistence['createTargeted']
    >[0][] = []
    const dependencies: InvitationCommandDependencies = {
      getCurrentUser: async () => ({
        ok: true,
        data: { id: 'owner-1', email: 'owner@example.com' },
      }),
      generateToken: () => 'targeted-invitation-token-1234567890',
      hashToken: async (token) =>
        createHash('sha256').update(token).digest('hex'),
      persistence: {
        acceptTargeted: async () => {
          throw new Error('not used')
        },
        canManageTargeted: async () => true,
        createTargeted: async (input) => {
          createdInvitations.push(input)
          return {
            expiresAt: '2026-08-01T12:00:00.000Z',
            id: 'invite-1',
            theaterId: input.theaterId,
          }
        },
        revokeTargeted: async () => {
          throw new Error('not used')
        },
      },
    }

    const result = await createTargetedInvitation(
      {
        email: '  MEMBER@Example.com ',
        theaterId: '8c2f0b07-7ba4-4c41-963c-b2a369049555',
      },
      dependencies,
    )

    expect(result).toEqual({
      ok: true,
      data: {
        expiresAt: '2026-08-01T12:00:00.000Z',
        id: 'invite-1',
        inviteToken: 'targeted-invitation-token-1234567890',
        theaterId: '8c2f0b07-7ba4-4c41-963c-b2a369049555',
      },
    })
    expect(createdInvitations).toEqual([
      {
        actorUserId: 'owner-1',
        email: 'member@example.com',
        theaterId: '8c2f0b07-7ba4-4c41-963c-b2a369049555',
        tokenHash:
          '5af80cc813cd9e298b7226aa26539bedfe58534134c7add43ac7cfb2bcfca870',
      },
    ])
  })

  it('accepts through the atomic persistence boundary and preserves retry idempotency', async () => {
    const acceptedInvitations: Parameters<
      InvitationPersistence['acceptTargeted']
    >[0][] = []
    const dependencies: InvitationCommandDependencies = {
      getCurrentUser: async () => ({
        ok: true,
        data: { id: 'member-1', email: 'member@example.com' },
      }),
      generateToken: () => 'unused',
      hashToken: async (token) =>
        createHash('sha256').update(token).digest('hex'),
      persistence: {
        acceptTargeted: async (input) => {
          acceptedInvitations.push(input)
          return {
            acceptedAt: '2026-07-17T13:00:00.000Z',
            membershipCreated: acceptedInvitations.length === 1,
            result: 'accepted',
            theater: {
              id: 'theater-1',
              name: 'Main Stage',
              slug: 'main-stage',
            },
          }
        },
        canManageTargeted: async () => true,
        createTargeted: async () => {
          throw new Error('not used')
        },
        revokeTargeted: async () => {
          throw new Error('not used')
        },
      },
    }

    const first = await acceptTargetedInvitation(
      { inviteToken: 'targeted-invitation-token-1234567890' },
      dependencies,
    )
    const retry = await acceptTargetedInvitation(
      { inviteToken: 'targeted-invitation-token-1234567890' },
      dependencies,
    )

    expect(first).toEqual({
      ok: true,
      data: {
        acceptedAt: '2026-07-17T13:00:00.000Z',
        membershipCreated: true,
        theater: {
          id: 'theater-1',
          name: 'Main Stage',
          slug: 'main-stage',
        },
      },
    })
    expect(retry).toEqual({
      ok: true,
      data: {
        acceptedAt: '2026-07-17T13:00:00.000Z',
        membershipCreated: false,
        theater: {
          id: 'theater-1',
          name: 'Main Stage',
          slug: 'main-stage',
        },
      },
    })
    expect(acceptedInvitations).toEqual([
      {
        actorEmail: 'member@example.com',
        actorUserId: 'member-1',
        tokenHash:
          '5af80cc813cd9e298b7226aa26539bedfe58534134c7add43ac7cfb2bcfca870',
      },
      {
        actorEmail: 'member@example.com',
        actorUserId: 'member-1',
        tokenHash:
          '5af80cc813cd9e298b7226aa26539bedfe58534134c7add43ac7cfb2bcfca870',
      },
    ])
  })

  it('returns a typed result for an expired invitation', async () => {
    const dependencies: InvitationCommandDependencies = {
      getCurrentUser: async () => ({
        ok: true,
        data: { id: 'member-1', email: 'member@example.com' },
      }),
      generateToken: () => 'unused',
      hashToken: async () => 'expired-token-hash',
      persistence: {
        acceptTargeted: async () => ({ result: 'expired' }),
        canManageTargeted: async () => true,
        createTargeted: async () => {
          throw new Error('not used')
        },
        revokeTargeted: async () => {
          throw new Error('not used')
        },
      },
    }

    await expect(
      acceptTargetedInvitation(
        { inviteToken: 'expired-invitation-token-1234567890' },
        dependencies,
      ),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: 'conflict',
        details: { reason: 'expired' },
        message: 'This invitation has expired.',
        status: 409,
      },
    })
  })

  it('returns a typed invalid result for a malformed invitation token', async () => {
    const dependencies: InvitationCommandDependencies = {
      getCurrentUser: async () => ({
        ok: true,
        data: { id: 'member-1', email: 'member@example.com' },
      }),
      generateToken: () => 'unused',
      hashToken: async () => {
        throw new Error('malformed tokens must not be hashed')
      },
      persistence: {
        acceptTargeted: async () => {
          throw new Error('malformed tokens must not reach persistence')
        },
        canManageTargeted: async () => true,
        createTargeted: async () => {
          throw new Error('not used')
        },
        revokeTargeted: async () => {
          throw new Error('not used')
        },
      },
    }

    await expect(
      acceptTargetedInvitation({ inviteToken: 'too-short' }, dependencies),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: 'not_found',
        details: { reason: 'invalid' },
        message: 'This invitation is invalid.',
        status: 404,
      },
    })
  })

  it('revokes a pending invitation through the authorized persistence boundary', async () => {
    const authorizationChecks: Parameters<
      InvitationPersistence['canManageTargeted']
    >[0][] = []
    const revokedInvitations: Parameters<
      InvitationPersistence['revokeTargeted']
    >[0][] = []
    const dependencies: InvitationCommandDependencies = {
      getCurrentUser: async () => ({
        ok: true,
        data: { id: 'admin-1', email: 'admin@example.com' },
      }),
      generateToken: () => 'unused',
      hashToken: async () => 'unused',
      persistence: {
        acceptTargeted: async () => {
          throw new Error('not used')
        },
        canManageTargeted: async (input) => {
          authorizationChecks.push(input)
          return true
        },
        createTargeted: async () => {
          throw new Error('not used')
        },
        revokeTargeted: async (input) => {
          revokedInvitations.push(input)
          return { revoked: true }
        },
      },
    }

    await expect(
      revokeTargetedInvitation({ invitationId: 'invite-1' }, dependencies),
    ).resolves.toEqual({ ok: true, data: { revoked: true } })
    expect(authorizationChecks).toEqual([
      { invitationId: 'invite-1', userId: 'admin-1' },
    ])
    expect(revokedInvitations).toEqual([
      { actorUserId: 'admin-1', invitationId: 'invite-1' },
    ])
  })
})
