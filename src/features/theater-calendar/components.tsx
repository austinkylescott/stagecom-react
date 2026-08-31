import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'

import type { TheaterCalendarEntry } from './read-model'

type CalendarView = 'week' | 'list' | 'month'

export function TheaterCalendar({
  entries,
  theater,
}: {
  entries: TheaterCalendarEntry[]
  theater: { name: string; primaryVenueName: string; slug: string }
}) {
  const [view, setView] = useState<CalendarView>('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const groupedEntries = useMemo(() => groupByDay(entries), [entries])

  return (
    <section className="page-wrap pb-12">
      <div className="island-shell rounded-lg px-4 py-6 sm:px-6">
        <p className="text-sm font-bold">
          {theater.name} · {theater.primaryVenueName}
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold">Theater Calendar</h1>
            <p className="mt-2 text-[var(--sea-ink-soft)]">
              Committed occupancy, active exclusive holds, and Schedule Blocks
              for the Primary Venue.
            </p>
          </div>
          <div
            aria-label="Theater Calendar view"
            className="inline-flex rounded-md border p-1"
            role="group"
          >
            {(['week', 'list', 'month'] as const).map((option) => (
              <button
                aria-pressed={view === option}
                className={`min-h-10 rounded px-3 text-sm font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]/35 ${view === option ? 'bg-[var(--theater-soft)] text-[var(--theater-ink)]' : ''}`}
                key={option}
                onClick={() => setView(option)}
                type="button"
              >
                {option[0].toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {view !== 'list' ? (
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              aria-label="Previous Calendar period"
              className="min-h-10 rounded border px-3 font-bold"
              onClick={() => setAnchor(shiftPeriod(anchor, view, -1))}
              type="button"
            >
              Previous
            </button>
            <p aria-live="polite" className="font-bold">
              {formatPeriod(anchor, view)}
            </p>
            <button
              aria-label="Next Calendar period"
              className="min-h-10 rounded border px-3 font-bold"
              onClick={() => setAnchor(shiftPeriod(anchor, view, 1))}
              type="button"
            >
              Next
            </button>
          </div>
        ) : null}
        {entries.length === 0 ? (
          <p className="mt-6 rounded border border-dashed p-5">
            No Primary Venue occupancy is scheduled.
          </p>
        ) : view === 'list' ? (
          <CalendarList entries={entries} theaterSlug={theater.slug} />
        ) : (
          <CalendarGrid
            anchor={anchor}
            groupedEntries={groupedEntries}
            month={view === 'month'}
            theaterSlug={theater.slug}
          />
        )}
      </div>
    </section>
  )
}

function CalendarList({
  entries,
  theaterSlug,
}: {
  entries: TheaterCalendarEntry[]
  theaterSlug: string
}) {
  return (
    <ol className="mt-6 grid gap-3">
      {entries.map((entry) => (
        <li key={entry.id}>
          <CalendarEntry entry={entry} theaterSlug={theaterSlug} />
        </li>
      ))}
    </ol>
  )
}

function CalendarGrid({
  anchor,
  groupedEntries,
  month,
  theaterSlug,
}: {
  anchor: Date
  groupedEntries: Map<string, TheaterCalendarEntry[]>
  month: boolean
  theaterSlug: string
}) {
  const days = month ? monthDays(anchor) : weekDays(anchor)
  return (
    <div
      className={`mt-6 grid gap-3 ${month ? 'sm:grid-cols-7' : 'md:grid-cols-7'}`}
    >
      {days.map((day) => (
        <section className="min-h-32 rounded border bg-white p-2" key={day}>
          <h2 className="text-sm font-extrabold">{formatDay(day)}</h2>
          <div className="mt-2 grid gap-2">
            {(groupedEntries.get(day) ?? []).map((entry) => (
              <CalendarEntry
                compact
                entry={entry}
                key={entry.id}
                theaterSlug={theaterSlug}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function CalendarEntry({
  compact = false,
  entry,
  theaterSlug,
}: {
  compact?: boolean
  entry: TheaterCalendarEntry
  theaterSlug: string
}) {
  const content = (
    <>
      <span className="font-extrabold">{entry.label}</span>
      <span className="block text-sm">
        {formatTime(entry.startsAt)}–{formatTime(entry.endsAt)}
      </span>
      {entry.occurrenceType ? (
        <span className="block text-xs capitalize text-[var(--sea-ink-soft)]">
          {entry.occurrenceType}
        </span>
      ) : null}
      {entry.detail === 'opaque' ? (
        <span className="sr-only"> Details are unavailable to you.</span>
      ) : null}
    </>
  )
  const className = `block rounded border-l-4 p-2 text-[var(--sea-ink)] ${entry.detail === 'opaque' ? 'border-l-[var(--sea-ink-soft)] bg-[var(--surface-strong)]' : 'border-l-[var(--theater)] bg-[var(--theater-soft)] hover:brightness-95'} ${compact ? 'text-xs' : ''}`
  return entry.event ? (
    <Link
      aria-label={`${entry.label}, ${formatTime(entry.startsAt)} to ${formatTime(entry.endsAt)}`}
      className={className}
      params={{ eventSlug: entry.event.slug, theaterSlug }}
      to="/app/$theaterSlug/events/$eventSlug"
    >
      {content}
    </Link>
  ) : (
    <div
      aria-label={`${entry.label}, ${formatTime(entry.startsAt)} to ${formatTime(entry.endsAt)}`}
      className={className}
    >
      {content}
    </div>
  )
}

function groupByDay(entries: TheaterCalendarEntry[]) {
  const entriesByDay = new Map<string, TheaterCalendarEntry[]>()
  for (const entry of entries) {
    const day = dateKey(entry.startsAt)
    entriesByDay.set(day, [...(entriesByDay.get(day) ?? []), entry])
  }
  return entriesByDay
}
function weekDays(date: Date) {
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)
  day.setDate(day.getDate() - day.getDay())
  return Array.from({ length: 7 }, (_, offset) =>
    dateKey(
      new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate() + offset,
      ).toISOString(),
    ),
  )
}
function monthDays(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return Array.from({ length: end.getDate() }, (_, offset) =>
    dateKey(
      new Date(start.getFullYear(), start.getMonth(), offset + 1).toISOString(),
    ),
  )
}
function dateKey(value: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(
    new Date(value),
  )
}
function formatDay(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`))
}
function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}
function shiftPeriod(value: Date, view: CalendarView, amount: number) {
  const next = new Date(value)
  next.setDate(next.getDate() + (view === 'week' ? amount * 7 : amount * 30))
  return next
}
function formatPeriod(value: Date, view: CalendarView) {
  return new Intl.DateTimeFormat(
    undefined,
    view === 'month'
      ? { month: 'long', year: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' },
  ).format(value)
}
