import { describe, expect, it } from 'vitest'

import { saveEventProposedCast, submitEventProposalRevision } from './commands'

import type { ProposalCommandDependencies } from './commands'

function dependencies(
  overrides: Partial<ProposalCommandDependencies['persistence']> = {},
): ProposalCommandDependencies {
  return {
    getCurrentUser: async () => ({ ok: true, data: { id: 'producer-1' } }),
    persistence: {
      authorizeProducerDraft: async () => undefined,
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
})
