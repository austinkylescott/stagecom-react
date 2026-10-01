import { describe, expect, it } from 'vitest'

import { createTheaterCalendarProjection } from './read-model'

const occupancy = [
  {
    endsAt: '2026-09-10T20:00:00.000Z',
    event: { slug: 'private-event', title: 'Private Event' },
    id: 'hold',
    startsAt: '2026-09-10T18:00:00.000Z',
    source: 'hold' as const,
    occurrenceId: 'private-occurrence',
    locationName: 'Private room',
  },
  {
    endsAt: '2026-09-09T20:00:00.000Z',
    id: 'block',
    privateLabel: 'HVAC maintenance',
    startsAt: '2026-09-09T18:00:00.000Z',
    source: 'schedule_block' as const,
  },
  {
    endsAt: '2026-09-11T20:00:00.000Z',
    event: { slug: 'my-event', title: 'My Event' },
    id: 'commitment',
    occurrenceType: 'performance' as const,
    startsAt: '2026-09-11T18:00:00.000Z',
    source: 'commitment' as const,
  },
]

describe('createTheaterCalendarProjection', () => {
  it('redacts every unauthorized source deterministically', () => {
    expect(
      createTheaterCalendarProjection({
        canManage: false,
        involvedEventSlugs: new Set(),
        occupancy,
      }),
    ).toEqual([
      expect.objectContaining({
        detail: 'opaque',
        event: null,
        id: 'block',
        label: 'Primary Venue unavailable',
        occurrenceType: null,
      }),
      expect.objectContaining({
        detail: 'opaque',
        event: null,
        id: 'hold',
        source: null,
        occurrenceId: null,
        locationName: null,
        label: 'Primary Venue unavailable',
      }),
      expect.objectContaining({
        detail: 'opaque',
        event: null,
        id: 'commitment',
        label: 'Primary Venue unavailable',
      }),
    ])
  })

  it('shows Event details only for an involved person and keeps blocks opaque', () => {
    const entries = createTheaterCalendarProjection({
      canManage: false,
      involvedEventSlugs: new Set(['my-event']),
      occupancy,
    })
    expect(entries.find(({ id }) => id === 'commitment')).toMatchObject({
      detail: 'relationship',
      event: { slug: 'my-event', title: 'My Event' },
      label: 'My Event',
    })
    expect(entries.find(({ id }) => id === 'block')).toMatchObject({
      detail: 'opaque',
      event: null,
      label: 'Primary Venue unavailable',
    })
  })

  it('omits unrelated offsite activity rather than inventing venue occupancy', () => {
    const offsite = { ...occupancy[2], source: 'offsite' as const }
    expect(
      createTheaterCalendarProjection({
        canManage: false,
        involvedEventSlugs: new Set(),
        occupancy: [offsite],
      }),
    ).toEqual([])
    expect(
      createTheaterCalendarProjection({
        canManage: false,
        involvedEventSlugs: new Set(['my-event']),
        occupancy: [offsite],
      })[0],
    ).toMatchObject({ source: 'offsite', label: 'My Event' })
  })

  it('limits staff-only disclosure to called confirmed Occurrences', () => {
    const entries = createTheaterCalendarProjection({
      canManage: false,
      involvedEventSlugs: new Set(),
      involvedOccurrenceIds: new Set(['called']),
      occupancy: [
        { ...occupancy[2], occurrenceId: 'called' },
        { ...occupancy[0], occurrenceId: 'called' },
        {
          ...occupancy[2],
          id: 'uncalled',
          occurrenceId: 'uncalled',
          source: 'offsite',
        },
      ],
    })
    expect(entries.find(({ id }) => id === 'commitment')).toMatchObject({
      detail: 'relationship',
      occurrenceId: 'called',
    })
    expect(entries.find(({ id }) => id === 'hold')).toMatchObject({
      detail: 'opaque',
      occurrenceId: null,
    })
    expect(entries.find(({ id }) => id === 'uncalled')).toBeUndefined()
  })

  it('shows operational Event and Schedule Block details to Operators', () => {
    const entries = createTheaterCalendarProjection({
      canManage: true,
      involvedEventSlugs: new Set(),
      occupancy,
    })
    expect(entries.find(({ id }) => id === 'block')).toMatchObject({
      detail: 'operational',
      label: 'HVAC maintenance',
    })
    expect(entries.find(({ id }) => id === 'hold')).toMatchObject({
      detail: 'operational',
      event: { title: 'Private Event' },
      label: 'Private Event',
    })
  })
})
