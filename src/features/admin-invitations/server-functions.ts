import { createServerFn } from '@tanstack/react-start'

import {
  inviteTheaterAdmin,
  removeTheaterAdmin,
  respondToTheaterAdminInvitation,
} from './commands'
import {
  inviteTheaterAdminInputSchema,
  removeTheaterAdminInputSchema,
  respondToTheaterAdminInvitationInputSchema,
} from './schemas'

export const inviteTheaterAdminFn = createServerFn({ method: 'POST' })
  .validator(inviteTheaterAdminInputSchema)
  .handler(async ({ data }) => inviteTheaterAdmin(data))

export const respondToTheaterAdminInvitationFn = createServerFn({
  method: 'POST',
})
  .validator(respondToTheaterAdminInvitationInputSchema)
  .handler(async ({ data }) => respondToTheaterAdminInvitation(data))

export const removeTheaterAdminFn = createServerFn({ method: 'POST' })
  .validator(removeTheaterAdminInputSchema)
  .handler(async ({ data }) => removeTheaterAdmin(data))
