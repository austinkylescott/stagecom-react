import { createFileRoute, notFound, useLocation } from '@tanstack/react-router'

import { calendarSearchSchema } from '@/features/theater-calendar/navigation'
import { CalendarReturnLink } from '@/features/theater-calendar/return-link'
import { ManagedEventWorkspace } from '@/features/events/components'
import {
  getEventPublicContentReadinessFn,
  getManagedEventWorkspaceFn,
} from '@/features/events/server-functions'

export const Route = createFileRoute('/app/$theaterSlug/events/$eventSlug')({
  validateSearch: (search) => calendarSearchSchema.parse(search),
  staleTime: 0,
  gcTime: 0,
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

  const context = Route.useSearch()
  const hash = useLocation({ select: (location) => location.hash })
  return (
    <>
      <CalendarReturnLink theaterSlug={data.theater.slug} context={context} />
      <ManagedEventWorkspace
        selectedOccurrenceId={
          hash.startsWith('occurrence-')
            ? hash.slice('occurrence-'.length)
            : undefined
        }
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
    </>
  )
}
