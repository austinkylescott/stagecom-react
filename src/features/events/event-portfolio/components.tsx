import { useState } from 'react'
import { filterEventPortfolio } from './read-model'
import type { PortfolioEvent, PortfolioFilters } from './read-model'

type View = NonNullable<PortfolioFilters['view']>
const views: Array<{ id: View; label: string }> = [
  { id: 'all', label: 'All Events' },
  { id: 'needs-attention', label: 'Needs Attention' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'draft-review', label: 'Draft/Review' },
  { id: 'published', label: 'Published' },
]
const sorts: Array<{
  value: NonNullable<PortfolioFilters['sort']>
  label: string
}> = [
  { value: 'date-asc', label: 'Next date · earliest' },
  { value: 'date-desc', label: 'Next date · latest' },
  { value: 'title-asc', label: 'Title · A to Z' },
  { value: 'title-desc', label: 'Title · Z to A' },
  { value: 'leadership-asc', label: 'Leadership' },
  { value: 'lifecycle-asc', label: 'Lifecycle' },
  { value: 'proposal-asc', label: 'Proposal decision' },
  { value: 'publication-asc', label: 'Publication' },
  { value: 'health-asc', label: 'Operational health' },
  { value: 'action-asc', label: 'Next action' },
]
const lifecycleOptions = values([
  'draft',
  'in_review',
  'approved',
  'completed',
  'cancelled',
])
const proposalOptions = values([
  'not submitted',
  'pending',
  'changes_requested',
  'counteroffered',
  'approved',
  'denied',
])
const publicationOptions = values(['unpublished', 'published'])
const healthOptions = values(['on_track', 'at_risk'])

export function EventPortfolioPage({
  portfolio,
  theaterSlug,
  timezone,
  canCreate,
}: {
  portfolio: { events: PortfolioEvent[] }
  theaterSlug: string
  timezone: string
  canCreate: boolean
}) {
  const [filters, setFilters] = useState<PortfolioFilters>({
    view: 'all',
    sort: 'date-asc',
  })
  const events = filterEventPortfolio(portfolio.events, filters, timezone)
  const leaders = [
    ...new Map(
      portfolio.events
        .flatMap((event) => event.leadership)
        .map((leader) => [leader.userId, leader]),
    ).values(),
  ].sort((a, b) => a.displayName.localeCompare(b.displayName))
  const update = (part: Partial<PortfolioFilters>) =>
    setFilters((current) => ({ ...current, ...part }))
  return (
    <main className="page-wrap py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
            Events
          </p>
          <h1 className="display-title mt-3 text-4xl font-bold text-[var(--sea-ink)]">
            Event portfolio
          </h1>
          <p className="mt-2 text-[var(--sea-ink-soft)]">
            Browse dates, independent states, and your available next actions.
          </p>
        </div>
        {canCreate ? (
          <a
            className="rounded-md bg-[var(--sea-ink)] px-4 py-3 font-extrabold text-white no-underline"
            href={`/app/${theaterSlug}/events/new`}
          >
            Create Event
          </a>
        ) : null}
      </div>
      <nav aria-label="Saved Event views" className="mt-7 flex flex-wrap gap-2">
        {views.map((view) => (
          <button
            key={view.id}
            type="button"
            aria-pressed={filters.view === view.id}
            className={`rounded-full border px-4 py-2 text-sm font-bold ${filters.view === view.id ? 'border-[var(--sea-ink)] bg-[var(--sea-ink)] text-white' : 'border-[var(--line)] bg-white text-[var(--sea-ink)]'}`}
            onClick={() => update({ view: view.id })}
          >
            {view.label}
          </button>
        ))}
      </nav>
      <section
        aria-label="Filter and sort Events"
        className="island-shell mt-5 grid gap-3 rounded-lg p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="grid gap-1 text-sm font-bold">
          From date
          <input
            className="w-full rounded border border-[var(--line)] p-2"
            type="date"
            value={filters.from ?? ''}
            onChange={(event) => update({ from: event.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          Through date
          <input
            className="w-full rounded border border-[var(--line)] p-2"
            type="date"
            value={filters.to ?? ''}
            onChange={(event) => update({ to: event.target.value })}
          />
        </label>
        <Select
          label="Leadership"
          value={filters.leadership}
          onChange={(value) => update({ leadership: value })}
          options={leaders.map((leader) => ({
            value: leader.userId,
            label: leader.displayName,
          }))}
        />
        <Select
          label="Lifecycle"
          value={filters.lifecycle}
          onChange={(value) => update({ lifecycle: value })}
          options={lifecycleOptions}
        />
        <Select
          label="Proposal decision"
          value={filters.proposal}
          onChange={(value) => update({ proposal: value })}
          options={proposalOptions}
        />
        <Select
          label="Publication"
          value={filters.publication}
          onChange={(value) => update({ publication: value })}
          options={publicationOptions}
        />
        <Select
          label="Operational health"
          value={filters.health}
          onChange={(value) => update({ health: value })}
          options={healthOptions}
        />
        <Select
          label="Next action"
          value={filters.nextAction}
          onChange={(value) => update({ nextAction: value })}
          options={values(
            portfolio.events.flatMap((event) =>
              event.nextAction ? [event.nextAction.kind] : [],
            ),
          )}
        />
        <label className="grid gap-1 text-sm font-bold">
          Sort by
          <select
            className="w-full rounded border border-[var(--line)] bg-white p-2"
            value={filters.sort}
            onChange={(event) =>
              update({ sort: event.target.value as PortfolioFilters['sort'] })
            }
          >
            {sorts.map((sort) => (
              <option key={sort.value} value={sort.value}>
                {sort.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="self-end rounded border border-[var(--line)] px-3 py-2 text-sm font-bold"
          type="button"
          onClick={() => setFilters({ view: 'all', sort: 'date-asc' })}
        >
          Clear filters
        </button>
      </section>
      <p
        aria-live="polite"
        className="mt-5 text-sm font-semibold text-[var(--sea-ink-soft)]"
      >
        {events.length} of {portfolio.events.length} Events
      </p>
      <div className="mt-3 grid gap-4">
        {events.map((event) => (
          <article className="island-shell rounded-lg p-5" key={event.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold text-[var(--sea-ink)]">
                  <a href={event.overviewHref}>{event.title}</a>
                </h2>
                {event.limited ? (
                  <p className="mt-1 text-sm">
                    Open the Event for dates available to you.
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-sm">
                      {event.nextDate
                        ? `Next confirmed date: ${formatDate(event.nextDate, timezone, true)}`
                        : event.nextProposedDate
                          ? `Next proposed date: ${formatDate(event.nextProposedDate, timezone, true)}`
                          : 'No upcoming confirmed or proposed date'}
                    </p>
                    <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                      {event.dates.length} confirmed ·{' '}
                      {event.candidateDates.length} proposed dates
                    </p>
                  </>
                )}
              </div>
              <a className="font-bold underline" href={event.overviewHref}>
                {event.overviewHref.startsWith('/theater/')
                  ? 'Open public Event'
                  : 'Open Overview'}
              </a>
            </div>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <State label="Lifecycle" value={event.lifecycle} />
              {!event.limited ? (
                <State label="Proposal decision" value={event.proposal} />
              ) : null}
              <State label="Publication" value={event.publication} />
              {!event.limited ? (
                <State label="Operational health" value={event.health} />
              ) : null}
            </dl>
            {!event.limited ? (
              <p className="mt-4 text-sm">
                <span className="font-bold">Leadership:</span>{' '}
                {event.leadership.length
                  ? event.leadership
                      .map((leader) => `${leader.displayName} · ${leader.role}`)
                      .join(', ')
                  : 'Not assigned'}
              </p>
            ) : null}
            <p className="mt-3 text-sm">
              <span className="font-bold">Your next action:</span>{' '}
              {event.nextAction ? (
                <>
                  <a
                    className="ml-1 font-bold underline"
                    href={event.nextAction.href}
                  >
                    {event.nextAction.label}
                  </a>
                  {event.nextAction.relationship
                    ? ` · ${event.nextAction.relationship}`
                    : null}
                </>
              ) : (
                'No action currently available'
              )}
            </p>
          </article>
        ))}
        {!events.length ? (
          <p className="rounded-lg border border-dashed border-[var(--line)] p-6">
            No Events match this view. Change or clear the filters to see more.
          </p>
        ) : null}
      </div>
    </main>
  )
}

function values(items: string[]) {
  return [...new Set(items)]
    .sort()
    .map((value) => ({ value, label: value.replaceAll('_', ' ') }))
}
function formatDate(iso: string, timezone: string, includeTime = false) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    dateStyle: 'medium',
    ...(includeTime ? { timeStyle: 'short' as const } : {}),
  }).format(new Date(iso))
}
function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value?: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1 text-sm font-bold">
      {label}
      <select
        className="w-full rounded border border-[var(--line)] bg-white p-2"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
function State({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[var(--line)] px-3 py-2">
      <dt className="font-bold">{label}</dt>
      <dd className="mt-1 capitalize">{value.replaceAll('_', ' ')}</dd>
    </div>
  )
}
