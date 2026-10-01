import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
    localStartsAt: string
    timezoneName: string
    locationName: string
    imageUrl: string | null
    admissionSummary: string
    cancelled: boolean
    href: string
  }>
}

type PublicTheaterPageProps = {
  previewAction?: React.ReactNode
  theater: PublicTheaterView
  mode: 'preview' | 'published'
}

export function PublicTheaterPage({
  previewAction,
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
    <main className="page-wrap py-6">
      {mode === 'preview' ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Preview mode</p>
          <div className="flex gap-2">
            {previewAction}
            <a
              className="rounded-md border border-border px-3 py-2 text-sm font-medium no-underline"
              href={`/app/${theater.slug}/settings`}
            >
              Edit
            </a>
            <Button asChild variant="default">
              <a href={`/app/${theater.slug}/events/new`}>Add Event</a>
            </Button>
          </div>
        </div>
      ) : null}

      <Card className="overflow-hidden gap-0">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="p-7 sm:p-10">
            <p className="text-xs font-medium tracking-normal text-muted-foreground">
              {mode === 'preview' ? 'Draft public page' : 'Theater'}
            </p>
            <h1 className="display-title mt-4 text-2xl font-medium leading-tight text-foreground sm:text-6xl">
              {theater.name}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              {theater.tagline}
            </p>
          </div>
          <div className="border-t border-border bg-muted p-7 lg:border-l lg:border-t-0">
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 size-5 text-muted-foreground" />
              <div>
                <h2 className="text-sm font-medium tracking-normal text-muted-foreground">
                  Location
                </h2>
                <p className="mt-2 font-semibold text-foreground">
                  {locationLine}
                </p>
                <p className="text-sm text-muted-foreground">
                  {theater.location.country}
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-3">
              {theater.websiteUrl ? (
                <Button asChild variant="outline">
                  <a href={theater.websiteUrl}>
                    Website <ExternalLink className="size-4" />
                  </a>
                </Button>
              ) : null}
              {theater.socialLinks.map((link) => (
                <Button asChild variant="outline">
                  <a href={link.url} key={link.label}>
                    {link.label} <ExternalLink className="size-4" />
                  </a>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <section className="mt-6">
        <div className="mb-3 flex items-center gap-2 text-foreground">
          <CalendarDays className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Upcoming programming</h2>
        </div>

        {theater.upcomingEvents.length > 0 ? (
          <div className="grid gap-3">
            {theater.upcomingEvents.map((event) => (
              <article
                className="overflow-hidden rounded-lg border border-border bg-secondary sm:flex"
                key={event.href}
              >
                {event.imageUrl ? (
                  <img
                    alt=""
                    className="aspect-[4/3] w-full object-cover sm:w-44"
                    src={event.imageUrl}
                  />
                ) : null}
                <div className="px-5 py-4">
                  <p className="text-xs font-medium tracking-normal text-muted-foreground">
                    {event.cancelled ? 'Cancelled Event' : 'Upcoming Event'}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-foreground">
                    <a
                      className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
                      href={event.href}
                    >
                      {event.title}
                    </a>
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatPerformance(event.startsAt, event.timezoneName)} ·{' '}
                    {event.locationName}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {event.cancelled ? 'Admission closed · ' : ''}
                    {event.admissionSummary}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted px-5 py-8 text-center">
            <h3 className="text-xl font-semibold text-foreground">
              Events coming soon
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Published events will appear here once the theater adds upcoming
              programming.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}

function formatPerformance(startsAt: string, timezoneName: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezoneName,
  }).format(new Date(startsAt))
}
