import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { PersonalCalendarEntry } from './read-model'

export function PersonalCalendarLoadingState() {
  return (
    <main aria-live="polite" className="page-wrap py-6">
      <Card className=" px-6 py-7 sm:px-8 gap-0">
        <p className="text-xs font-medium tracking-normal text-muted-foreground">
          Loading Calendar
        </p>
        <h1 className="display-title mt-3 text-2xl font-medium text-foreground sm:text-2xl">
          Preparing your agenda
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Your personal commitments will open shortly. You do not need to take
          any action.
        </p>
      </Card>
    </main>
  )
}

export function PersonalCalendarErrorState() {
  return (
    <main aria-live="polite" className="page-wrap py-6">
      <Card className=" px-6 py-7 sm:px-8 gap-0">
        <p className="text-xs font-medium tracking-normal text-muted-foreground">
          Something went wrong
        </p>
        <h1 className="display-title mt-3 text-2xl font-medium text-foreground sm:text-2xl">
          Your Calendar is still safe
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Stagecom could not load your agenda right now. Try again, or return to
          Callsheet and choose your next step.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => window.location.reload()} type="button">
            Try again
          </Button>
          <a
            className="inline-flex min-h-11 items-center rounded-md border border-border px-4 py-3 text-sm font-semibold no-underline focus-visible:ring-[3px] focus-visible:ring-ring/35"
            href="/app/callsheet"
          >
            Return to Callsheet
          </a>
        </div>
      </Card>
    </main>
  )
}

export function PersonalCalendar({
  entries,
}: {
  entries: PersonalCalendarEntry[]
}) {
  return (
    <main className="page-wrap py-6">
      <header className="max-w-2xl">
        <p className="text-xs font-medium tracking-normal text-muted-foreground">
          Personal schedule
        </p>
        <h1 className="display-title mt-3 text-2xl font-medium text-foreground">
          Calendar
        </h1>
        <p className="mt-3 text-muted-foreground">
          Your upcoming Events, Calls, and accepted commitments across every
          active Theater.
        </p>
      </header>

      <section aria-labelledby="upcoming-agenda" className="mt-8 max-w-3xl">
        <div className="flex items-baseline justify-between gap-4">
          <h2
            className="text-2xl font-semibold text-foreground"
            id="upcoming-agenda"
          >
            Upcoming agenda
          </h2>
          <p className="text-sm font-semibold text-muted-foreground">
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
          <div className="mt-4 rounded-lg border border-dashed border-border px-5 py-6 text-muted-foreground">
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
    <Card className=" px-5 py-5 gap-0">
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium tracking-normal text-muted-foreground">
        <span>{entry.theater.title}</span>
        <span aria-hidden="true">·</span>
        <span>{entry.relationship}</span>
      </div>
      <h3 className="mt-2 text-xl font-semibold text-foreground">
        {entry.event.title}
      </h3>
      {entry.startsAt ? (
        <p className="mt-2 text-sm font-semibold text-muted-foreground">
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
        <p className="mt-2 text-sm font-semibold text-muted-foreground">
          Response needed
        </p>
      )}
      <Button asChild variant="default" className="mt-5">
        <a
          href={
            entry.event.slug
              ? `/app/${entry.theater.slug}/events/${entry.event.slug}${entry.targetAnchor}`
              : '/app/callsheet'
          }
        >
          {entry.event.slug ? entry.action : 'Open Callsheet'}
        </a>
      </Button>
    </Card>
  )
}

function formatAgendaTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
