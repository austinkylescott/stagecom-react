import { describe, expect, it } from 'vitest'

import { createPersonalCalendarProjection } from './read-model'

describe('personal Calendar read model', () => {
  it('keeps only future entries involving the person and labels each with Theater, Event, and relationship', () => {
    const entries = createPersonalCalendarProjection({
      now: new Date('2026-09-01T12:00:00Z'),
      entries: [
        entry({
          endsAt: '2026-08-30T21:00:00Z',
          id: 'past',
          startsAt: '2026-08-30T18:00:00Z',
        }),
        entry({ id: 'producer', relationship: 'Producer' }),
        entry({
          id: 'required-call',
          relationship: 'Cast Member · Required Call',
          startsAt: '2026-09-02T18:00:00Z',
        }),
      ],
    })

    expect(entries).toEqual([
      expect.objectContaining({
        id: 'required-call',
        relationship: 'Cast Member · Required Call',
        theater: expect.objectContaining({ title: 'North Star Theater' }),
      }),
      expect.objectContaining({ id: 'producer', relationship: 'Producer' }),
    ])
  })

  it('keeps distinct relationships for the same Event instead of collapsing them', () => {
    const entries = createPersonalCalendarProjection({
      entries: [
        entry({ id: 'cast', relationship: 'Cast Member' }),
        entry({ id: 'staff', relationship: 'Event staff' }),
      ],
    })

    expect(entries.map((entry) => entry.relationship)).toEqual([
      'Cast Member',
      'Event staff',
    ])
  })
})

function entry(
  overrides: Partial<
    Parameters<typeof createPersonalCalendarProjection>[0]['entries'][number]
  >,
) {
  return {
    action: 'Open Event',
    endsAt: '2026-09-04T21:00:00Z',
    event: { slug: 'moonlit-stage', title: 'The Moonlit Stage' },
    id: 'default',
    relationship: 'Cast Member',
    startsAt: '2026-09-04T19:00:00Z',
    targetAnchor: '',
    theater: { slug: 'north-star', title: 'North Star Theater' },
    ...overrides,
  }
}
