import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { ArrowRight, Loader2, Mail, UserRound } from 'lucide-react'
import { useState } from 'react'

import {
  resolveAuthRedirectFn,
  signInAsDemoPersonaFn,
  updateDisplayNameFn,
} from '@/features/auth/server-functions'
import { DEMO_PERSONAS, DEMO_PERSONA_KEYS } from '@/features/auth/demo-personas'
import {
  createSupabaseBrowserClient,
  getAuthCallbackUrl,
} from '@/features/auth/client'

type AuthPageProps = {
  demoEnabled?: boolean
  inviteToken?: string
  mode: 'signup' | 'login'
  next?: string
}

export function AuthPage({
  demoEnabled = false,
  inviteToken,
  mode,
  next,
}: AuthPageProps) {
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
      <Card className="w-full max-w-lg  px-6 py-7 sm:px-8 gap-0">
        <Mail className="size-7 text-muted-foreground" />
        <h1 className="display-title mt-4 text-2xl font-medium text-foreground">
          {title}
        </h1>
        <p className="mt-3 leading-7 text-muted-foreground">{copy}</p>
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
          <Label className="grid gap-2 text-sm font-medium text-foreground">
            Email address
            <Input
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </Label>
          <Button disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                Sending <Loader2 className="size-4 animate-spin" />
              </>
            ) : (
              <>
                Send magic link <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>
        {demoEnabled && mode === 'login' ? (
          <section className="mt-6 border-t border-border pt-6">
            <p className="text-xs font-medium tracking-normal text-muted-foreground">
              Demo access
            </p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">
              Choose a seeded persona
            </h2>
            <div className="mt-4 grid gap-2">
              {DEMO_PERSONA_KEYS.map((key) => {
                const persona = DEMO_PERSONAS[key]

                return (
                  <Button
                    variant="outline"
                    className="h-auto w-full flex-col items-start whitespace-normal py-3 text-left"
                    disabled={isSubmitting}
                    key={key}
                    onClick={async () => {
                      setIsSubmitting(true)
                      setStatus({ tone: 'idle' })

                      try {
                        const result = await signInAsDemoPersonaFn({
                          data: { persona: key },
                        })

                        if (!result.ok) {
                          setStatus({
                            tone: 'error',
                            message: result.error.message,
                          })
                          return
                        }

                        window.location.assign(result.data.path)
                      } finally {
                        setIsSubmitting(false)
                      }
                    }}
                    type="button"
                  >
                    <span className="block font-semibold text-foreground">
                      {persona.label}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {persona.description}
                    </span>
                  </Button>
                )
              })}
            </div>
          </section>
        ) : null}
        {status.tone !== 'idle' ? (
          <p
            className={
              status.tone === 'success'
                ? 'mt-4 rounded-md border border-border bg-accent px-4 py-3 text-sm font-semibold text-foreground'
                : 'mt-4 rounded-md border border-border bg-muted px-4 py-3 text-sm font-semibold text-foreground'
            }
          >
            {status.message}
          </p>
        ) : null}
      </Card>
    </main>
  )
}

export function CompleteProfilePage({ next }: { next?: string }) {
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <main className="page-wrap grid min-h-[72vh] place-items-center py-10">
      <Card className="w-full max-w-lg  px-6 py-7 sm:px-8 gap-0">
        <UserRound className="size-7 text-muted-foreground" />
        <h1 className="display-title mt-4 text-2xl font-medium text-foreground">
          Complete your profile
        </h1>
        <p className="mt-3 leading-7 text-muted-foreground">
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
          <Label className="grid gap-2 text-sm font-medium text-foreground">
            Display name
            <Input
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your name"
              required
              value={displayName}
            />
          </Label>
          <Button disabled={displayName.trim().length === 0 || isSubmitting}>
            {isSubmitting ? (
              <>
                Saving <Loader2 className="size-4 animate-spin" />
              </>
            ) : (
              'Continue'
            )}
          </Button>
          {error ? (
            <p className="rounded-md border border-border bg-muted px-4 py-3 text-sm font-semibold text-foreground">
              {error}
            </p>
          ) : null}
        </form>
      </Card>
    </main>
  )
}

export function OnboardingHubPage() {
  return (
    <main className="page-wrap py-6">
      <section className="mb-7">
        <p className="text-xs font-medium tracking-normal text-muted-foreground">
          Onboarding
        </p>
        <h1 className="display-title mt-3 text-2xl font-medium text-foreground">
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
      className="block rounded-lg px-6 py-6 no-underline transition hover:-translate-y-0.5"
      href={href}
    >
      <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
      <p className="mt-3 leading-7 text-muted-foreground">{copy}</p>
      <span className="mt-5 inline-flex items-center gap-2 font-semibold text-foreground">
        Continue <ArrowRight className="size-4" />
      </span>
    </a>
  )
}
