import { z } from 'zod'

const periodSchema = z
  .string()
  .regex(/^[1-9]\d{3}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`)
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    )
  })

export const calendarSearchSchema = z.object({
  calendarView: z
    .enum(['daybook', 'month', 'week'])
    .optional()
    .catch(undefined),
  calendarPeriod: periodSchema.optional().catch(undefined),
  calendarEntry: z.string().max(100).optional().catch(undefined),
})

export type CalendarContext = z.infer<typeof calendarSearchSchema>
export type CalendarView = NonNullable<CalendarContext['calendarView']>

export function calendarDateKey(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value))
  const part = (type: string) =>
    parts.find((entry) => entry.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function calendarDays(period: string, view: CalendarView) {
  const date = new Date(`${period}T12:00:00Z`)
  if (view === 'week') date.setUTCDate(date.getUTCDate() - date.getUTCDay())
  else date.setUTCDate(1)
  const count =
    view === 'week'
      ? 7
      : new Date(
          Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
        ).getUTCDate()
  return Array.from({ length: count }, (_, offset) => {
    const day = new Date(date)
    day.setUTCDate(day.getUTCDate() + offset)
    return day.toISOString().slice(0, 10)
  })
}

export function shiftCalendarPeriod(
  period: string,
  view: CalendarView,
  amount: number,
) {
  const date = new Date(`${period}T12:00:00Z`)
  if (view === 'week') date.setUTCDate(date.getUTCDate() + amount * 7)
  else {
    date.setUTCDate(1)
    date.setUTCMonth(date.getUTCMonth() + amount)
  }
  return date.getUTCFullYear() < 1000 || date.getUTCFullYear() > 9999
    ? period
    : date.toISOString().slice(0, 10)
}

export function calendarEntryOnDay(
  entry: { startsAt: string; endsAt: string },
  day: string,
  timezone: string,
) {
  return (
    calendarDateKey(entry.startsAt, timezone) <= day &&
    calendarDateKey(
      new Date(Date.parse(entry.endsAt) - 1).toISOString(),
      timezone,
    ) >= day
  )
}
