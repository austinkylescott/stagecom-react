import { CalendarDays, ExternalLink, MapPin } from 'lucide-react'

export type PublicTheaterView = {
  name: string
  slug: string
  tagline: string
  logoUrl?: string
  websiteUrl?: string
  location: {
    street: string
    city: string
    stateRegion: string
    postalCode: string
    country: string
  }
  socialLinks: Array<{
    label: string
    url: string
  }>
  upcomingEvents: Array<{
    title: string
    startsAt: string
    type: string
  }>
}

type PublicTheaterPageProps = {
  theater: PublicTheaterView
  mode: 'preview' | 'published'
}

export function PublicTheaterPage({
  theater,
  mode,
}: PublicTheaterPageProps) {
  const locationLine = [
    theater.location.street,
    theater.location.city,
    theater.location.stateRegion,
    theater.location.postalCode,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <main className="page-wrap py-8 sm:py-12">
      {mode === 'preview' ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3">
          <p className="text-sm font-semibold text-[var(--sea-ink)]">
            Preview mode
          </p>
          <div className="flex gap-2">
            <a
              className="rounded-md border border-[var(--line)] px-3 py-2 text-sm font-bold no-underline"
              href={`/app/${theater.slug}/settings`}
            >
              Edit
            </a>
            <a
              className="rounded-md bg-[var(--sea-ink)] px-3 py-2 text-sm font-bold text-white no-underline"
              href={`/app/${theater.slug}/events/new`}
            >
              Add Event
            </a>
          </div>
        </div>
      ) : null}

      <section className="island-shell overflow-hidden rounded-lg">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="p-7 sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
              {mode === 'preview' ? 'Draft public page' : 'Theater'}
            </p>
            <h1 className="display-title mt-4 text-4xl font-bold leading-tight text-[var(--sea-ink)] sm:text-6xl">
              {theater.name}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--sea-ink-soft)]">
              {theater.tagline}
            </p>
          </div>
          <div className="border-t border-[var(--line)] bg-[var(--chip-bg)] p-7 lg:border-l lg:border-t-0">
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 size-5 text-[var(--palm)]" />
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--kicker)]">
                  Location
                </h2>
                <p className="mt-2 font-semibold text-[var(--sea-ink)]">
                  {locationLine}
                </p>
                <p className="text-sm text-[var(--sea-ink-soft)]">
                  {theater.location.country}
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-3">
              {theater.websiteUrl ? (
                <a
                  className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 font-bold no-underline"
                  href={theater.websiteUrl}
                >
                  Website <ExternalLink className="size-4" />
                </a>
              ) : null}
              {theater.socialLinks.map((link) => (
                <a
                  className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 font-bold no-underline"
                  href={link.url}
                  key={link.label}
                >
                  {link.label} <ExternalLink className="size-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center gap-2 text-[var(--sea-ink)]">
          <CalendarDays className="size-5 text-[var(--palm)]" />
          <h2 className="text-lg font-extrabold">Upcoming programming</h2>
        </div>

        {theater.upcomingEvents.length > 0 ? (
          <div className="grid gap-3">
            {theater.upcomingEvents.map((event) => (
              <article
                className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-5 py-4"
                key={event.title}
              >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--kicker)]">
                  {event.type}
                </p>
                <h3 className="mt-1 text-xl font-extrabold text-[var(--sea-ink)]">
                  {event.title}
                </h3>
                <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                  {event.startsAt}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--line)] bg-[var(--chip-bg)] px-5 py-8 text-center">
            <h3 className="text-xl font-extrabold text-[var(--sea-ink)]">
              Events coming soon
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--sea-ink-soft)]">
              Published events will appear here once the theater adds upcoming
              programming.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}

export function getDemoTheater(slug: string): PublicTheaterView {
  return {
    name: titleFromSlug(slug),
    slug,
    tagline: 'A community stage for bold performances and organized productions.',
    websiteUrl: 'https://example.com',
    location: {
      street: '123 Main Street',
      city: 'Austin',
      stateRegion: 'TX',
      postalCode: '78701',
      country: 'United States',
    },
    socialLinks: [{ label: 'Instagram', url: 'https://example.com' }],
    upcomingEvents: [],
  }
}

function titleFromSlug(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
