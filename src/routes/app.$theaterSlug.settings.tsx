import { createFileRoute, notFound } from '@tanstack/react-router'

import { TheaterSetupPage } from '@/features/theaters/components'
import { getTheaterPreviewFn } from '@/features/theaters/server-functions'

export const Route = createFileRoute('/app/$theaterSlug/settings')({
  loader: async ({ params }) => {
    const result = await getTheaterPreviewFn({
      data: { theaterSlug: params.theaterSlug },
    })

    if (!result.ok) {
      if (result.error.code === 'not_found') {
        throw notFound()
      }

      throw result.error
    }

    return result.data
  },
  component: TheaterSettingsPage,
})

function TheaterSettingsPage() {
  const { theater: workspaceTheater } = Route.useRouteContext()
  const { theater, timezone } = Route.useLoaderData()

  return (
    <TheaterSetupPage
      initialTheater={theater}
      theaterId={workspaceTheater.id}
      timezone={timezone}
    />
  )
}
