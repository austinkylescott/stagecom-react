import {
  Outlet,
  createFileRoute,
  notFound,
  useRouterState,
} from '@tanstack/react-router'

import { ManagedEventsPage } from '@/features/events/components'
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
  const { events } = Route.useLoaderData()
  const activeRouteId = useRouterState({
    select: (state) => state.matches.at(-1)?.routeId,
  })

  if (activeRouteId !== Route.id) {
    return <Outlet />
  }

  return <ManagedEventsPage events={events} theaterSlug={theaterSlug} />
}
