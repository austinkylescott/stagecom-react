import { createFileRoute, notFound, useRouter } from '@tanstack/react-router'

import { CalendarErrorState } from '@/features/theater-calendar/error-state'
import { TheaterCalendar } from '@/features/theater-calendar/components'
import { getTheaterCalendarFn } from '@/features/theater-calendar/server-functions'
import { calendarSearchSchema } from '@/features/theater-calendar/navigation'
import { ScheduleBlocksPage } from '@/features/schedule-blocks/components'

export const Route = createFileRoute('/app/$theaterSlug/calendar')({
  validateSearch: (search) => calendarSearchSchema.parse(search),
  loader: async ({ params }) => {
    const result = await getTheaterCalendarFn({ data: params })
    if (!result.ok) {
      if (result.error.code === 'not_found') throw notFound()
      throw result.error
    }
    return result.data
  },
  errorComponent: ({ error }) => <CalendarErrorState error={error} />,
  component: TheaterCalendarPage,
})

function TheaterCalendarPage() {
  const data = Route.useLoaderData()
  const context = Route.useSearch()
  const navigate = Route.useNavigate()
  const router = useRouter()
  return (
    <>
      <TheaterCalendar
        entries={data.entries}
        theater={data.theater}
        context={context}
        onContextChange={(search) => {
          void navigate({ search, hash: '' })
        }}
        onOpenEvent={(entry, search) => {
          if (!entry.event) return
          const calendar = router.buildLocation({
            to: '/app/$theaterSlug/calendar',
            params: { theaterSlug: data.theater.slug },
            search,
          })
          router.history.replace(calendar.href, router.history.location.state)
          void router.navigate({
            to: '/app/$theaterSlug/events/$eventSlug',
            params: {
              theaterSlug: data.theater.slug,
              eventSlug: entry.event.slug,
            },
            search,
            hash: entry.occurrenceId
              ? `occurrence-${entry.occurrenceId}`
              : undefined,
          })
        }}
      />
      {data.scheduleBlocks ? (
        <ScheduleBlocksPage
          {...data.scheduleBlocks}
          initialBlocks={data.scheduleBlocks.scheduleBlocks}
        />
      ) : null}
    </>
  )
}
