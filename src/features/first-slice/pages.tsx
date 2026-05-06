import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mail,
  Theater,
  UserRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  resolveAuthRedirectFn,
  updateDisplayNameFn,
} from '@/features/auth/server-functions'
import { createSupabaseBrowserClient, getAuthCallbackUrl } from '@/features/auth/client'

type AuthPageProps = {
  inviteToken?: string
  mode: 'signup' | 'login'
  next?: string
}

export function AuthPage({ inviteToken, mode, next }: AuthPageProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<
    | { tone: 'error' | 'success'; message: string }
    | { tone: 'idle'; message?: undefined }
  >({ tone: 'idle' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const title =
    mode === 'signup' ? 'Create your Stagecom account' : 'Sign in to Stagecom'
  const copy =
    mode === 'signup'
      ? 'Use a magic link to start theater setup or accept an invite.'
      : 'Use a magic link to return to your callsheet or continue protected work.'

  return (
    <main className="page-wrap grid min-h-[72vh] place-items-center py-10">
      <section className="island-shell w-full max-w-lg rounded-lg px-6 py-7 sm:px-8">
        <Mail className="size-7 text-[var(--palm)]" />
        <h1 className="display-title mt-4 text-3xl font-bold text-[var(--sea-ink)]">
          {title}
        </h1>
        <p className="mt-3 leading-7 text-[var(--sea-ink-soft)]">{copy}</p>
        <form
          className="mt-6 grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault()
            setIsSubmitting(true)
            setStatus({ tone: 'idle' })

            try {
              const supabase = createSupabaseBrowserClient()
              const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                  data: { inviteToken },
                  emailRedirectTo: getAuthCallbackUrl({ inviteToken, next }),
                  shouldCreateUser: mode === 'signup',
                },
              })

              if (error) {
                setStatus({
                  tone: 'error',
                  message:
                    error.status === 429
                      ? 'Too many attempts. Wait a minute, then request another link.'
                      : error.message,
                })
                return
              }

              setStatus({
                tone: 'success',
                message: 'Check your email for a Stagecom magic link.',
              })
            } catch (error) {
              setStatus({
                tone: 'error',
                message:
                  error instanceof Error
                    ? error.message
                    : 'Magic-link delivery could not start.',
              })
            } finally {
              setIsSubmitting(false)
            }
          }}
        >
          <label className="grid gap-2 text-sm font-bold text-[var(--sea-ink)]">
            Email address
            <input
              className="rounded-md border border-[var(--line)] bg-white px-4 py-3 font-medium outline-none focus:border-[var(--lagoon-deep)]"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </label>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--sea-ink)] px-4 py-3 font-extrabold text-white disabled:opacity-55"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                Sending <Loader2 className="size-4 animate-spin" />
              </>
            ) : (
              <>
                Send magic link <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>
        {status.tone !== 'idle' ? (
          <p
            className={
              status.tone === 'success'
                ? 'mt-4 rounded-md border border-[var(--chip-line)] bg-[var(--theater-soft)] px-4 py-3 text-sm font-semibold text-[var(--theater-ink)]'
                : 'mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800'
            }
          >
            {status.message}
          </p>
        ) : null}
      </section>
    </main>
  )
}

export function CompleteProfilePage({ next }: { next?: string }) {
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <main className="page-wrap grid min-h-[72vh] place-items-center py-10">
      <section className="island-shell w-full max-w-lg rounded-lg px-6 py-7 sm:px-8">
        <UserRound className="size-7 text-[var(--palm)]" />
        <h1 className="display-title mt-4 text-3xl font-bold text-[var(--sea-ink)]">
          Complete your profile
        </h1>
        <p className="mt-3 leading-7 text-[var(--sea-ink-soft)]">
          Stagecom only requires a display name before entering theater
          workflows.
        </p>
        <form
          className="mt-6 grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault()
            setError(null)
            setIsSubmitting(true)

            try {
              const result = await updateDisplayNameFn({
                data: { displayName, next },
              })

              if (!result.ok) {
                setError(result.error.message)
                return
              }

              const redirectResult = await resolveAuthRedirectFn({
                data: { next },
              })

              window.location.assign(
                redirectResult.ok ? redirectResult.data.path : '/onboarding',
              )
            } finally {
              setIsSubmitting(false)
            }
          }}
        >
          <label className="grid gap-2 text-sm font-bold text-[var(--sea-ink)]">
            Display name
            <input
              className="rounded-md border border-[var(--line)] bg-white px-4 py-3 font-medium outline-none focus:border-[var(--lagoon-deep)]"
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your name"
              required
              value={displayName}
            />
          </label>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--sea-ink)] px-4 py-3 font-extrabold text-white disabled:opacity-50"
            disabled={displayName.trim().length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                Saving <Loader2 className="size-4 animate-spin" />
              </>
            ) : (
              'Continue'
            )}
          </button>
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {error}
            </p>
          ) : null}
        </form>
      </section>
    </main>
  )
}

export function JoinInvitePage({ inviteToken }: { inviteToken: string }) {
  const tokenState = useMemo(() => {
    if (inviteToken.length < 24) {
      return {
        title: 'Invite link is invalid',
        copy: 'Ask the theater admin for a fresh invite link.',
      }
    }

    return {
      title: 'Join this theater',
      copy: 'Invite acceptance will verify the token, signed-in email, expiration, and existing membership before creating access.',
    }
  }, [inviteToken])

  return (
    <main className="page-wrap grid min-h-[72vh] place-items-center py-10">
      <section className="island-shell w-full max-w-xl rounded-lg px-6 py-7 sm:px-8">
        <Theater className="size-7 text-[var(--palm)]" />
        <h1 className="display-title mt-4 text-3xl font-bold text-[var(--sea-ink)]">
          {tokenState.title}
        </h1>
        <p className="mt-3 leading-7 text-[var(--sea-ink-soft)]">
          {tokenState.copy}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="rounded-md bg-[var(--sea-ink)] px-4 py-3 font-extrabold text-white no-underline"
            search={{ inviteToken }}
            to="/login"
          >
            Sign in to accept
          </Link>
          <Link
            className="rounded-md border border-[var(--line)] px-4 py-3 font-extrabold no-underline"
            search={{ inviteToken }}
            to="/signup"
          >
            Create account
          </Link>
        </div>
      </section>
    </main>
  )
}

export function OnboardingHubPage() {
  return (
    <main className="page-wrap py-10 sm:py-14">
      <section className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
          Onboarding
        </p>
        <h1 className="display-title mt-3 text-4xl font-bold text-[var(--sea-ink)]">
          Choose your setup path
        </h1>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <OnboardingChoice
          copy="Create a draft theater, fill the publish gate, then preview the public home."
          href="/onboarding/theater"
          title="Create theater"
        />
        <OnboardingChoice
          copy="Joining requires an invite link in v1. Paste or open the invite URL from your theater admin."
          href="/login"
          title="Join theater"
        />
      </div>
    </main>
  )
}

function OnboardingChoice({
  copy,
  href,
  title,
}: {
  copy: string
  href: string
  title: string
}) {
  return (
    <a
      className="island-shell block rounded-lg px-6 py-6 no-underline transition hover:-translate-y-0.5"
      href={href}
    >
      <h2 className="text-2xl font-extrabold text-[var(--sea-ink)]">
        {title}
      </h2>
      <p className="mt-3 leading-7 text-[var(--sea-ink-soft)]">{copy}</p>
      <span className="mt-5 inline-flex items-center gap-2 font-extrabold text-[var(--lagoon-deep)]">
        Continue <ArrowRight className="size-4" />
      </span>
    </a>
  )
}

export function TheaterSetupPage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [tagline, setTagline] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [stateRegion, setStateRegion] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [timezone, setTimezone] = useState('')

  const generatedSlug = slug || slugify(name)
  const gates = [
    ['Name', name.trim().length > 0],
    ['Tagline', tagline.trim().length > 0],
    ['Address', [street, city, stateRegion, postalCode].every(Boolean)],
    ['Slug', generatedSlug.length > 0],
    ['Timezone', timezone.trim().length > 0],
  ] as const
  const canPublish = gates.every(([, complete]) => complete)

  return (
    <main className="page-wrap py-8 sm:py-12">
      <section className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
          Theater setup
        </p>
        <h1 className="display-title mt-3 text-4xl font-bold text-[var(--sea-ink)]">
          Prepare your public theater home
        </h1>
      </section>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <form className="island-shell grid gap-5 rounded-lg px-6 py-6">
          <Field
            label="Theater name"
            onChange={(value) => {
              setName(value)

              if (!slug) {
                setSlug(slugify(value))
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
          </div>
          <Field label="Timezone" onChange={setTimezone} value={timezone} />
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
          <a
            aria-disabled={!canPublish}
            className="mt-6 block rounded-md bg-[var(--sea-ink)] px-4 py-3 text-center font-extrabold text-white no-underline aria-disabled:pointer-events-none aria-disabled:opacity-50"
            href={`/app/${generatedSlug || 'draft-theater'}/preview`}
          >
            Preview
          </a>
        </aside>
      </div>
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

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
