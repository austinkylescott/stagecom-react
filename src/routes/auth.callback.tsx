import { createFileRoute } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  resolveAuthRedirectFn,
  setAuthSessionFn,
} from '@/features/auth/server-functions'
import { authSearchSchema } from '@/features/auth/schemas'
import { createSupabaseBrowserClient } from '@/features/auth/client'

export const Route = createFileRoute('/auth/callback')({
  validateSearch: authSearchSchema,
  component: AuthCallbackPage,
})

function AuthCallbackPage() {
  const { inviteToken, next } = Route.useSearch()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function completeSignIn() {
      try {
        const supabase = createSupabaseBrowserClient()
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        const tokenHash = url.searchParams.get('token_hash')

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            throw exchangeError
          }
        } else if (tokenHash) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'email',
          })

          if (verifyError) {
            throw verifyError
          }
        }

        const { data, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !data.session) {
          throw sessionError ?? new Error('Sign-in session was not created.')
        }

        await setAuthSessionFn({
          data: {
            accessToken: data.session.access_token,
            expiresAt: data.session.expires_at,
            refreshToken: data.session.refresh_token,
          },
        })

        const redirectResult = await resolveAuthRedirectFn({
          data: { inviteToken, next },
        })

        window.location.assign(
          redirectResult.ok ? redirectResult.data.path : '/onboarding',
        )
      } catch (authError) {
        setError(
          authError instanceof Error
            ? authError.message
            : 'Sign in could not be completed.',
        )
      }
    }

    void completeSignIn()
  }, [inviteToken, next])

  return (
    <main className="page-wrap grid min-h-[72vh] place-items-center py-10">
      <section className="island-shell w-full max-w-lg rounded-lg px-6 py-7 sm:px-8">
        <div className="flex items-center gap-3 text-[var(--theater-ink)]">
          <Loader2 className="size-5 animate-spin" />
          <p className="text-xs font-bold uppercase tracking-[0.18em]">
            Auth
          </p>
        </div>
        <h1 className="display-title mt-4 text-3xl font-bold text-[var(--sea-ink)]">
          Completing sign in
        </h1>
        <p className="mt-3 leading-7 text-[var(--sea-ink-soft)]">
          Stagecom is finishing your session and choosing the right next route.
        </p>
        {error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {error}
          </p>
        ) : null}
      </section>
    </main>
  )
}
