import {
  Outlet,
  createFileRoute,
  redirect,
  useRouterState,
} from '@tanstack/react-router'

import { TheaterNav } from '@/components/stage/app-nav'
import { RoutePlaceholder } from '@/components/stage/route-placeholder'
import { getTheaterMembershipFn } from '@/features/memberships/server-functions'

export const Route = createFileRoute('/app/$theaterSlug')({
  beforeLoad: async ({ params }) => {
    const membership = await getTheaterMembershipFn({
      data: { theaterSlug: params.theaterSlug },
    })

    if (!membership.ok) {
      throw redirect({
        to: '/app/callsheet',
      })
    }

    return membership.data
  },
  component: TheaterWorkspaceLayout,
})

function TheaterWorkspaceLayout() {
  const { theaterSlug } = Route.useParams()
  const { theater } = Route.useRouteContext()
  const activeRouteId = useRouterState({
    select: (state) => state.matches.at(-1)?.routeId,
  })

  if (activeRouteId === Route.id) {
    return (
      <>
        <TheaterNav theaterName={theater.name} theaterSlug={theaterSlug} />
        <RoutePlaceholder
          eyebrow="Theater workspace"
          title="Theater callsheet"
          description="Operator dashboard for theater activity, event work, and priority actions."
          details={[['Theater', theaterSlug]]}
        />
      </>
    )
  }

  return (
    <>
      <TheaterNav theaterName={theater.name} theaterSlug={theaterSlug} />
      <Outlet />
    </>
  )
}
