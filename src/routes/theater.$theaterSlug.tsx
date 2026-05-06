import {
  Outlet,
  createFileRoute,
  useRouterState,
} from '@tanstack/react-router'

import {
  PublicTheaterPage,
  getDemoTheater,
} from '@/features/first-slice/theater-page'

export const Route = createFileRoute('/theater/$theaterSlug')({
  component: PublicTheaterSlugLayout,
})

function PublicTheaterSlugLayout() {
  const { theaterSlug } = Route.useParams()
  const activeRouteId = useRouterState({
    select: (state) => state.matches.at(-1)?.routeId,
  })

  if (activeRouteId === Route.id) {
    return (
      <PublicTheaterPage
        mode="published"
        theater={getDemoTheater(theaterSlug)}
      />
    )
  }

  return <Outlet />
}
