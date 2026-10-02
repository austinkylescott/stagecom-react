import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { managePlanning } from './commands'
import { getPlanning } from './queries'
import { planningCommandSchema, readPlanningSchema } from './schemas'

export const getPlanningFn = createServerFn({ method: 'GET' })
  .validator(readPlanningSchema)
  .handler(({ data }) => {
    setResponseHeader('Cache-Control', 'no-store')
    return getPlanning(data.eventId)
  })
export const managePlanningFn = createServerFn({ method: 'POST' })
  .validator(planningCommandSchema)
  .handler(({ data }) => managePlanning(data))
