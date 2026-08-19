import { createFileRoute } from '@tanstack/react-router'

import { TheaterHubPage } from '@/features/theaters/components'
import { WorkspaceLoadingState } from '@/features/application-shell/components'
import { getMyTheatersFn } from '@/features/theaters/server-functions'

export const Route = createFileRoute('/app/callsheet')({
  loader: async () => {
    const result = await getMyTheatersFn()

    if (!result.ok) {
      throw result.error
    }

    return result.data.theaters
  },
  pendingComponent: WorkspaceLoadingState,
  component: MyCallsheetPage,
})

function MyCallsheetPage() {
  return <TheaterHubPage theaters={Route.useLoaderData()} />
}
