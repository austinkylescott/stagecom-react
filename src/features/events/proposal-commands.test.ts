import { describe, expect, it } from 'vitest'

import {
  reviewProposalRevision,
  saveEventProposedCast,
  seedDeniedProposalReplacement,
  submitEventProposalRevision,
} from './commands'

import type { ProposalCommandDependencies } from './commands'

function dependencies(
  overrides: Partial<ProposalCommandDependencies['persistence']> = {},
): ProposalCommandDependencies {
  return {
    getCurrentUser: async () => ({ ok: true, data: { id: 'producer-1' } }),
    persistence: {
      authorizeProducerDraft: async () => undefined,
      authorizeReplacement: async () => undefined,
      reviewRevision: async (input) => ({
        action: input.action,
        actorUserId: input.actorUserId,
        commandId: input.commandId,
        createdAt: '2026-07-29T12:05:00Z',
        id: 'decision-1',
        ownerOverride: input.ownerOverride,
        proposalRevisionId: input.proposalRevisionId,
        reason: input.reason,
        revisionVersion: input.expectedVersion,
      }),
      saveProposedCast: async (input) => ({
        castMemberUserIds: input.castMemberUserIds,
        eventId: input.eventId,
      }),
      submitRevision: async (input) => ({
        commandId: input.commandId,
        decisionState: 'pending',
        eventId: input.eventId,
        id: 'revision-1',
        revisionNumber: 1,
        snapshot: {},
        submittedAt: '2026-07-29T12:00:00Z',
        submittedBy: input.actorUserId,
      }),
      seedReplacement: async (input) => ({
        id: 'replacement-1',
        slug: input.slug,
        theaterId: 'theater-1',
        title: input.title,
      }),
      ...overrides,
    },
  }
}

describe('Proposal commands', () => {
  it('authorizes before persisting the Proposed Cast', async () => {
    let elevated = false
    const result = await saveEventProposedCast(
      {
        castMemberUserIds: ['73000000-0000-0000-0000-000000000003'],
        commandId: '73000000-0000-0000-0006-000000000001',
        eventId: '73000000-0000-0000-0000-000000000001',
      },
      dependencies({
        authorizeProducerDraft: async () => {
          throw {
            code: 'forbidden',
            message: 'Eligible Event Producer access is required.',
            status: 403,
          }
        },
        saveProposedCast: async () => {
          elevated = true
          throw new Error('must not run')
        },
      }),
    )

    expect(result).toEqual({
      error: {
        code: 'forbidden',
        message: 'Eligible Event Producer access is required.',
        status: 403,
      },
      ok: false,
    })
    expect(elevated).toBe(false)
  })

  it('preserves typed actionable submission blockers', async () => {
    const blockers = [
      {
        code: 'minimum_viable_cast_unmet',
        message:
          'Occurrence 1 has 1 available called Cast Member; 2 are required.',
      },
    ]
    const result = await submitEventProposalRevision(
      {
        commandId: '73000000-0000-0000-0009-000000000001',
        eventId: '73000000-0000-0000-0000-000000000001',
      },
      dependencies({
        submitRevision: async () => {
          throw {
            code: 'validation_error',
            details: blockers,
            message: 'The Proposal Revision is blocked.',
            status: 400,
          }
        },
      }),
    )

    expect(result).toEqual({
      error: {
        code: 'validation_error',
        details: blockers,
        message: 'The Proposal Revision is blocked.',
        status: 400,
      },
      ok: false,
    })
  })

  it('preserves a typed Reviewer authorization rejection', async () => {
    const result = await reviewProposalRevision(
      {
        action: 'approve',
        commandId: '73000000-0000-0000-0009-000000000010',
        expectedVersion: 1,
        ownerOverride: false,
        proposalRevisionId: '73000000-0000-0000-0009-000000000011',
        reason: null,
      },
      dependencies({
        reviewRevision: async () => {
          throw {
            code: 'forbidden',
            message: 'Current Reviewer authority is required.',
            status: 403,
          }
        },
      }),
    )

    expect(result).toMatchObject({
      error: { code: 'forbidden' },
      ok: false,
    })
  })

  it('preserves the audited Owner override reason', async () => {
    const result = await reviewProposalRevision(
      {
        action: 'approve',
        commandId: '73000000-0000-0000-0009-000000000012',
        expectedVersion: 1,
        ownerOverride: true,
        proposalRevisionId: '73000000-0000-0000-0009-000000000013',
        reason: '  One-person Theater scheduling exception.  ',
      },
      dependencies(),
    )

    expect(result).toMatchObject({
      data: {
        action: 'approve',
        ownerOverride: true,
        reason: 'One-person Theater scheduling exception.',
      },
      ok: true,
    })
  })

  it('authorizes a linked replacement before cloning the denied plan', async () => {
    let elevated = false
    const result = await seedDeniedProposalReplacement(
      {
        commandId: '73000000-0000-0000-0009-000000000014',
        proposalRevisionId: '73000000-0000-0000-0009-000000000015',
        slug: 'replacement-event',
        title: 'Replacement Event',
      },
      dependencies({
        authorizeReplacement: async () => {
          throw {
            code: 'forbidden',
            message: 'Current source Event Producer access is required.',
            status: 403,
          }
        },
        seedReplacement: async () => {
          elevated = true
          throw new Error('must not run')
        },
      }),
    )

    expect(result).toMatchObject({
      error: { code: 'forbidden' },
      ok: false,
    })
    expect(elevated).toBe(false)
  })
})
