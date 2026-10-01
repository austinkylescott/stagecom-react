import { expect, it } from 'vitest'
import { createTheaterCalendarProjection } from '@/features/theater-calendar/read-model'
import { createTheaterOperationsReadModel } from './read-model'

it('keeps the Operations venue summary distinct from authorized offsite programming', () => {
  const calendar = createTheaterCalendarProjection({
    canManage: true,
    involvedEventSlugs: new Set(),
    occupancy: [
      {
        id: 'offsite',
        source: 'offsite',
        event: { title: 'Offsite Rehearsal', slug: 'rehearsal' },
        startsAt: '2026-10-02T18:00:00Z',
        endsAt: '2026-10-02T19:00:00Z',
      },
      {
        id: 'block',
        source: 'schedule_block',
        privateLabel: 'Maintenance',
        startsAt: '2026-10-03T18:00:00Z',
        endsAt: '2026-10-03T19:00:00Z',
      },
    ],
  })
  const operations = createTheaterOperationsReadModel({
    now: '2026-10-01T12:00:00Z',
    calendar,
    events: [],
    activity: [],
    work: { items: [], exceptions: [] },
  })
  expect(calendar).toHaveLength(2)
  expect(operations.calendar.total).toBe(1)
  expect(operations.calendar.entries.map((entry) => entry.label)).toEqual([
    'Maintenance',
  ])
})
