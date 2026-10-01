import { Card } from '@/components/ui/card'

type Occurrence = {
  id: string
  occurrence_type: 'rehearsal' | 'performance'
  confirmed_candidate_slot_id: string | null
  show_candidate_slots: Array<{
    id: string
    starts_at: string
    duration_minutes: number
    location_name: string
    timezone_name: string
  }>
}

export function EventOccurrences({
  occurrences,
}: {
  occurrences: Occurrence[]
}) {
  const entries = occurrences
    .map((occurrence) => {
      const confirmed = occurrence.show_candidate_slots.find(
        (slot) => slot.id === occurrence.confirmed_candidate_slot_id,
      )
      const proposed = [...occurrence.show_candidate_slots].sort((a, b) =>
        a.starts_at.localeCompare(b.starts_at),
      )[0]
      return {
        occurrence,
        slot: confirmed ?? proposed,
        confirmed: Boolean(confirmed),
      }
    })
    .sort((a, b) => {
      if (!a.slot || !b.slot)
        return a.slot
          ? -1
          : b.slot
            ? 1
            : a.occurrence.id.localeCompare(b.occurrence.id)
      return (
        a.slot.starts_at.localeCompare(b.slot.starts_at) ||
        a.occurrence.id.localeCompare(b.occurrence.id)
      )
    })
  return (
    <Card className="mt-5 p-6" role="region" aria-label="Event Occurrences">
      <h2 className="text-xl font-semibold">Occurrences</h2>
      <p className="text-sm text-muted-foreground">
        Rehearsals and Performances in date order. Proposed times remain
        separate from confirmed commitments.
      </p>
      {entries.length ? (
        <ol className="grid gap-3">
          {entries.map(({ occurrence, slot, confirmed }) => (
            <li
              key={occurrence.id}
              id={`occurrence-${occurrence.id}`}
              className="scroll-mt-6 rounded-md border p-4 target:bg-accent"
            >
              <h3 className="font-medium capitalize">
                <a className="underline" href={`#occurrence-${occurrence.id}`}>
                  {occurrence.occurrence_type}
                </a>
              </h3>
              <p className="mt-1 text-sm">
                {confirmed ? 'Confirmed' : slot ? 'Proposed' : 'Unscheduled'}
              </p>
              {slot ? (
                <>
                  <p className="mt-1 text-sm">
                    <time dateTime={slot.starts_at}>
                      {new Intl.DateTimeFormat('en-US', {
                        timeZone: slot.timezone_name,
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(slot.starts_at))}
                    </time>{' '}
                    · {slot.timezone_name}
                  </p>
                  <p className="mt-1 text-sm">
                    {slot.duration_minutes} minutes · {slot.location_name}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  No time selected.
                </p>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p>No Occurrences planned yet.</p>
      )}
    </Card>
  )
}
