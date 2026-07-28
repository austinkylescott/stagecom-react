import { createServerFn } from '@tanstack/react-start'

import { createManagedEvent, saveEventOperationalPlan } from './commands'
import {
  getEventCreationOptions,
  getManagedEventWorkspace,
  listManagedEvents,
} from './queries'
import {
  createManagedEventInputSchema,
  eventWorkspaceInputSchema,
  saveEventOperationalPlanInputSchema,
  theaterEventsInputSchema,
} from './schemas'

export const createManagedEventFn = createServerFn({ method: 'POST' })
  .validator(createManagedEventInputSchema)
  .handler(async ({ data }) => createManagedEvent(data))

export const getEventCreationOptionsFn = createServerFn({ method: 'GET' })
  .validator(theaterEventsInputSchema)
  .handler(async ({ data }) => getEventCreationOptions(data))

export const listManagedEventsFn = createServerFn({ method: 'GET' })
  .validator(theaterEventsInputSchema)
  .handler(async ({ data }) => listManagedEvents(data))

export const getManagedEventWorkspaceFn = createServerFn({ method: 'GET' })
  .validator(eventWorkspaceInputSchema)
  .handler(async ({ data }) => getManagedEventWorkspace(data))

export const saveEventOperationalPlanFn = createServerFn({ method: 'POST' })
  .validator(saveEventOperationalPlanInputSchema)
  .handler(async ({ data }) => saveEventOperationalPlan(data))
