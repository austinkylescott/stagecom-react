import { createFileRoute, notFound } from '@tanstack/react-router'

import { ManagedEventWorkspace } from '@/features/events/components'
import { getManagedEventWorkspaceFn } from '@/features/events/server-functions'

export const Route = createFileRoute('/app/$theaterSlug/events/$eventSlug')({
  loader: async ({ params }) => {
    const result = await getManagedEventWorkspaceFn({
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
  component: EventWorkspacePage,
})

function EventWorkspacePage() {
  return <ManagedEventWorkspace event={Route.useLoaderData().event} />
}
