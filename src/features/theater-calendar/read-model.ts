export type CalendarOccupancySource = 'commitment' | 'hold' | 'schedule_block'
export type CalendarDetail = 'opaque' | 'relationship' | 'operational'

export type CalendarOccupancyInput = {
  endsAt: string
  event?: { slug: string; title: string } | null
  id: string
  occurrenceType?: 'performance' | 'rehearsal' | null
  privateLabel?: string | null
  source: CalendarOccupancySource
  startsAt: string
}

export type TheaterCalendarEntry = {
  detail: CalendarDetail
  endsAt: string
  event: { slug: string; title: string } | null
  id: string
  label: string
  occurrenceType: 'performance' | 'rehearsal' | null
  startsAt: string
}

export function createTheaterCalendarProjection({
  canManage,
  involvedEventSlugs,
  occupancy,
}: {
  canManage: boolean
  involvedEventSlugs: ReadonlySet<string>
  occupancy: readonly CalendarOccupancyInput[]
}): TheaterCalendarEntry[] {
  return occupancy
    .map((entry) => {
      const detail: CalendarDetail = canManage
        ? 'operational'
        : entry.event && involvedEventSlugs.has(entry.event.slug)
          ? 'relationship'
          : 'opaque'
      const label =
        detail === 'opaque'
          ? 'Primary Venue unavailable'
          : entry.source === 'schedule_block'
            ? (entry.privateLabel ?? 'Schedule Block')
            : (entry.event?.title ?? 'Primary Venue reservation')

      return {
        detail,
        endsAt: entry.endsAt,
        event: detail === 'opaque' ? null : (entry.event ?? null),
        id: entry.id,
        label,
        occurrenceType:
          detail === 'opaque' ? null : (entry.occurrenceType ?? null),
        startsAt: entry.startsAt,
      }
    })
    .sort(
      (left, right) =>
        left.startsAt.localeCompare(right.startsAt) ||
        left.id.localeCompare(right.id),
    )
}
