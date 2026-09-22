import { WorkspaceErrorState } from '@/features/application-shell/components'
import { OperationalExceptions } from '@/features/operational-exceptions/components'
import { WorkQueue } from '@/features/work-queue/components'
import { isAppError } from '@/server/errors'
import type { TheaterOperationsReadModel } from './read-model'

const destinationClass =
  'inline-flex min-h-11 items-center font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4'

export function TheaterOperationsCockpit({
  model,
  theater,
}: {
  model: TheaterOperationsReadModel
  theater: {
    slug: string
    timezone: string | null
    primary_venue_name: string | null
  }
}) {
  const base = `/app/${theater.slug}`
  const formatTime = (value: string) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: theater.timezone ?? 'UTC',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value))

  return (
    <>
      <div className="grid items-start gap-x-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0">
          <WorkQueue items={model.queue} previewCount={3} />
        </div>
        <div className="min-w-0">
          <OperationalExceptions
            items={model.urgent.slice(0, 2)}
            title="Urgent Operational Exceptions"
            emptyMessage="No urgent Operational Exceptions right now."
          />
          {model.urgent.length > 2 ? (
            <details className="mt-3">
              <summary className="cursor-pointer py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4">
                Show {model.urgent.length - 2} more urgent exceptions
              </summary>
              <OperationalExceptions
                id="more-urgent-exceptions"
                title="More urgent exceptions"
                items={model.urgent.slice(2)}
              />
            </details>
          ) : null}
          {model.watch.length ? (
            <details className="mt-3">
              <summary className="cursor-pointer py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4">
                Other conditions to monitor ({model.watch.length})
              </summary>
              <OperationalExceptions
                id="watch-exceptions"
                title="Other conditions to monitor"
                items={model.watch}
              />
            </details>
          ) : null}
        </div>
      </div>

      <div className="grid items-start gap-x-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="operations-calendar" className="mt-8 min-w-0">
          <h2 id="operations-calendar" className="text-2xl font-extrabold">
            Upcoming Theater Calendar
          </h2>
          <p className="mt-2 text-[var(--sea-ink-soft)]">
            Next 7 days · Primary Venue
            {theater.primary_venue_name
              ? `: ${theater.primary_venue_name}`
              : ''}{' '}
            · {theater.timezone ?? 'UTC (Theater timezone not set)'}
          </p>
          <p className="mt-1 text-sm">
            {model.calendar.total} reserved intervals, including commitments,
            temporary holds, and Schedule Blocks. Setup and turnover buffers are
            included.
          </p>
          {model.calendar.entries.length ? (
            <ol className="island-shell mt-4 divide-y divide-[var(--line)] rounded-lg px-4">
              {model.calendar.entries.map((entry) => (
                <li key={entry.id} className="py-3">
                  <p className="text-sm">
                    <time dateTime={entry.startsAt}>
                      {formatTime(entry.startsAt)}
                    </time>{' '}
                    –{' '}
                    <time dateTime={entry.endsAt}>
                      {formatTime(entry.endsAt)}
                    </time>
                  </p>
                  {entry.event ? (
                    <a
                      className={destinationClass}
                      href={`${base}/events/${entry.event.slug}#schedule-plan`}
                    >
                      {entry.label}
                    </a>
                  ) : (
                    <p className="mt-1 font-semibold">{entry.label}</p>
                  )}
                  {entry.occurrenceType ? (
                    <p className="text-sm capitalize">{entry.occurrenceType}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="island-shell mt-4 rounded-lg p-4">
              No Primary Venue reservations in the next 7 days.
            </p>
          )}
          {model.calendar.total > model.calendar.entries.length ? (
            <p className="mt-2 text-sm">
              Showing the first {model.calendar.entries.length} of{' '}
              {model.calendar.total} intervals.
            </p>
          ) : null}
          <a className={`${destinationClass} mt-2`} href={`${base}/calendar`}>
            Open Theater Calendar
          </a>
        </section>

        <section aria-labelledby="event-pipeline" className="mt-8 min-w-0">
          <h2 id="event-pipeline" className="text-2xl font-extrabold">
            Event pipeline
          </h2>
          <p className="mt-2 text-[var(--sea-ink-soft)]">
            {model.pipeline.total}{' '}
            {model.pipeline.total === 1 ? 'Event' : 'Events'} · lifecycle
          </p>
          {model.pipeline.total ? (
            <>
              <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {model.pipeline.stages.map((stage) => (
                  <div
                    key={stage.label}
                    className="island-shell rounded-lg p-3"
                  >
                    <dt className="text-sm">{stage.label}</dt>
                    <dd className="mt-1 text-2xl font-bold">{stage.count}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm text-[var(--sea-ink-soft)]">
                Active Events only · these counts overlap; Publication and
                health are independent of lifecycle.
              </p>
              <dl className="mt-2 divide-y divide-[var(--line)]">
                {model.pipeline.context.map((state) => (
                  <div
                    key={state.label}
                    className="flex justify-between gap-3 py-2"
                  >
                    <dt>{state.label}</dt>
                    <dd className="font-bold">{state.count}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="island-shell mt-4 rounded-lg p-4">
              No Events yet. Open Events to start a plan.
            </p>
          )}
          <a className={`${destinationClass} mt-2`} href={`${base}/events`}>
            Browse Events
          </a>
        </section>
      </div>

      <section aria-labelledby="recent-activity" className="mt-8">
        <h2 id="recent-activity" className="text-2xl font-extrabold">
          Recent activity
        </h2>
        <p className="mt-2 text-[var(--sea-ink-soft)]">
          Latest factual changes across this Theater. Activity does not resolve
          shared work.
        </p>
        {model.activity.length ? (
          <ol className="island-shell mt-4 divide-y divide-[var(--line)] rounded-lg px-4">
            {model.activity.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between sm:gap-6"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{entry.action}</p>
                  <p className="text-sm">
                    {entry.actor}
                    {entry.eventTitle ? ` · ${entry.eventTitle}` : ''}
                  </p>
                  {entry.href ? (
                    <a href={entry.href} className={destinationClass}>
                      View Event history
                      <span className="sr-only"> for {entry.eventTitle}</span>
                    </a>
                  ) : null}
                </div>
                <time
                  className="shrink-0 text-sm text-[var(--sea-ink-soft)]"
                  dateTime={entry.createdAt}
                >
                  {formatTime(entry.createdAt)}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="island-shell mt-4 rounded-lg p-4">
            No recent Theater activity.
          </p>
        )}
      </section>
    </>
  )
}

export function TheaterOperationsErrorState({ error }: { error: unknown }) {
  if (
    isAppError(error) &&
    ['forbidden', 'not_found', 'unauthenticated'].includes(error.code)
  )
    return <WorkspaceErrorState error={error} />
  return (
    <main className="page-wrap py-10">
      <h1 className="display-title text-3xl font-bold">
        Theater Operations could not be loaded
      </h1>
      <p role="alert" className="mt-4">
        Current work is unavailable. Try again to load the latest decisions and
        schedule.
      </p>
      <div className="mt-4 flex flex-wrap gap-6">
        <button
          className={destinationClass}
          type="button"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
        <a className={destinationClass} href="/app/callsheet">
          Return to Callsheet
        </a>
      </div>
    </main>
  )
}
