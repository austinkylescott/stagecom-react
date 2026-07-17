import { useState } from 'react'

import { createManagedEventFn } from './server-functions'

type EventMember = {
  displayName: string
  isEligibleProducer: boolean
  roles: string[]
  userId: string
}

export function CreateManagedEventPage({
  actorEligible,
  members,
  theater,
}: {
  actorEligible: boolean
  members: EventMember[]
  theater: { id: string; name: string; slug: string }
}) {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [directorUserId, setDirectorUserId] = useState('')
  const [producerUserIds, setProducerUserIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <main className="page-wrap py-8 sm:py-12">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
        Events · {theater.name}
      </p>
      <h1 className="display-title mt-3 text-4xl font-bold text-[var(--sea-ink)]">
        Create a managed Event
      </h1>
      {!actorEligible ? (
        <p className="mt-5 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 font-semibold text-amber-950">
          Current Theater policy does not allow you to use the Producer
          workflow.
        </p>
      ) : null}
      <form
        className="island-shell mt-6 grid gap-5 rounded-lg px-6 py-6"
        onSubmit={async (event) => {
          event.preventDefault()
          setError(null)
          setIsSubmitting(true)

          try {
            const result = await createManagedEventFn({
              data: {
                ...(directorUserId ? { directorUserId } : {}),
                producerUserIds,
                slug,
                theaterId: theater.id,
                title,
              },
            })

            if (!result.ok) {
              setError(result.error.message)
              return
            }

            window.location.assign(
              `/app/${theater.slug}/events/${result.data.slug}`,
            )
          } finally {
            setIsSubmitting(false)
          }
        }}
      >
        <label className="grid gap-2 text-sm font-bold">
          Event title
          <input
            className="rounded-md border border-[var(--line)] bg-white px-4 py-3"
            onChange={(event) => {
              setTitle(event.target.value)
              if (!slug) {
                setSlug(toSlug(event.target.value))
              }
            }}
            value={title}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Event slug
          <input
            className="rounded-md border border-[var(--line)] bg-white px-4 py-3"
            onChange={(event) => setSlug(event.target.value)}
            value={slug}
          />
        </label>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-bold">Co-Producers</legend>
          {members
            .filter((member) => member.isEligibleProducer)
            .map((member) => (
              <label className="flex items-center gap-3" key={member.userId}>
                <input
                  checked={producerUserIds.includes(member.userId)}
                  onChange={(event) =>
                    setProducerUserIds((current) =>
                      event.target.checked
                        ? [...current, member.userId]
                        : current.filter((userId) => userId !== member.userId),
                    )
                  }
                  type="checkbox"
                />
                {member.displayName}
              </label>
            ))}
        </fieldset>
        <label className="grid gap-2 text-sm font-bold">
          Director
          <select
            className="rounded-md border border-[var(--line)] bg-white px-4 py-3"
            onChange={(event) => setDirectorUserId(event.target.value)}
            value={directorUserId}
          >
            <option value="">Assign later</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.displayName}
              </option>
            ))}
          </select>
        </label>
        {error ? <p className="font-semibold text-red-800">{error}</p> : null}
        <button
          className="rounded-md bg-[var(--sea-ink)] px-4 py-3 font-extrabold text-white disabled:opacity-50"
          disabled={!actorEligible || !title.trim() || !slug || isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Creating…' : 'Create Event draft'}
        </button>
      </form>
    </main>
  )
}

export function ManagedEventsPage({
  events,
  theaterSlug,
}: {
  events: Array<{
    id: string
    lifecycle_status: string
    operational_health: string
    publication_status: string
    slug: string
    title: string
  }>
  theaterSlug: string
}) {
  return (
    <main className="page-wrap py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
            Events
          </p>
          <h1 className="display-title mt-3 text-4xl font-bold text-[var(--sea-ink)]">
            Event operations
          </h1>
        </div>
        <a
          className="rounded-md bg-[var(--sea-ink)] px-4 py-3 font-extrabold text-white no-underline"
          href={`/app/${theaterSlug}/events/new`}
        >
          Create Event
        </a>
      </div>
      <div className="mt-6 grid gap-4">
        {events.map((event) => (
          <a
            className="island-shell rounded-lg px-5 py-5 no-underline"
            href={`/app/${theaterSlug}/events/${event.slug}`}
            key={event.id}
          >
            <h2 className="text-2xl font-extrabold text-[var(--sea-ink)]">
              {event.title}
            </h2>
            <p className="mt-2 text-sm font-semibold text-[var(--sea-ink-soft)]">
              Lifecycle: {event.lifecycle_status} · Publication:{' '}
              {event.publication_status} · Health: {event.operational_health}
            </p>
          </a>
        ))}
        {events.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--line)] px-5 py-7">
            No managed Events yet.
          </p>
        ) : null}
      </div>
    </main>
  )
}

export function ManagedEventWorkspace({
  event,
}: {
  event: {
    lifecycle_status: string
    operational_health: string
    publication_status: string
    show_cast: Array<{ user_id: string }>
    show_leadership: Array<{
      profiles: { display_name: string }
      role: string
      user_id: string
    }>
    title: string
  }
}) {
  return (
    <main className="page-wrap py-8 sm:py-12">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
        Event workspace
      </p>
      <h1 className="display-title mt-3 text-4xl font-bold text-[var(--sea-ink)]">
        {event.title}
      </h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StateCard label="Lifecycle" value={event.lifecycle_status} />
        <StateCard label="Publication" value={event.publication_status} />
        <StateCard
          label="Operational health"
          value={event.operational_health}
        />
      </div>
      <section className="island-shell mt-5 rounded-lg px-6 py-6">
        <h2 className="text-2xl font-extrabold">Leadership</h2>
        <ul className="mt-3 grid gap-2">
          {event.show_leadership.map((leader) => (
            <li key={`${leader.role}-${leader.user_id}`}>
              {leader.profiles.display_name} · {leader.role}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm font-semibold text-[var(--sea-ink-soft)]">
          Cast Members: {event.show_cast.length}. Leadership never creates Cast
          membership; casting begins with a separate invitation and acceptance.
        </p>
      </section>
    </main>
  )
}

function StateCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="island-shell rounded-lg px-5 py-5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--kicker)]">
        {label}
      </p>
      <p className="mt-2 text-xl font-extrabold">{value}</p>
    </div>
  )
}

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
