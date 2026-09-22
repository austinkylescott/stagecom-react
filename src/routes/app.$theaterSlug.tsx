import { Outlet, createFileRoute } from '@tanstack/react-router'

import { TheaterNav } from '@/components/stage/app-nav'
import { getTheaterMembershipFn } from '@/features/memberships/server-functions'

export const Route = createFileRoute('/app/$theaterSlug')({
  beforeLoad: async ({ params }) => {
    const membership = await getTheaterMembershipFn({
      data: { theaterSlug: params.theaterSlug },
    })

    if (!membership.ok) {
      throw membership.error
    }

    return membership.data
  },
  component: TheaterWorkspaceLayout,
})

function TheaterWorkspaceLayout() {
  const { theaterSlug } = Route.useParams()
  const { membership, theater } = Route.useRouteContext()

  return (
    <>
      <TheaterNav
        roles={membership.roles}
        theaterName={theater.name}
        theaterSlug={theaterSlug}
      />
      <Outlet />
    </>
  )
}
