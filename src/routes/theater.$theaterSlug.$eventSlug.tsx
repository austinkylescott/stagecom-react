import {
  PublicProgrammingPending,
  PublicProgrammingError,
  PublicProgrammingNotFound,
} from '@/features/public-programming/components'
import { createFileRoute, notFound } from '@tanstack/react-router'

import { PublishedEventPage } from '@/features/events/components'
import { getPublishedEventBySlugFn } from '@/features/events/server-functions'

export const Route = createFileRoute('/theater/$theaterSlug/$eventSlug')({
  staleTime: 0,
  gcTime: 0,
  pendingComponent: PublicProgrammingPending,
  errorComponent: PublicProgrammingError,
  notFoundComponent: PublicProgrammingNotFound,
  loader: async ({ params }) => {
    const result = await getPublishedEventBySlugFn({
      data: {
        eventSlug: params.eventSlug,
        theaterSlug: params.theaterSlug,
      },
    })

    if (!result.ok) {
      if (result.error.code === 'not_found') throw notFound()
      throw result.error
    }

    return result.data
  },
  component: PublicEventRoute,
})

function PublicEventRoute() {
  const data = Route.useLoaderData()
  return (
    <PublishedEventPage
      content={data.content}
      event={data.event}
      theater={data.theater}
    />
  )
}
