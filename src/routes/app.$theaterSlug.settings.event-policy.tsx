import { createFileRoute, notFound } from '@tanstack/react-router'

import { TheaterGovernanceSettings } from '@/features/governance/components'
import { SettingsSectionHeader } from '@/features/governance/settings-components'
import { getTheaterGovernanceFn } from '@/features/governance/server-functions'

export const Route = createFileRoute('/app/$theaterSlug/settings/event-policy')(
  {
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
    component: EventPolicySettingsPage,
  },
)

function EventPolicySettingsPage() {
  const { membership } = Route.useRouteContext()
  const governance = Route.useLoaderData()

  return (
    <>
      <SettingsSectionHeader
        description="Set the policies that govern Event proposals and review."
        title="Event Policy"
      />
      <TheaterGovernanceSettings
        canManageOwnerSelfApproval={membership.roles.includes('owner')}
        initialData={governance}
        section="event-policy"
      />
    </>
  )
}
