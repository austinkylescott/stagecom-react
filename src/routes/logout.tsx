import { Card } from '@/components/ui/card'
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
      <Card className="w-full max-w-lg  px-6 py-7 sm:px-8 gap-0">
        <div className="flex items-center gap-3 text-foreground">
          <Loader2 className="size-5 animate-spin" />
          <p className="text-xs font-medium tracking-normal">Auth</p>
        </div>
        <h1 className="display-title mt-4 text-2xl font-medium text-foreground">
          Signing out
        </h1>
      </Card>
    </main>
  )
}
