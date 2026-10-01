export type CalendarOccupancySource =
  'commitment' | 'hold' | 'schedule_block' | 'offsite'
export type CalendarDetail = 'opaque' | 'relationship' | 'operational'

export type CalendarOccupancyInput = {
  endsAt: string
  event?: { slug: string; title: string } | null
  id: string
  occurrenceType?: 'performance' | 'rehearsal' | null
  occurrenceId?: string | null
  scheduleBlockId?: string | null
  locationName?: string | null
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
  source?: CalendarOccupancySource | null
  occurrenceId?: string | null
  scheduleBlockId?: string | null
  locationName?: string | null
}

export function createTheaterCalendarProjection({
  canManage,
  involvedEventSlugs,
  involvedOccurrenceIds = new Set(),
  occupancy,
}: {
  canManage: boolean
  involvedEventSlugs: ReadonlySet<string>
  involvedOccurrenceIds?: ReadonlySet<string>
  occupancy: readonly CalendarOccupancyInput[]
}): TheaterCalendarEntry[] {
  const hasRelationship = (entry: CalendarOccupancyInput) =>
    Boolean(entry.event && involvedEventSlugs.has(entry.event.slug)) ||
    Boolean(
      (entry.source === 'commitment' || entry.source === 'offsite') &&
      entry.occurrenceId &&
      involvedOccurrenceIds.has(entry.occurrenceId),
    )
  return occupancy
    .filter(
      (entry) =>
        entry.source !== 'offsite' || canManage || hasRelationship(entry),
    )
    .map((entry) => {
      const detail: CalendarDetail = canManage
        ? 'operational'
        : hasRelationship(entry)
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
        source: detail === 'opaque' ? null : entry.source,
        occurrenceId: detail === 'opaque' ? null : (entry.occurrenceId ?? null),
        scheduleBlockId:
          detail === 'opaque' ? null : (entry.scheduleBlockId ?? null),
        locationName: detail === 'opaque' ? null : (entry.locationName ?? null),
      }
    })
    .sort(
      (left, right) =>
        left.startsAt.localeCompare(right.startsAt) ||
        left.id.localeCompare(right.id),
    )
}
