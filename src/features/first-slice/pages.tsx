import { ArrowRight, Loader2, Mail, UserRound } from 'lucide-react'
import { useState } from 'react'

import {
  resolveAuthRedirectFn,
  updateDisplayNameFn,
} from '@/features/auth/server-functions'
import {
  createSupabaseBrowserClient,
  getAuthCallbackUrl,
} from '@/features/auth/client'

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
      <h2 className="text-2xl font-extrabold text-[var(--sea-ink)]">{title}</h2>
      <p className="mt-3 leading-7 text-[var(--sea-ink-soft)]">{copy}</p>
      <span className="mt-5 inline-flex items-center gap-2 font-extrabold text-[var(--lagoon-deep)]">
        Continue <ArrowRight className="size-4" />
      </span>
    </a>
  )
}
