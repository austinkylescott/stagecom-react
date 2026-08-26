import { createFileRoute, notFound } from '@tanstack/react-router'

import { SettingsSectionHeader } from '@/features/governance/settings-components'
import { TheaterSetupPage } from '@/features/theaters/components'
import { getTheaterPreviewFn } from '@/features/theaters/server-functions'

export const Route = createFileRoute(
  '/app/$theaterSlug/settings/public-presence',
)({
  loader: async ({ params }) => {
    const result = await getTheaterPreviewFn({
      data: { theaterSlug: params.theaterSlug },
    })
    if (!result.ok) {
      if (result.error.code === 'not_found') throw notFound()
      throw result.error
    }
    return result.data
  },
  component: PublicPresenceSettingsPage,
})

function PublicPresenceSettingsPage() {
  const { theater: workspaceTheater } = Route.useRouteContext()
  const { theater, timezone } = Route.useLoaderData()

  return (
    <>
      <SettingsSectionHeader
        description="Update the public identity and location visitors see for this Theater."
        title="Public Presence"
      />
      <TheaterSetupPage
        initialTheater={theater}
        theaterId={workspaceTheater.id}
        timezone={timezone}
      />
    </>
  )
}
