import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'
import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'

import {
  createDraftTheaterFn,
  setDefaultTheaterFn,
  updateTheaterSetupFn,
} from './server-functions'
import { slugifyTheaterName } from './slug'

import type { PublicTheaterView } from '@/features/first-slice/theater-page'
import type { TheaterSummary } from './commands'

export function TheaterSetupPage({
  initialTheater,
  theaterId,
  timezone: initialTimezone,
}: {
  initialTheater?: PublicTheaterView
  theaterId?: string
  timezone?: string
} = {}) {
  const [name, setName] = useState(initialTheater?.name ?? '')
  const [slug, setSlug] = useState(initialTheater?.slug ?? '')
  const [tagline, setTagline] = useState(initialTheater?.tagline ?? '')
  const [street, setStreet] = useState(initialTheater?.location.street ?? '')
  const [city, setCity] = useState(initialTheater?.location.city ?? '')
  const [stateRegion, setStateRegion] = useState(
    initialTheater?.location.stateRegion ?? '',
  )
  const [postalCode, setPostalCode] = useState(
    initialTheater?.location.postalCode ?? '',
  )
  const [country, setCountry] = useState(
    initialTheater?.location.country ?? 'United States',
  )
  const [timezone, setTimezone] = useState(initialTimezone ?? '')
  const [websiteUrl, setWebsiteUrl] = useState(initialTheater?.websiteUrl ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const generatedSlug = slug || slugifyTheaterName(name)
  const gates = [
    ['Name', name.trim().length > 0],
    ['Tagline', tagline.trim().length > 0],
    [
      'Address',
      [street, city, stateRegion, postalCode, country].every(Boolean),
    ],
    ['Slug', generatedSlug.length > 0],
    ['Timezone', timezone.trim().length > 0],
  ] as const
  const canPublish = gates.every(([, complete]) => complete)
  const canSaveDraft = name.trim().length > 0 && generatedSlug.length > 0

  return (
    <main className="page-wrap py-6">
      <section className="mb-6">
        <p className="text-xs font-medium tracking-normal text-muted-foreground">
          Theater setup
        </p>
        <h1 className="display-title mt-3 text-2xl font-medium text-foreground">
          {theaterId
            ? 'Update your public theater home'
            : 'Prepare your public theater home'}
        </h1>
      </section>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <form
          className="grid gap-5 rounded-lg px-6 py-6"
          onSubmit={async (event) => {
            event.preventDefault()
            setError(null)
            setIsSubmitting(true)

            try {
              let persistentTheaterId = theaterId

              if (!persistentTheaterId) {
                const created = await createDraftTheaterFn({
                  data: {
                    name,
                    slug: generatedSlug,
                    ...(timezone.trim() ? { timezone } : {}),
                  },
                })

                if (!created.ok) {
                  setError(created.error.message)
                  return
                }

                persistentTheaterId = created.data.theater.id
              }

              const updated = await updateTheaterSetupFn({
                data: {
                  theaterId: persistentTheaterId,
                  city,
                  country,
                  name,
                  postalCode,
                  slug: generatedSlug,
                  stateRegion,
                  street,
                  tagline,
                  ...(timezone.trim() ? { timezone } : {}),
                  ...(websiteUrl ? { websiteUrl } : {}),
                },
              })

              if (!updated.ok) {
                setError(updated.error.message)
                return
              }

              window.location.assign(`/app/${updated.data.slug}/preview`)
            } finally {
              setIsSubmitting(false)
            }
          }}
        >
          <Field
            label="Theater name"
            onChange={(value) => {
              setName(value)

              if (!slug) {
                setSlug(slugifyTheaterName(value))
              }
            }}
            value={name}
          />
          <Field label="Public slug" onChange={setSlug} value={generatedSlug} />
          <Field label="Tagline" onChange={setTagline} value={tagline} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Street" onChange={setStreet} value={street} />
            <Field label="City" onChange={setCity} value={city} />
            <Field
              label="State / region"
              onChange={setStateRegion}
              value={stateRegion}
            />
            <Field
              label="Postal code"
              onChange={setPostalCode}
              value={postalCode}
            />
            <Field label="Country" onChange={setCountry} value={country} />
          </div>
          <Field label="Timezone" onChange={setTimezone} value={timezone} />
          <Field
            label="Website URL"
            onChange={setWebsiteUrl}
            value={websiteUrl}
          />
          {error ? (
            <p className="rounded-md border border-border bg-muted px-4 py-3 text-sm font-semibold text-foreground">
              {error}
            </p>
          ) : null}
          <Button disabled={!canSaveDraft || isSubmitting} type="submit">
            {isSubmitting
              ? 'Saving…'
              : theaterId
                ? 'Save changes'
                : 'Save and preview'}
          </Button>
        </form>
        <aside className="rounded-lg px-5 py-5">
          <h2 className="text-lg font-semibold text-foreground">
            Publish gate
          </h2>
          <div className="mt-4 grid gap-3">
            {gates.map(([label, complete]) => (
              <div className="flex items-center gap-2" key={label}>
                <CheckCircle2
                  className={
                    complete
                      ? 'size-5 text-muted-foreground'
                      : 'size-5 text-muted-foreground opacity-35'
                  }
                />
                <span className="font-semibold text-foreground">{label}</span>
              </div>
            ))}
          </div>
          <span
            aria-disabled={!canPublish}
            className="mt-6 block rounded-md bg-foreground px-4 py-3 text-center font-semibold text-white no-underline aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            {canPublish
              ? 'Ready for publication after preview'
              : 'Save a draft now and finish these fields later'}
          </span>
        </aside>
      </div>
    </main>
  )
}

export function TheaterHubPage({
  theaters,
}: {
  theaters: Array<
    Pick<TheaterSummary, 'id' | 'name' | 'slug' | 'status'> & {
      isDefault: boolean
    }
  >
}) {
  const [error, setError] = useState<string | null>(null)

  return (
    <main className="page-wrap py-6">
      <p className="text-xs font-medium tracking-normal text-muted-foreground">
        Personal workspace
      </p>
      <h1 className="display-title mt-3 text-2xl font-medium text-foreground">
        Callsheet
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Your Theater memberships are available when you choose to enter a
        Theater. Callsheet always remains your personal starting point.
      </p>
      <div className="mt-7 grid gap-4 md:grid-cols-2">
        {theaters.map((theater) => (
          <Card role="article" className=" px-5 py-5 gap-0" key={theater.id}>
            <p className="text-xs font-medium tracking-normal text-muted-foreground">
              {theater.status} {theater.isDefault ? '· Default' : ''}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              {theater.name}
            </h2>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild variant="default">
                <a href={`/app/${theater.slug}`}>Enter Theater</a>
              </Button>
              {!theater.isDefault ? (
                <Button
                  variant="outline"

                  onClick={async () => {
                    setError(null)
                    const result = await setDefaultTheaterFn({
                      data: { theaterId: theater.id },
                    })

                    if (!result.ok) {
                      setError(result.error.message)
                      return
                    }

                    window.location.reload()
                  }}
                  type="button"
                >
                  Make default
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
      {theaters.length === 0 ? (
        <section className="mt-7 rounded-lg border border-dashed border-border px-5 py-7 text-muted-foreground">
          <p>No Theater memberships yet. Create a Theater to begin.</p>
          <Button asChild variant="default" className="mt-4">
            <Link to="/onboarding/theater">Create a Theater</Link>
          </Button>
        </section>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm font-semibold text-foreground">{error}</p>
      ) : null}
    </main>
  )
}

function Field({
  label,
  onChange,
  value,
}: {
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <Label className="grid gap-2 text-sm font-medium text-foreground">
      {label}
      <Input onChange={(event) => onChange(event.target.value)} value={value} />
    </Label>
  )
}
