import { Link } from '@tanstack/react-router'
import type { CalendarContext } from './navigation'

export function CalendarReturnLink({
  theaterSlug,
  context,
}: {
  theaterSlug: string
  context: CalendarContext
}) {
  if (!context.calendarPeriod || !context.calendarView) return null
  return (
    <div className="page-wrap pt-4">
      <Link
        className="text-sm underline"
        to="/app/$theaterSlug/calendar"
        params={{ theaterSlug }}
        search={context}
        hash={
          context.calendarEntry
            ? `calendar-entry-${context.calendarEntry}`
            : undefined
        }
      >
        Back to Calendar
      </Link>
    </div>
  )
}
