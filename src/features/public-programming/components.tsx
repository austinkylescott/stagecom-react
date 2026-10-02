import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from '@tanstack/react-router'
import type { getPublicProgramming } from './queries'

export function PublicProgramming({
  theaters,
}: {
  theaters: Extract<
    Awaited<ReturnType<typeof getPublicProgramming>>,
    { ok: true }
  >['data']['theaters']
}) {
  return (
    <main className="page-wrap min-w-0 break-words py-6">
      <h1 className="text-3xl font-medium">Discover public programming</h1>
      <p className="mt-3 text-muted-foreground">
        Explore Theaters and their published Events.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {theaters.map((theater) => (
          <Card key={theater.slug} className="min-w-0 p-6">
            <h2 className="text-xl font-semibold">
              <a
                className="underline underline-offset-4 focus-visible:outline-2"
                href={theater.href}
              >
                {theater.name}
              </a>
            </h2>
            <p className="whitespace-pre-wrap">{theater.tagline}</p>
            <p className="text-sm text-muted-foreground">{theater.location}</p>
          </Card>
        ))}
      </div>
      {theaters.length === 0 ? (
        <p className="mt-6 rounded-md border p-6">
          No published Theaters yet. Check back for public programming.
        </p>
      ) : null}
    </main>
  )
}

export function PublicProgrammingPending() {
  return (
    <main className="page-wrap py-6" role="status">
      Loading published programming…
    </main>
  )
}

export function PublicProgrammingError() {
  const router = useRouter()
  return (
    <main className="page-wrap py-6">
      <Card className="p-6">
        <h1 className="text-2xl font-medium">
          Public programming is unavailable
        </h1>
        <p role="alert">
          We couldn’t load this published page. Please try again.
        </p>
        <Button onClick={() => void router.invalidate()}>Try again</Button>
        <a className="underline" href="/theater">
          Browse Theaters
        </a>
      </Card>
    </main>
  )
}

export function PublicProgrammingNotFound() {
  return (
    <main className="page-wrap py-6">
      <h1 className="text-2xl font-medium">Published page unavailable</h1>
      <p className="mt-3">
        This Theater or Event has no available public presentation.
      </p>
      <a className="mt-4 inline-block underline" href="/theater">
        Browse Theaters
      </a>
    </main>
  )
}
