import { createFileRoute, useRouter } from '@tanstack/react-router'

import { CallsheetPage } from '@/features/callsheet/components'
import { getMyCallsheetFn } from '@/features/callsheet/server-functions'
import { WorkspaceLoadingState } from '@/features/application-shell/components'

export const Route = createFileRoute('/app/callsheet')({
  loader: async () => {
    const result = await getMyCallsheetFn()

    if (!result.ok) {
      throw result.error
    }

    return result.data
  },
  pendingComponent: WorkspaceLoadingState,
  component: MyCallsheetPage,
})

function MyCallsheetPage() {
  const router = useRouter()
  return (
    <CallsheetPage
      {...Route.useLoaderData()}
      onResponded={() => router.invalidate()}
    />
  )
}
