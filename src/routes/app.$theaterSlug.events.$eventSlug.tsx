import { createFileRoute, notFound } from '@tanstack/react-router'

import { ManagedEventWorkspace } from '@/features/events/components'
import {
  getEventPublicContentReadinessFn,
  getManagedEventWorkspaceFn,
} from '@/features/events/server-functions'

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

    const publicContentResult =
      result.data.view === 'operational'
        ? await getEventPublicContentReadinessFn({
            data: {
              eventSlug: params.eventSlug,
              theaterSlug: params.theaterSlug,
            },
          })
        : null

    if (publicContentResult && !publicContentResult.ok) {
      throw publicContentResult.error
    }

    return {
      ...result.data,
      publicContent: publicContentResult?.data ?? null,
    }
  },
  component: EventWorkspacePage,
})

function EventWorkspacePage() {
  const data = Route.useLoaderData()

  return (
    <ManagedEventWorkspace
      activeMembers={data.activeMembers}
      actorUserId={data.actorUserId}
      allowedActions={data.allowedActions}
      event={data.event}
      history={data.history}
      overview={data.overview}
      proposalPreparation={data.proposalPreparation}
      publicContent={data.publicContent}
      theater={data.theater}
      view={data.view}
    />
  )
}
