import { createServerFn } from '@tanstack/react-start'

import { inviteTheaterAdmin, respondToTheaterAdminInvitation } from './commands'
import {
  inviteTheaterAdminInputSchema,
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
