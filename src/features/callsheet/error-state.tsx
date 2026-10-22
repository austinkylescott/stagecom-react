import { useState } from 'react'
import { Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { isAppError } from '@/server/errors'

export function CallsheetErrorState({
  error,
  onRetry,
  returnTo,
}: {
  error: unknown
  onRetry: () => Promise<void>
  returnTo: string
}) {
  const [retrying, setRetrying] = useState(false)
  const code = isAppError(error) ? error.code : 'internal_error'
  const unauthenticated = code === 'unauthenticated'
  const forbidden = code === 'forbidden'

  async function retry() {
    setRetrying(true)
    try {
      await onRetry()
    } finally {
      setRetrying(false)
    }
  }

  return (
    <main aria-live="polite" className="page-wrap py-6">
      <Card className="gap-0 px-6 py-7 sm:px-8">
        <p className="text-xs font-medium text-muted-foreground">Callsheet</p>
        <h1 className="mt-3 text-2xl font-semibold">
          {unauthenticated
            ? 'Sign in to open your Callsheet'
            : forbidden
              ? 'Your Callsheet is not available to you'
              : 'Could not load your Callsheet'}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          {unauthenticated
            ? 'Your session has ended. Sign in again to continue.'
            : forbidden
              ? 'Your current access does not allow this read. Choose another available destination.'
              : 'Your Callsheet data is unavailable right now. Try loading it again, or open your Notifications.'}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {unauthenticated ? (
            <Button asChild className="min-h-11">
              <Link to="/login" search={{ next: returnTo }}>
                Sign in again
              </Link>
            </Button>
          ) : forbidden ? null : (
            <Button className="min-h-11" disabled={retrying} onClick={retry}>
              {retrying ? 'Retrying Callsheet…' : 'Retry Callsheet'}
            </Button>
          )}
          {!unauthenticated ? (
            <Button asChild variant="outline" className="min-h-11">
              <Link to="/app/notifications">Open Notifications</Link>
            </Button>
          ) : null}
        </div>
      </Card>
    </main>
  )
}
