import { Card } from '@/components/ui/card'
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
      <Card className="w-full max-w-lg  px-6 py-7 sm:px-8 gap-0">
        <div className="flex items-center gap-3 text-foreground">
          <Loader2 className="size-5 animate-spin" />
          <p className="text-xs font-medium tracking-normal">Auth</p>
        </div>
        <h1 className="display-title mt-4 text-2xl font-medium text-foreground">
          Completing sign in
        </h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          Stagecom is finishing your session and choosing the right next route.
        </p>
        {error ? (
          <p className="mt-4 rounded-md border border-border bg-muted px-4 py-3 text-sm font-semibold text-foreground">
            {error}
          </p>
        ) : null}
      </Card>
    </main>
  )
}
