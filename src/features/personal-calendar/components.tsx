import type { PersonalCalendarEntry } from './read-model'

export function PersonalCalendarLoadingState() {
  return (
    <main aria-live="polite" className="page-wrap py-10 sm:py-14">
      <section className="island-shell rounded-lg px-6 py-7 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
          Loading Calendar
        </p>
        <h1 className="display-title mt-3 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Preparing your agenda
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--sea-ink-soft)]">
          Your personal commitments will open shortly. You do not need to take
          any action.
        </p>
      </section>
    </main>
  )
}

export function PersonalCalendarErrorState() {
  return (
    <main aria-live="polite" className="page-wrap py-10 sm:py-14">
      <section className="island-shell rounded-lg px-6 py-7 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
          Something went wrong
        </p>
        <h1 className="display-title mt-3 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Your Calendar is still safe
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--sea-ink-soft)]">
          Stagecom could not load your agenda right now. Try again, or return to
          Callsheet and choose your next step.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="min-h-11 rounded-md bg-[var(--sea-ink)] px-4 py-3 text-sm font-extrabold text-white focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]/35"
            onClick={() => window.location.reload()}
            type="button"
          >
            Try again
          </button>
          <a
            className="inline-flex min-h-11 items-center rounded-md border border-[var(--line)] px-4 py-3 text-sm font-extrabold no-underline focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]/35"
            href="/app/callsheet"
          >
            Return to Callsheet
          </a>
        </div>
      </section>
    </main>
  )
}

export function PersonalCalendar({
  entries,
}: {
  entries: PersonalCalendarEntry[]
}) {
  return (
    <main className="page-wrap py-8 sm:py-12">
      <header className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
          Personal schedule
        </p>
        <h1 className="display-title mt-3 text-4xl font-bold text-[var(--sea-ink)]">
          Calendar
        </h1>
        <p className="mt-3 text-[var(--sea-ink-soft)]">
          Your upcoming Events, Calls, and accepted commitments across every
          active Theater.
        </p>
      </header>

      <section aria-labelledby="upcoming-agenda" className="mt-8 max-w-3xl">
        <div className="flex items-baseline justify-between gap-4">
          <h2
            className="text-2xl font-extrabold text-[var(--sea-ink)]"
            id="upcoming-agenda"
          >
            Upcoming agenda
          </h2>
          <p className="text-sm font-semibold text-[var(--sea-ink-soft)]">
            {entries.length === 1 ? '1 entry' : `${entries.length} entries`}
          </p>
        </div>
        {entries.length ? (
          <ol className="mt-4 grid gap-3">
            {entries.map((entry) => (
              <li key={entry.id}>
                <AgendaEntry entry={entry} />
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-[var(--line)] px-5 py-6 text-[var(--sea-ink-soft)]">
            <p className="font-semibold">No upcoming personal commitments.</p>
            <p className="mt-1 text-sm">
              Theater occupancy that does not involve you is not shown here.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}

function AgendaEntry({ entry }: { entry: PersonalCalendarEntry }) {
  return (
    <article className="island-shell rounded-lg px-5 py-5">
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--kicker)]">
        <span>{entry.theater.title}</span>
        <span aria-hidden="true">·</span>
        <span>{entry.relationship}</span>
      </div>
      <h3 className="mt-2 text-xl font-extrabold text-[var(--sea-ink)]">
        {entry.event.title}
      </h3>
      {entry.startsAt ? (
        <p className="mt-2 text-sm font-semibold text-[var(--sea-ink-soft)]">
          <time dateTime={entry.startsAt}>
            {formatAgendaTime(entry.startsAt)}
          </time>
          {entry.endsAt ? (
            <>
              {' – '}
              <time dateTime={entry.endsAt}>
                {formatAgendaTime(entry.endsAt)}
              </time>
            </>
          ) : null}
        </p>
      ) : (
        <p className="mt-2 text-sm font-semibold text-[var(--sea-ink-soft)]">
          Response needed
        </p>
      )}
      <a
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--sea-ink)] px-4 py-3 text-sm font-extrabold text-white no-underline focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]/35"
        href={
          entry.event.slug
            ? `/app/${entry.theater.slug}/events/${entry.event.slug}${entry.targetAnchor}`
            : '/app/callsheet'
        }
      >
        {entry.event.slug ? entry.action : 'Open Callsheet'}
      </a>
    </article>
  )
}

function formatAgendaTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
