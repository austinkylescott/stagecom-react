import { createFileRoute, notFound } from '@tanstack/react-router'

import { TheaterCalendar } from '@/features/theater-calendar/components'
import { getTheaterCalendarFn } from '@/features/theater-calendar/server-functions'
import { ScheduleBlocksPage } from '@/features/schedule-blocks/components'

export const Route = createFileRoute('/app/$theaterSlug/calendar')({
  loader: async ({ params }) => {
    const result = await getTheaterCalendarFn({ data: params })
    if (!result.ok) {
      if (result.error.code === 'not_found') throw notFound()
      throw result.error
    }
    return result.data
  },
  component: TheaterCalendarPage,
})

function TheaterCalendarPage() {
  const data = Route.useLoaderData()
  return (
    <>
      <TheaterCalendar entries={data.entries} theater={data.theater} />
      {data.scheduleBlocks ? (
        <ScheduleBlocksPage
          {...data.scheduleBlocks}
          initialBlocks={data.scheduleBlocks.scheduleBlocks}
        />
      ) : null}
    </>
  )
}
