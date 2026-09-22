import { describe, expect, it } from 'vitest'
import {
  createEventPortfolioReadModel,
  filterEventPortfolio,
} from './read-model'

const now = '2026-09-22T12:00:00.000Z'
const events = [
  {
    id: 'a',
    slug: 'autumn',
    title: 'Autumn',
    lifecycle: 'approved',
    proposal: 'approved',
    publication: 'published',
    health: 'at_risk',
    dates: ['2026-10-01T19:00:00.000Z'],
    leadership: [{ userId: 'p1', displayName: 'Ava', role: 'producer' }],
  },
  {
    id: 'b',
    slug: 'bravo',
    title: 'Bravo',
    lifecycle: 'in_review',
    proposal: 'pending',
    publication: 'unpublished',
    health: 'healthy',
    dates: [],
    leadership: [{ userId: 'p2', displayName: 'Bea', role: 'director' }],
  },
  {
    id: 'c',
    slug: 'closing',
    title: 'Closing',
    lifecycle: 'completed',
    proposal: 'approved',
    publication: 'published',
    health: 'healthy',
    dates: ['2026-09-01T19:00:00.000Z'],
    leadership: [],
  },
]

describe('Event portfolio', () => {
  it('uses the viewer work queue for the exact next authorized action', () => {
    const model = createEventPortfolioReadModel({
      now,
      theaterSlug: 'stage',
      events,
      actions: [
        {
          eventTitle: 'Autumn',
          label: 'Manage At Risk Event',
          href: '/app/stage/events/autumn#operational-health',
          kind: 'risk',
        },
        {
          eventTitle: 'Autumn',
          label: 'Preview and publish Event',
          href: '/app/stage/events/autumn#public-page',
          kind: 'publication',
        },
        {
          eventTitle: 'Bravo',
          label: 'Review Proposal Revision',
          href: '/app/stage/events/bravo#review',
          kind: 'proposal',
        },
      ],
    })
    expect(model.events[0].nextAction).toEqual({
      label: 'Manage At Risk Event',
      href: '/app/stage/events/autumn#operational-health',
      kind: 'risk',
    })
    expect(model.events[1].nextAction?.kind).toBe('proposal')
    expect(model.events[2].nextAction).toBeNull()
    expect(
      filterEventPortfolio(model.events, { view: 'needs-attention' }).map(
        (event) => event.id,
      ),
    ).toEqual(['a', 'b'])
  })

  it('defines saved views from independent states and dates', () => {
    const model = createEventPortfolioReadModel({
      now,
      theaterSlug: 'stage',
      events,
      actions: [],
    })
    expect(
      filterEventPortfolio(model.events, { view: 'upcoming' }).map(
        (event) => event.id,
      ),
    ).toEqual(['a'])
    expect(
      filterEventPortfolio(model.events, { view: 'draft-review' }).map(
        (event) => event.id,
      ),
    ).toEqual(['b'])
    expect(
      filterEventPortfolio(model.events, { view: 'published' }).map(
        (event) => event.id,
      ),
    ).toEqual(['a', 'c'])
  })

  it('filters and sorts by independent portfolio dimensions', () => {
    const model = createEventPortfolioReadModel({
      now,
      theaterSlug: 'stage',
      events,
      actions: [],
    })
    expect(
      filterEventPortfolio(model.events, {
        leadership: 'p2',
        proposal: 'pending',
        sort: 'title-desc',
      }).map((event) => event.id),
    ).toEqual(['b'])
    expect(
      filterEventPortfolio(model.events, {
        from: '2026-09-22',
        to: '2026-10-02',
        sort: 'date-asc',
      }).map((event) => event.id),
    ).toEqual(['a'])
    expect(
      filterEventPortfolio(model.events, {
        publication: 'published',
        health: 'healthy',
      }).map((event) => event.id),
    ).toEqual(['c'])
  })

  it('does not attach another Event’s work when titles coincide and keeps a personal invitation actionable', () => {
    const model = createEventPortfolioReadModel({
      now,
      theaterSlug: 'stage',
      events: [
        { ...events[0], title: 'Shared title' },
        { ...events[1], title: 'Shared title' },
      ],
      actions: [
        {
          label: 'Respond to Cast invitation',
          href: '/app/stage/events/autumn#cast-team',
          kind: 'cast_invitation',
        },
        {
          eventTitle: 'Shared title',
          label: 'Review Proposal Revision',
          href: '/app/stage/events/bravo#review',
          kind: 'proposal',
        },
      ],
    })
    expect(model.events[0].nextAction?.kind).toBe('cast_invitation')
    expect(model.events[1].nextAction?.kind).toBe('proposal')
  })

  it('filters confirmed dates in the Theater time zone', () => {
    const model = createEventPortfolioReadModel({
      now,
      theaterSlug: 'stage',
      timezone: 'America/New_York',
      events: [{ ...events[0], dates: ['2026-10-02T01:00:00.000Z'] }],
      actions: [],
    })
    expect(
      filterEventPortfolio(model.events, {
        from: '2026-10-01',
        to: '2026-10-01',
      }).map((event) => event.id),
    ).toEqual(['a'])
  })

  it('finds tentative dates while Upcoming remains confirmed-only and prioritizes expiring personal work', () => {
    const model = createEventPortfolioReadModel({
      now,
      theaterSlug: 'stage',
      events: [{ ...events[1], candidateDates: ['2026-10-03T19:00:00.000Z'] }],
      actions: [
        {
          label: 'Review Proposal Revision',
          href: '/app/stage/events/bravo#review',
          kind: 'proposal',
        },
        {
          label: 'Respond to counteroffer',
          href: '/app/stage/events/bravo#counteroffer-1',
          kind: 'counteroffer',
          urgent: true,
        },
      ],
    })
    expect(model.events[0].nextAction?.kind).toBe('counteroffer')
    expect(
      filterEventPortfolio(model.events, {
        from: '2026-10-03',
        to: '2026-10-03',
      }),
    ).toHaveLength(1)
    expect(
      filterEventPortfolio(model.events, { view: 'upcoming' }),
    ).toHaveLength(0)
  })

  it('sorts mixed confirmed and proposed Events by the earliest upcoming date', () => {
    const model = createEventPortfolioReadModel({
      now,
      theaterSlug: 'stage',
      actions: [],
      events: [
        {
          ...events[0],
          dates: ['2026-11-01T19:00:00.000Z'],
          candidateDates: ['2026-10-01T19:00:00.000Z'],
        },
        { ...events[1], dates: ['2026-10-15T19:00:00.000Z'] },
      ],
    })
    expect(
      filterEventPortfolio(model.events, { sort: 'date-asc' }).map(
        (event) => event.id,
      ),
    ).toEqual(['a', 'b'])
  })
})
