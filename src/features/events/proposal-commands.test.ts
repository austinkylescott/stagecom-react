import { describe, expect, it } from 'vitest'

import {
  issueProposalCounteroffer,
  reviewProposalRevision,
  respondToProposalCounteroffer,
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
    now: () => new Date('2026-07-29T12:00:00.000Z'),
    persistence: {
      authorizeProducerDraft: async () => undefined,
      authorizeReplacement: async () => undefined,
      authorizeCounterofferResponse: async () => undefined,
      expireCounteroffers: async () => 0,
      issueCounteroffer: async (input) => ({
        actorUserId: input.actorUserId,
        candidateSlotId: '73000000-0000-0000-0011-000000000001',
        commandId: input.commandId,
        createdAt: input.now,
        id: '73000000-0000-0000-0011-000000000002',
        occurrenceId: input.occurrenceId,
        proposalRevisionId: input.proposalRevisionId,
        responseDeadline: input.responseDeadline ?? '2026-08-01T12:00:00.000Z',
        state: 'pending',
      }),
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
      respondToCounteroffer: async (input) => ({
        counterofferId: input.counterofferId,
        proposalRevision:
          input.response === 'accept'
            ? {
                commandId: input.commandId,
                decisionState: 'pending',
                eventId: '73000000-0000-0000-0000-000000000001',
                id: '73000000-0000-0000-0011-000000000003',
                revisionNumber: 2,
                snapshot: {},
                submittedAt: input.now,
                submittedBy: input.actorUserId,
              }
            : null,
        response: input.response,
        respondedAt: input.now,
      }),
      ...overrides,
    },
  }
}

describe('Proposal commands', () => {
  it('uses the server clock when a Reviewer issues a Counteroffer', async () => {
    const now = new Date('2026-07-29T12:00:00.000Z')
    const result = await issueProposalCounteroffer(
      {
        commandId: '73000000-0000-0000-0011-000000000010',
        durationMinutes: 90,
        expectedVersion: 1,
        localStartsAt: '2026-10-12T19:30',
        locationKind: 'primary_venue',
        locationName: 'Proposal Stage',
        occurrenceId: '73000000-0000-0000-0001-000000000001',
        proposalRevisionId: '73000000-0000-0000-0009-000000000011',
        timezoneName: 'America/New_York',
      },
      { ...dependencies(), now: () => now },
    )

    expect(result).toMatchObject({
      data: {
        createdAt: '2026-07-29T12:00:00.000Z',
        responseDeadline: '2026-08-01T12:00:00.000Z',
      },
      ok: true,
    })
  })

  it('preserves a typed Primary Venue hold conflict', async () => {
    const result = await issueProposalCounteroffer(
      {
        commandId: '73000000-0000-0000-0011-000000000011',
        durationMinutes: 90,
        expectedVersion: 1,
        localStartsAt: '2026-10-12T19:30',
        locationKind: 'primary_venue',
        locationName: 'Proposal Stage',
        occurrenceId: '73000000-0000-0000-0001-000000000001',
        proposalRevisionId: '73000000-0000-0000-0009-000000000011',
        timezoneName: 'America/New_York',
      },
      dependencies({
        issueCounteroffer: async () => {
          throw {
            code: 'conflict',
            message:
              'The Primary Venue is already reserved during this buffered time.',
            status: 409,
          }
        },
      }),
    )

    expect(result).toMatchObject({ error: { code: 'conflict' }, ok: false })
  })

  it('authorizes a Producer before accepting a Counteroffer', async () => {
    let elevated = false
    const result = await respondToProposalCounteroffer(
      {
        commandId: '73000000-0000-0000-0011-000000000012',
        counterofferId: '73000000-0000-0000-0011-000000000002',
        response: 'accept',
      },
      {
        ...dependencies({
          authorizeCounterofferResponse: async () => {
            throw {
              code: 'forbidden',
              message: 'Current Event Producer access is required.',
              status: 403,
            }
          },
          respondToCounteroffer: async () => {
            elevated = true
            throw new Error('must not run')
          },
        }),
        now: () => new Date('2026-07-29T12:00:00.000Z'),
      },
    )

    expect(result).toMatchObject({ error: { code: 'forbidden' }, ok: false })
    expect(elevated).toBe(false)
  })

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
