import { createServerFn } from '@tanstack/react-start'

import { getTheaterCalendar } from './queries'
import { theaterCalendarInputSchema } from './schemas'

export const getTheaterCalendarFn = createServerFn({ method: 'GET' })
  .validator(theaterCalendarInputSchema)
  .handler(({ data }) => getTheaterCalendar(data))
