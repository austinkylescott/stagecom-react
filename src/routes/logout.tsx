import { createFileRoute } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'

import { createSupabaseBrowserClient } from '@/features/auth/client'
import { clearAuthSessionFn } from '@/features/auth/server-functions'

export const Route = createFileRoute('/logout')({
  component: LogoutPage,
})

function LogoutPage() {
  useEffect(() => {
    async function signOut() {
      try {
        await createSupabaseBrowserClient().auth.signOut()
      } catch {
        // Server cookies are still cleared below if browser auth is unconfigured.
      }

      await clearAuthSessionFn()
      window.location.assign('/')
    }

    void signOut()
  }, [])

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
          Signing out
        </h1>
      </section>
    </main>
  )
}
