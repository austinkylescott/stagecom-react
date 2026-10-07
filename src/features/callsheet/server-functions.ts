import { createServerFn } from '@tanstack/react-start'

import { getMyCallsheet } from './queries'
import { getMyUpcomingCalls } from './upcoming-calls-query'

export const getMyCallsheetFn = createServerFn({ method: 'GET' }).handler(
  async () => getMyCallsheet(),
)

export const getMyUpcomingCallsFn = createServerFn({ method: 'GET' }).handler(
  async () => getMyUpcomingCalls(),
)
