import { createFileRoute } from '@tanstack/react-router'

import { TheaterHubPage } from '@/features/theaters/components'
import { getMyTheatersFn } from '@/features/theaters/server-functions'

export const Route = createFileRoute('/app/callsheet')({
  loader: async () => {
    const result = await getMyTheatersFn()

    if (!result.ok) {
      throw result.error
    }

    return result.data.theaters
  },
  component: MyCallsheetPage,
})

function MyCallsheetPage() {
  return <TheaterHubPage theaters={Route.useLoaderData()} />
}
