import { createFileRoute, useRouter, useLocation } from '@tanstack/react-router'

import { CallsheetPage } from '@/features/callsheet/components'
import { getMyCallsheetFn } from '@/features/callsheet/server-functions'
import { WorkspaceLoadingState } from '@/features/application-shell/components'
import { CallsheetErrorState } from '@/features/callsheet/error-state'

export const Route = createFileRoute('/app/callsheet')({
  loader: async () => {
    const result = await getMyCallsheetFn()

    if (!result.ok) {
      throw result.error
    }

    return result.data
  },
  pendingComponent: WorkspaceLoadingState,
  errorComponent: CallsheetReadError,
  component: MyCallsheetPage,
})

function CallsheetReadError({ error }: { error: unknown }) {
  const router = useRouter()
  const location = useLocation()
  return (
    <CallsheetErrorState
      error={error}
      returnTo={location.href}
      onRetry={() =>
        router.invalidate({
          filter: (match) => match.routeId === '/app/callsheet',
        })
      }
    />
  )
}

function MyCallsheetPage() {
  const router = useRouter()
  return (
    <CallsheetPage
      {...Route.useLoaderData()}
      onResponded={() => router.invalidate()}
    />
  )
}
