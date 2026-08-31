import { createServerFn } from '@tanstack/react-start'

import { getMyPersonalCalendar } from './queries'

export const getMyPersonalCalendarFn = createServerFn({
  method: 'GET',
}).handler(async () => getMyPersonalCalendar())
