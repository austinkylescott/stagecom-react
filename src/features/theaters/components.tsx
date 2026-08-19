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
    <main className="page-wrap py-8 sm:py-12">
      <section className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
          Theater setup
        </p>
        <h1 className="display-title mt-3 text-4xl font-bold text-[var(--sea-ink)]">
          {theaterId
            ? 'Update your public theater home'
            : 'Prepare your public theater home'}
        </h1>
      </section>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <form
          className="island-shell grid gap-5 rounded-lg px-6 py-6"
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
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {error}
            </p>
          ) : null}
          <button
            className="rounded-md bg-[var(--sea-ink)] px-4 py-3 font-extrabold text-white disabled:opacity-50"
            disabled={!canSaveDraft || isSubmitting}
            type="submit"
          >
            {isSubmitting
              ? 'Saving…'
              : theaterId
                ? 'Save changes'
                : 'Save and preview'}
          </button>
        </form>
        <aside className="island-shell rounded-lg px-5 py-5">
          <h2 className="text-lg font-extrabold text-[var(--sea-ink)]">
            Publish gate
          </h2>
          <div className="mt-4 grid gap-3">
            {gates.map(([label, complete]) => (
              <div className="flex items-center gap-2" key={label}>
                <CheckCircle2
                  className={
                    complete
                      ? 'size-5 text-[var(--palm)]'
                      : 'size-5 text-[var(--sea-ink-soft)] opacity-35'
                  }
                />
                <span className="font-semibold text-[var(--sea-ink)]">
                  {label}
                </span>
              </div>
            ))}
          </div>
          <span
            aria-disabled={!canPublish}
            className="mt-6 block rounded-md bg-[var(--sea-ink)] px-4 py-3 text-center font-extrabold text-white no-underline aria-disabled:pointer-events-none aria-disabled:opacity-50"
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
    <main className="page-wrap py-10 sm:py-14">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
        Personal workspace
      </p>
      <h1 className="display-title mt-3 text-4xl font-bold text-[var(--sea-ink)]">
        Callsheet
      </h1>
      <p className="mt-3 max-w-2xl text-[var(--sea-ink-soft)]">
        Your Theater memberships are available when you choose to enter a
        Theater. Callsheet always remains your personal starting point.
      </p>
      <div className="mt-7 grid gap-4 md:grid-cols-2">
        {theaters.map((theater) => (
          <article
            className="island-shell rounded-lg px-5 py-5"
            key={theater.id}
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--kicker)]">
              {theater.status} {theater.isDefault ? '· Default' : ''}
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-[var(--sea-ink)]">
              {theater.name}
            </h2>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                className="rounded-md bg-[var(--sea-ink)] px-4 py-2 text-sm font-extrabold text-white no-underline"
                href={`/app/${theater.slug}`}
              >
                Enter Theater
              </a>
              {!theater.isDefault ? (
                <button
                  className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-extrabold"
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
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {theaters.length === 0 ? (
        <section className="mt-7 rounded-lg border border-dashed border-[var(--line)] px-5 py-7 text-[var(--sea-ink-soft)]">
          <p>No Theater memberships yet. Create a Theater to begin.</p>
          <Link
            className="mt-4 inline-flex rounded-md bg-[var(--sea-ink)] px-4 py-2 text-sm font-extrabold text-white no-underline focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]/35"
            to="/onboarding/theater"
          >
            Create a Theater
          </Link>
        </section>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm font-semibold text-red-800">{error}</p>
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
    <label className="grid gap-2 text-sm font-bold text-[var(--sea-ink)]">
      {label}
      <input
        className="rounded-md border border-[var(--line)] bg-white px-4 py-3 font-medium outline-none focus:border-[var(--lagoon-deep)]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  )
}
