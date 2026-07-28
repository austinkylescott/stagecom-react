import { createServerFn } from '@tanstack/react-start'

import {
  createManagedEvent,
  inviteEventCastMember,
  respondToEventCastInvitation,
  saveEventOperationalPlan,
} from './commands'
import {
  getEventCreationOptions,
  getManagedEventWorkspace,
  listManagedEvents,
} from './queries'
import {
  createManagedEventInputSchema,
  eventWorkspaceInputSchema,
  inviteEventCastMemberInputSchema,
  respondToEventCastInvitationInputSchema,
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

export const inviteEventCastMemberFn = createServerFn({ method: 'POST' })
  .validator(inviteEventCastMemberInputSchema)
  .handler(async ({ data }) => inviteEventCastMember(data))

export const respondToEventCastInvitationFn = createServerFn({ method: 'POST' })
  .validator(respondToEventCastInvitationInputSchema)
  .handler(async ({ data }) => respondToEventCastInvitation(data))
