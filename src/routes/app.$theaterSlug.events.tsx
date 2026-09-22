import {
  Outlet,
  createFileRoute,
  notFound,
  useRouterState,
} from '@tanstack/react-router'

import { EventPortfolioPage } from '@/features/events/event-portfolio/components'
import { listManagedEventsFn } from '@/features/events/server-functions'

export const Route = createFileRoute('/app/$theaterSlug/events')({
  loader: async ({ params }) => {
    const result = await listManagedEventsFn({
      data: { theaterSlug: params.theaterSlug },
    })

    if (!result.ok) {
      if (result.error.code === 'not_found') throw notFound()
      throw result.error
    }

    return result.data
  },
  component: TheaterEventsPage,
})

function TheaterEventsPage() {
  const { theaterSlug } = Route.useParams()
  const { portfolio, canCreate, theater } = Route.useLoaderData()
  const activeRouteId = useRouterState({
    select: (state) => state.matches.at(-1)?.routeId,
  })

  if (activeRouteId !== Route.id) {
    return <Outlet />
  }

  return (
    <EventPortfolioPage
      portfolio={portfolio}
      theaterSlug={theaterSlug}
      timezone={theater.timezone ?? 'UTC'}
      canCreate={canCreate}
    />
  )
}
