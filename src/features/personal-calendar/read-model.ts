export type PersonalCalendarEntryInput = {
  action: string
  endsAt: string | null
  event: { slug: string; title: string }
  id: string
  relationship: string
  startsAt: string | null
  targetAnchor: string
  theater: { slug: string; title: string }
}

export type PersonalCalendarEntry = PersonalCalendarEntryInput

/**
 * This projection intentionally accepts only person-scoped input. Theater
 * occupancy is never an input here, which prevents opaque reservations from
 * leaking into a person's agenda.
 */
export function createPersonalCalendarProjection({
  entries,
  now = new Date(),
}: {
  entries: readonly PersonalCalendarEntryInput[]
  now?: Date
}): PersonalCalendarEntry[] {
  return entries
    .filter(
      (entry) =>
        entry.endsAt === null || Date.parse(entry.endsAt) >= now.getTime(),
    )
    .sort(
      (left, right) =>
        agendaTime(left.startsAt) - agendaTime(right.startsAt) ||
        left.id.localeCompare(right.id),
    )
}

function agendaTime(value: string | null) {
  return value ? Date.parse(value) : Number.POSITIVE_INFINITY
}
