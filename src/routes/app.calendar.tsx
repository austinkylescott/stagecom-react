import { createFileRoute } from '@tanstack/react-router'

import {
  PersonalCalendar,
  PersonalCalendarErrorState,
  PersonalCalendarLoadingState,
} from '@/features/personal-calendar/components'
import { getMyPersonalCalendarFn } from '@/features/personal-calendar/server-functions'

export const Route = createFileRoute('/app/calendar')({
  loader: async () => {
    const result = await getMyPersonalCalendarFn()
    if (!result.ok) throw result.error
    return result.data
  },
  component: PersonalCalendarPage,
  errorComponent: PersonalCalendarErrorState,
  pendingComponent: PersonalCalendarLoadingState,
})

function PersonalCalendarPage() {
  return <PersonalCalendar entries={Route.useLoaderData().entries} />
}
