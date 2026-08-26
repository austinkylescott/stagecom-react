import { describe, expect, it } from 'vitest'

import { createCallsheetReadModel } from './read-model'

describe('Callsheet read model', () => {
  it('keeps an Admin Invitation as a relationship-labeled personal commitment', () => {
    const model = createCallsheetReadModel({
      commitments: [
        {
          action: 'Respond to Admin invitation',
          actionableAt: null,
          event: { slug: '', title: 'Admin authority invitation' },
          id: 'admin-invitation:1',
          responseId: '1',
          kind: 'admin_invitation',
          relationship: 'Theater Member',
          targetAnchor: '',
          theater: { slug: 'northstar', title: 'Northstar Theater' },
        },
      ],
    })

    expect(model.commitments).toMatchObject([
      {
        kind: 'admin_invitation',
        relationship: 'Theater Member',
        theater: { title: 'Northstar Theater' },
      },
    ])
  })

  it('keeps a proposed ownership transfer as a personal commitment without treating it as authority', () => {
    const model = createCallsheetReadModel({
      commitments: [
        {
          action: 'Respond to ownership transfer',
          actionableAt: null,
          event: { slug: '', title: 'Theater ownership transfer' },
          id: 'ownership-transfer:1',
          responseId: '1',
          kind: 'ownership_transfer',
          relationship: 'Proposed successor',
          targetAnchor: '',
          theater: { slug: 'northstar', title: 'Northstar Theater' },
        },
      ],
    })

    expect(model.commitments).toMatchObject([
      {
        kind: 'ownership_transfer',
        relationship: 'Proposed successor',
        theater: { title: 'Northstar Theater' },
      },
    ])
  })

  it('keeps same-Event actions separate and orders overdue work before expiring and upcoming work', () => {
    const model = createCallsheetReadModel({
      commitments: [
        commitment({
          action: 'review-call',
          actionableAt: '2026-08-26T19:00:00Z',
          kind: 'occurrence_call',
          relationship: 'Cast Member',
        }),
        commitment({
          action: 'accept-invitation',
          kind: 'cast_invitation',
          relationship: 'Cast invitee',
        }),
        commitment({
          action: 'respond-counteroffer',
          actionableAt: '2026-08-20T16:00:00Z',
          deadline: '2026-08-20T16:00:00Z',
          kind: 'counteroffer',
          relationship: 'Producer',
        }),
        commitment({
          action: 'respond-availability',
          kind: 'availability_response',
          relationship: 'Cast Member',
        }),
      ],
      now: new Date('2026-08-20T17:00:00Z'),
    })

    expect(model.commitments.map(({ action, kind }) => [action, kind])).toEqual(
      [
        ['respond-counteroffer', 'counteroffer'],
        ['accept-invitation', 'cast_invitation'],
        ['respond-availability', 'availability_response'],
        ['review-call', 'occurrence_call'],
      ],
    )
    expect(model.commitments[0]?.urgencyReason).toBe('Response overdue')
    expect(model.commitments).toHaveLength(4)
  })

  it('marks a near-term counteroffer with its urgency reason', () => {
    const model = createCallsheetReadModel({
      commitments: [
        commitment({
          action: 'respond-counteroffer',
          actionableAt: '2026-08-21T12:00:00Z',
          deadline: '2026-08-21T12:00:00Z',
          kind: 'counteroffer',
          relationship: 'Producer',
        }),
      ],
      now: new Date('2026-08-20T17:00:00Z'),
    })

    expect(model.commitments[0]?.urgencyReason).toBe(
      'Response due within 24 hours',
    )
  })
})

function commitment(
  overrides: Partial<
    Parameters<typeof createCallsheetReadModel>[0]['commitments'][number]
  >,
) {
  return {
    action: 'open-event',
    actionableAt: '2026-08-23T19:00:00Z',
    event: { slug: 'the-moonlit-stage', title: 'The Moonlit Stage' },
    id: crypto.randomUUID(),
    kind: 'proposal_edits' as const,
    relationship: 'Producer',
    targetAnchor: '#proposal-revision-1',
    theater: { slug: 'north-star', title: 'North Star Theater' },
    ...overrides,
  }
}
