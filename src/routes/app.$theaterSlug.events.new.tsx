import { createFileRoute, notFound } from '@tanstack/react-router'

import { CreateManagedEventPage } from '@/features/events/components'
import { getEventCreationOptionsFn } from '@/features/events/server-functions'

export const Route = createFileRoute('/app/$theaterSlug/events/new')({
  loader: async ({ params }) => {
    const result = await getEventCreationOptionsFn({
      data: { theaterSlug: params.theaterSlug },
    })

    if (!result.ok) {
      if (result.error.code === 'not_found') throw notFound()
      throw result.error
    }

    return result.data
  },
  component: NewEventPage,
})

function NewEventPage() {
  return <CreateManagedEventPage {...Route.useLoaderData()} />
}
