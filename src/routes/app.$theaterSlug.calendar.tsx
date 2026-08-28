import { createFileRoute, notFound } from '@tanstack/react-router'

import { ScheduleBlocksPage } from '@/features/schedule-blocks/components'
import { getTheaterScheduleBlocksFn } from '@/features/schedule-blocks/server-functions'

export const Route = createFileRoute('/app/$theaterSlug/calendar')({
  loader: async ({ params }) => {
    const result = await getTheaterScheduleBlocksFn({ data: params })
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
  return <ScheduleBlocksPage {...data} initialBlocks={data.scheduleBlocks} />
}
