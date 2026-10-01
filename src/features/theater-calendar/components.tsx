import { useId, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  calendarDateKey,
  calendarDays,
  shiftCalendarPeriod,
} from './navigation'
import type { CalendarContext } from './navigation'
import type { TheaterCalendarEntry } from './read-model'

export function TheaterCalendar({
  entries,
  theater,
  context,
  onContextChange,
  onOpenEvent,
}: {
  entries: TheaterCalendarEntry[]
  theater: {
    name: string
    primaryVenueName: string
    slug: string
    timezone?: string
  }
  context?: CalendarContext
  onContextChange?: (context: CalendarContext) => void
  onOpenEvent?: (entry: TheaterCalendarEntry, context: CalendarContext) => void
}) {
  const timezone = theater.timezone ?? 'UTC'
  const [localContext, setLocalContext] = useState<CalendarContext>({})
  const current = context ?? localContext
  const view = current.calendarView ?? 'daybook'
  const period =
    current.calendarPeriod ??
    calendarDateKey(new Date().toISOString(), timezone)
  const change = onContextChange ?? setLocalContext
  const days = calendarDays(period, view)
  const entriesByDay = new Map<string, TheaterCalendarEntry[]>(
    days.map((day) => [day, []]),
  )
  const firstDayByEntry = new Map<string, string>()
  for (const entry of entries) {
    const start = calendarDateKey(entry.startsAt, timezone)
    const end = calendarDateKey(
      new Date(Date.parse(entry.endsAt) - 1).toISOString(),
      timezone,
    )
    for (const day of days) {
      if (day < start || day > end) continue
      entriesByDay.get(day)?.push(entry)
      if (!firstDayByEntry.has(entry.id)) firstDayByEntry.set(entry.id, day)
    }
  }
  const periodLabel = new Intl.DateTimeFormat(
    'en-US',
    view === 'week'
      ? { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }
      : { month: 'long', year: 'numeric', timeZone: 'UTC' },
  ).format(new Date(`${days[0]}T12:00:00Z`))
  const update = (next: CalendarContext) =>
    change({ ...current, calendarView: view, calendarPeriod: period, ...next })
  const entryContext = { calendarView: view, calendarPeriod: period }

  return (
    <section className="page-wrap min-w-0 pb-12">
      <Card className="gap-0 px-4 py-6 sm:px-6">
        <p className="text-sm font-medium">
          {theater.name} · {theater.primaryVenueName} · {timezone}
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Theater Calendar</h1>
            <p className="mt-2 text-muted-foreground">
              Confirmed Slots, active holds and Schedule Blocks. Offsite
              Occurrences do not reserve the Primary Venue.
            </p>
          </div>
          <div
            aria-label="Theater Calendar view"
            className="inline-flex flex-wrap rounded-md border p-1"
            role="group"
          >
            {(['daybook', 'month', 'week'] as const).map((option) => (
              <Button
                variant="ghost"
                aria-pressed={view === option}
                key={option}
                onClick={() => update({ calendarView: option })}
                type="button"
              >
                {option[0].toUpperCase() + option.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            aria-label="Previous Calendar period"
            onClick={() =>
              update({
                calendarPeriod: shiftCalendarPeriod(period, view, -1),
                calendarEntry: undefined,
              })
            }
          >
            Previous
          </Button>
          <p aria-live="polite" className="font-medium">
            {periodLabel}
          </p>
          <Button
            variant="outline"
            aria-label="Next Calendar period"
            onClick={() =>
              update({
                calendarPeriod: shiftCalendarPeriod(period, view, 1),
                calendarEntry: undefined,
              })
            }
          >
            Next
          </Button>
          <label className="flex items-center gap-2 text-sm">
            Month and year
            <Input
              className="w-auto"
              type="month"
              min="1000-01"
              max="9999-12"
              aria-label="Calendar month and year"
              value={period.slice(0, 7)}
              onChange={(event) => {
                if (/^\d{4}-\d{2}$/.test(event.target.value))
                  update({
                    calendarPeriod: `${event.target.value}-01`,
                    calendarEntry: undefined,
                  })
              }}
            />
          </label>
        </div>
        {firstDayByEntry.size === 0 ? (
          <p className="mt-6 rounded border border-dashed p-5">
            No Calendar entries in this period.
          </p>
        ) : null}
        <div
          className={`mt-6 grid min-w-0 gap-3 ${view === 'month' ? 'lg:grid-cols-7' : view === 'week' ? 'lg:grid-cols-7' : ''}`}
        >
          {view === 'month' ? (
            <>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <p className="hidden text-sm font-medium lg:block" key={day}>
                  {day}
                </p>
              ))}
              {Array.from(
                { length: new Date(`${days[0]}T12:00:00Z`).getUTCDay() },
                (_, index) => (
                  <div
                    className="hidden lg:block"
                    aria-hidden="true"
                    key={`offset-${index}`}
                  />
                ),
              )}
            </>
          ) : null}
          {(view === 'daybook'
            ? days.filter((day) => entriesByDay.get(day)?.length)
            : days
          ).map((day) => (
            <section
              className={`min-w-0 rounded border ${view === 'daybook' ? 'p-3' : 'p-2'}`}
              key={day}
              aria-label={formatDay(day)}
            >
              <h2 className="text-sm font-semibold">{formatDay(day)}</h2>
              <div className="mt-2 grid gap-2">
                {(entriesByDay.get(day) ?? []).map((entry) => (
                  <CalendarEntry
                    compact={view !== 'daybook'}
                    entry={entry}
                    key={entry.id}
                    theaterSlug={theater.slug}
                    timezone={timezone}
                    context={entryContext}
                    selected={current.calendarEntry === entry.id}
                    anchor={day === firstDayByEntry.get(entry.id)}
                    onOpenEvent={onOpenEvent}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </Card>
    </section>
  )
}

function CalendarEntry({
  entry,
  compact,
  theaterSlug,
  timezone,
  context,
  selected,
  anchor,
  onOpenEvent,
}: {
  entry: TheaterCalendarEntry
  compact: boolean
  theaterSlug: string
  timezone: string
  context: CalendarContext
  selected: boolean
  anchor: boolean
  onOpenEvent?: (entry: TheaterCalendarEntry, context: CalendarContext) => void
}) {
  const detailsId = useId()
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const detailsVisible = expanded || hovered || focused
  const search = { ...context, calendarEntry: entry.id }
  const status =
    entry.detail === 'opaque'
      ? 'Primary Venue occupancy'
      : entry.source === 'hold'
        ? 'Active hold'
        : entry.source === 'schedule_block'
          ? 'Schedule Block'
          : entry.source === 'offsite'
            ? 'Confirmed Slot · Offsite'
            : 'Confirmed Slot'
  const name = `${entry.label}, ${formatTime(entry.startsAt, timezone)} to ${formatTime(entry.endsAt, timezone)}`
  const content = (
    <>
      <span className="font-semibold">{entry.label}</span>
      <span className={`block ${compact ? 'text-xs' : 'text-sm'}`}>
        {formatTime(entry.startsAt, timezone)}–
        {formatTime(entry.endsAt, timezone)}
      </span>
      <span className="block text-xs">{status}</span>
    </>
  )
  return (
    <article
      className={`relative min-w-0 break-words rounded border p-2 ${compact ? 'text-xs' : ''} ${selected ? 'bg-accent ring-2 ring-ring' : ''}`}
      id={anchor ? `calendar-entry-${entry.id}` : undefined}
      aria-current={selected ? true : undefined}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setHovered(true)
      }}
      onPointerLeave={() => setHovered(false)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setExpanded(false)
          setHovered(false)
          setFocused(false)
        }
      }}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false)
      }}
    >
      {entry.event ? (
        <Link
          className="block rounded underline outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={name}
          to="/app/$theaterSlug/events/$eventSlug"
          params={{ theaterSlug, eventSlug: entry.event.slug }}
          search={search}
          onClick={(event) => {
            if (
              onOpenEvent &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.shiftKey &&
              !event.altKey &&
              event.button === 0
            ) {
              event.preventDefault()
              onOpenEvent(entry, search)
            }
          }}
          hash={
            entry.occurrenceId ? `occurrence-${entry.occurrenceId}` : undefined
          }
        >
          {content}
        </Link>
      ) : entry.scheduleBlockId && entry.detail === 'operational' ? (
        <Link
          className="block underline"
          to="/app/$theaterSlug/calendar"
          params={{ theaterSlug }}
          search={search}
          hash={`schedule-block-${entry.scheduleBlockId}`}
        >
          {content}
        </Link>
      ) : (
        <div>{content}</div>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="mt-1 h-auto min-h-9 whitespace-normal px-1 text-xs"
        aria-expanded={detailsVisible}
        aria-controls={detailsId}
        aria-label={`Details for ${entry.label}`}
        onClick={() => {
          setExpanded(!expanded)
          if (expanded) {
            setFocused(false)
            setHovered(false)
          }
        }}
      >
        Details
      </Button>
      {detailsVisible ? (
        <div
          id={detailsId}
          className="absolute inset-x-0 top-full z-20 rounded-md border bg-popover p-3 text-xs text-popover-foreground shadow-md"
        >
          <p className="font-semibold">{entry.label}</p>
          <p>
            {formatDateTime(entry.startsAt, timezone)}–
            {formatDateTime(entry.endsAt, timezone)} · {timezone}
          </p>
          {entry.detail === 'opaque' ? (
            <p>Details are unavailable to you.</p>
          ) : (
            <>
              {entry.occurrenceType ? (
                <p className="capitalize">{entry.occurrenceType}</p>
              ) : null}
              {entry.locationName ? <p>{entry.locationName}</p> : null}
              {entry.source === 'offsite' ? (
                <p>Does not occupy the Primary Venue.</p>
              ) : (
                <p>
                  Reserves the Primary Venue, including setup and turnover
                  buffers.
                </p>
              )}
            </>
          )}
        </div>
      ) : null}
    </article>
  )
}

function formatDay(day: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${day}T12:00:00Z`))
}
function formatTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  }).format(new Date(value))
}
function formatDateTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(new Date(value))
}
