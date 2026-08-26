import { createFileRoute, notFound } from '@tanstack/react-router'

import { TheaterGovernanceSettings } from '@/features/governance/components'
import { SettingsSectionHeader } from '@/features/governance/settings-components'
import { getTheaterGovernanceFn } from '@/features/governance/server-functions'

export const Route = createFileRoute(
  '/app/$theaterSlug/settings/venue-calendar',
)({
  loader: async ({ params }) => {
    const result = await getTheaterGovernanceFn({
      data: { theaterSlug: params.theaterSlug },
    })
    if (!result.ok) {
      if (result.error.code === 'not_found') throw notFound()
      throw result.error
    }
    return result.data
  },
  component: VenueCalendarSettingsPage,
})

function VenueCalendarSettingsPage() {
  const governance = Route.useLoaderData()

  return (
    <>
      <SettingsSectionHeader
        description="Name the Primary Venue and reserve the setup and turnover time its Calendar needs."
        title="Venue & Calendar"
      />
      <TheaterGovernanceSettings
        canManageOwnerSelfApproval={false}
        initialData={governance}
        section="venue-calendar"
      />
    </>
  )
}
