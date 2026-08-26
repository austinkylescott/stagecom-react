import { createFileRoute } from '@tanstack/react-router'

import {
  OwnershipSecuritySettings,
  SettingsSectionHeader,
} from '@/features/governance/settings-components'
import { listTheaterMembersFn } from '@/features/memberships/server-functions'
import { appError } from '@/server/errors'

export const Route = createFileRoute(
  '/app/$theaterSlug/settings/ownership-security',
)({
  beforeLoad: ({ context }) => {
    if (!context.membership.roles.includes('owner')) {
      throw appError(
        'forbidden',
        'Only the current Owner may manage ownership.',
      )
    }
  },
  loader: async ({ context }) => {
    const result = await listTheaterMembersFn({
      data: { theaterId: context.theater.id },
    })
    if (!result.ok) throw result.error
    return result.data
  },
  component: OwnershipSecuritySettingsPage,
})

function OwnershipSecuritySettingsPage() {
  const { membership, theater } = Route.useRouteContext()
  const { members } = Route.useLoaderData()

  return (
    <>
      <SettingsSectionHeader
        description="Owner-only controls keep final Theater authority explicit and recoverable."
        title="Ownership & Security"
      />
      <OwnershipSecuritySettings
        currentOwnerId={membership.user_id}
        initialMembers={members}
        theaterId={theater.id}
      />
    </>
  )
}
