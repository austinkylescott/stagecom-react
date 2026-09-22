import type { Database } from '@/server/db/database.types'
import type { TheaterCalendarEntry } from '@/features/theater-calendar/read-model'
import type { OperationalException } from '@/features/operational-exceptions/read-model'
import type { WorkQueueItem } from '@/features/work-queue/read-model'

export type TheaterOperationsInput = {
  now: string
  work: { items: WorkQueueItem[]; exceptions: OperationalException[] }
  calendar: TheaterCalendarEntry[]
  events: Array<{
    lifecycle: Database['public']['Enums']['show_lifecycle_status']
    publication: Database['public']['Enums']['show_publication_status']
    health: Database['public']['Enums']['show_operational_health']
    confirmedSlots: Array<{ startsAt: string; endsAt: string }>
  }>
  activity: Array<{
    id: string
    action: string
    actor: string
    createdAt: string
    eventTitle: string | null
    href: string | null
  }>
}

export type TheaterOperationsReadModel = ReturnType<
  typeof createTheaterOperationsReadModel
>

export function createTheaterOperationsReadModel(
  input: TheaterOperationsInput,
) {
  const now = Date.parse(input.now)
  const horizon = now + 7 * 24 * 60 * 60_000
  const calendar = input.calendar
    .filter(
      (entry) =>
        Date.parse(entry.endsAt) > now && Date.parse(entry.startsAt) < horizon,
    )
    .sort(
      (a, b) =>
        a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id),
    )
  // The queue already owns priority and eligibility. Sovereignty remains in
  // Event Review, separate from this ordinary Owner/Admin workspace.
  const queue = input.work.items.filter((item) => item.relationship !== 'Owner')
  const active = input.events.filter(
    (event) => !['completed', 'cancelled'].includes(event.lifecycle),
  )
  const urgent = input.work.exceptions.filter(
    (item) => item.urgency === 'urgent',
  )
  const watch = input.work.exceptions.filter(
    (item) => item.urgency !== 'urgent',
  )

  return {
    queue,
    urgent,
    watch,
    calendar: {
      entries: calendar.slice(0, 5),
      total: calendar.length,
      startsAt: input.now,
      endsAt: new Date(horizon).toISOString(),
    },
    pipeline: {
      total: input.events.length,
      stages: [
        {
          label: 'Draft',
          count: input.events.filter((event) => event.lifecycle === 'draft')
            .length,
        },
        {
          label: 'In review',
          count: input.events.filter((event) => event.lifecycle === 'in_review')
            .length,
        },
        {
          label: 'Approved',
          count: input.events.filter((event) => event.lifecycle === 'approved')
            .length,
        },
        {
          label: 'Completed',
          count: input.events.filter((event) => event.lifecycle === 'completed')
            .length,
        },
        {
          label: 'Cancelled',
          count: input.events.filter((event) => event.lifecycle === 'cancelled')
            .length,
        },
      ],
      context: [
        {
          label: 'Upcoming or underway',
          count: active.filter((event) =>
            event.confirmedSlots.some((slot) => Date.parse(slot.endsAt) > now),
          ).length,
        },
        {
          label: 'Published',
          count: active.filter((event) => event.publication === 'published')
            .length,
        },
        {
          label: 'At Risk',
          count: active.filter((event) => event.health === 'at_risk').length,
        },
      ],
    },
    activity: [...input.activity]
      .sort(
        (a, b) =>
          b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
      )
      .slice(0, 6),
  }
}
