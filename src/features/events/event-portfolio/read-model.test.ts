import { describe, expect, it } from 'vitest'
import { filterEventPortfolio } from './read-model'
import type { PortfolioEvent } from './read-model'

const events: PortfolioEvent[] = [
  {
    id: 'a',
    slug: 'autumn',
    title: 'Autumn',
    lifecycle: 'approved',
    proposal: 'approved',
    publication: 'published',
    health: 'at_risk',
    dates: ['2026-10-01T19:00:00.000Z'],
    candidateDates: [],
    leadership: [{ userId: 'p1', displayName: 'Ava', role: 'producer' }],
    overviewHref: '/app/stage/events/autumn#overview',
    nextDate: '2026-10-01T19:00:00.000Z',
    nextProposedDate: null,
    nextAction: {
      label: 'Manage At Risk Event',
      href: '/app/stage/events/autumn#operational-health',
      kind: 'risk',
    },
    upcoming: true,
  },
  {
    id: 'b',
    slug: 'bravo',
    title: 'Bravo',
    lifecycle: 'in_review',
    proposal: 'pending',
    publication: 'unpublished',
    health: 'on_track',
    dates: [],
    candidateDates: ['2026-10-03T19:00:00.000Z'],
    leadership: [{ userId: 'p2', displayName: 'Bea', role: 'director' }],
    overviewHref: '/app/stage/events/bravo#overview',
    nextDate: null,
    nextProposedDate: '2026-10-03T19:00:00.000Z',
    nextAction: {
      label: 'Review Proposal Revision',
      href: '/app/stage/events/bravo#review',
      kind: 'proposal',
    },
    upcoming: false,
  },
  {
    id: 'c',
    slug: 'closing',
    title: 'Closing',
    lifecycle: 'completed',
    proposal: 'approved',
    publication: 'published',
    health: 'on_track',
    dates: ['2026-09-01T19:00:00.000Z'],
    candidateDates: [],
    leadership: [],
    overviewHref: '/app/stage/events/closing#overview',
    nextDate: null,
    nextProposedDate: null,
    nextAction: null,
    upcoming: false,
  },
]

describe('Event Portfolio browser filters', () => {
  it('combines saved views with independent Event states', () => {
    expect(
      filterEventPortfolio(events, { view: 'needs-attention' }).map(
        (event) => event.id,
      ),
    ).toEqual(['a', 'b'])
    expect(
      filterEventPortfolio(events, { view: 'upcoming' }).map(
        (event) => event.id,
      ),
    ).toEqual(['a'])
    expect(
      filterEventPortfolio(events, { view: 'draft-review' }).map(
        (event) => event.id,
      ),
    ).toEqual(['b'])
    expect(
      filterEventPortfolio(events, { view: 'published' }).map(
        (event) => event.id,
      ),
    ).toEqual(['a', 'c'])
  })

  it('filters and sorts by independent dimensions', () => {
    expect(
      filterEventPortfolio(events, {
        leadership: 'p2',
        proposal: 'pending',
        sort: 'title-desc',
      }).map((event) => event.id),
    ).toEqual(['b'])
    expect(
      filterEventPortfolio(events, {
        publication: 'published',
        health: 'on_track',
      }).map((event) => event.id),
    ).toEqual(['c'])
  })

  it('filters confirmed and proposed dates in the Theater timezone', () => {
    expect(
      filterEventPortfolio(events, {
        from: '2026-10-03',
        to: '2026-10-03',
      }).map((event) => event.id),
    ).toEqual(['b'])
    expect(
      filterEventPortfolio(events, { view: 'upcoming', from: '2026-10-03' }),
    ).toEqual([])
    const lateUtc = [{ ...events[0], dates: ['2026-10-02T01:00:00.000Z'] }]
    expect(
      filterEventPortfolio(
        lateUtc,
        { from: '2026-10-01', to: '2026-10-01' },
        'America/New_York',
      ).map((event) => event.id),
    ).toEqual(['a'])
  })

  it('sorts mixed confirmed and proposed Events by the earliest upcoming date', () => {
    const mixed = [
      {
        ...events[0],
        nextDate: '2026-11-01T19:00:00.000Z',
        nextProposedDate: '2026-10-01T19:00:00.000Z',
      },
      { ...events[1], nextDate: '2026-10-15T19:00:00.000Z' },
    ]
    expect(
      filterEventPortfolio(mixed, { sort: 'date-asc' }).map(
        (event) => event.id,
      ),
    ).toEqual(['a', 'b'])
  })
})
