import { createFileRoute, notFound } from '@tanstack/react-router'

import { TheaterGovernanceSettings } from '@/features/governance/components'
import { getTheaterGovernanceFn } from '@/features/governance/server-functions'
import { TheaterSetupPage } from '@/features/theaters/components'
import { getTheaterPreviewFn } from '@/features/theaters/server-functions'

export const Route = createFileRoute('/app/$theaterSlug/settings')({
  loader: async ({ params }) => {
    const [result, governance] = await Promise.all([
      getTheaterPreviewFn({ data: { theaterSlug: params.theaterSlug } }),
      getTheaterGovernanceFn({ data: { theaterSlug: params.theaterSlug } }),
    ])

    if (!result.ok) {
      if (result.error.code === 'not_found') {
        throw notFound()
      }

      throw result.error
    }

    if (!governance.ok) {
      if (governance.error.code === 'not_found') {
        throw notFound()
      }

      throw governance.error
    }

    return { ...result.data, governance: governance.data }
  },
  component: TheaterSettingsPage,
})

function TheaterSettingsPage() {
  const { theater: workspaceTheater } = Route.useRouteContext()
  const { governance, theater, timezone } = Route.useLoaderData()

  return (
    <>
      <TheaterSetupPage
        initialTheater={theater}
        theaterId={workspaceTheater.id}
        timezone={timezone}
      />
      <TheaterGovernanceSettings initialData={governance} />
    </>
  )
}
