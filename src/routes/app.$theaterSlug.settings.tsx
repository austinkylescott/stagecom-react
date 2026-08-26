import { Outlet, createFileRoute } from '@tanstack/react-router'

import { TheaterSettingsNavigation } from '@/features/governance/settings-components'
import { canManageTheater } from '@/features/theaters/permissions'
import { appError } from '@/server/errors'

export const Route = createFileRoute('/app/$theaterSlug/settings')({
  beforeLoad: ({ context }) => {
    if (!canManageTheater(context.membership.roles)) {
      throw appError('forbidden', 'Owner or Admin access is required.')
    }
  },
  component: TheaterSettingsLayout,
})

function TheaterSettingsLayout() {
  const { membership } = Route.useRouteContext()
  const { theaterSlug } = Route.useParams()

  return (
    <>
      <div className="page-wrap">
        <TheaterSettingsNavigation
          roles={membership.roles}
          theaterSlug={theaterSlug}
        />
      </div>
      <Outlet />
    </>
  )
}
