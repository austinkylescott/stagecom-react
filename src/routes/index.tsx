import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, CalendarDays, UsersRound } from 'lucide-react'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main>
      <section className="page-wrap grid gap-8 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center lg:py-24">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
            Theater work, in one place
          </p>
          <h1 className="display-title mt-4 max-w-3xl text-5xl font-bold leading-[1.02] text-[var(--sea-ink)] sm:text-6xl">
            Keep the whole production moving together.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--sea-ink-soft)]">
            Stagecom gives Theater teams a calm workspace for Events, people,
            invitations, approvals, and the operational details between them.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center gap-2 rounded-md bg-[var(--sea-ink)] px-5 py-3 font-extrabold text-white no-underline"
              to="/app/callsheet"
            >
              Open my callsheet <ArrowRight className="size-4" />
            </Link>
            <Link
              className="rounded-md border border-[var(--line)] bg-[var(--paper)] px-5 py-3 font-extrabold text-[var(--sea-ink)] no-underline"
              to="/signup"
            >
              Create account
            </Link>
          </div>
        </div>

        <div className="island-shell grid gap-4 rounded-xl px-6 py-6 sm:px-7 sm:py-7">
          <HomeCapability
            copy="Move an Event from an early proposal through staffing, casting, review, and publication."
            icon={CalendarDays}
            title="Plan Events"
          />
          <div className="h-px bg-[var(--line)]" />
          <HomeCapability
            copy="Invite people deliberately, understand their access, and keep Theater membership governed."
            icon={UsersRound}
            title="Coordinate people"
          />
        </div>
      </section>
    </main>
  )
}

function HomeCapability({
  copy,
  icon: Icon,
  title,
}: {
  copy: string
  icon: typeof CalendarDays
  title: string
}) {
  return (
    <article className="flex gap-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-md bg-[var(--theater-soft)] text-[var(--theater-ink)]">
        <Icon className="size-5" />
      </span>
      <div>
        <h2 className="text-xl font-extrabold text-[var(--sea-ink)]">
          {title}
        </h2>
        <p className="mt-2 leading-7 text-[var(--sea-ink-soft)]">{copy}</p>
      </div>
    </article>
  )
}
