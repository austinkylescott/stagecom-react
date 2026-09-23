import {
  Outlet,
  createFileRoute,
  notFound,
  useRouterState,
} from '@tanstack/react-router'

import { PublicTheaterPage } from '@/features/first-slice/theater-page'
import {
  getPublishedTheaterBySlugFn,
  getPublishedTheaterEventsFn,
} from '@/features/theaters/server-functions'

export const Route = createFileRoute('/theater/$theaterSlug')({
  loader: async ({ params }) => {
    const result = await getPublishedTheaterBySlugFn({
      data: { theaterSlug: params.theaterSlug },
    })

    if (!result.ok) {
      if (result.error.code === 'not_found') {
        throw notFound()
      }

      throw result.error
    }

    const events = await getPublishedTheaterEventsFn({
      data: { theaterSlug: params.theaterSlug },
    })
    if (!events.ok) throw events.error
    return { ...result.data.theater, upcomingEvents: events.data.events }
  },
  component: PublicTheaterSlugLayout,
})

function PublicTheaterSlugLayout() {
  const theater = Route.useLoaderData()
  const activeRouteId = useRouterState({
    select: (state) => state.matches.at(-1)?.routeId,
  })

  if (activeRouteId === Route.id) {
    return <PublicTheaterPage mode="published" theater={theater} />
  }

  return <Outlet />
}
