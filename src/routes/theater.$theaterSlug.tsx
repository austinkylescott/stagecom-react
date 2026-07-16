import {
  Outlet,
  createFileRoute,
  notFound,
  useRouterState,
} from '@tanstack/react-router'

import { PublicTheaterPage } from '@/features/first-slice/theater-page'
import { getPublishedTheaterBySlugFn } from '@/features/theaters/server-functions'

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

    return result.data.theater
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
