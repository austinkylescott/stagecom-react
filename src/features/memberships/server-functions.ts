import { createServerFn } from '@tanstack/react-start'

import { acceptTheaterInvite } from './commands'
import { getTheaterMembership } from './queries'
import {
  acceptTheaterInviteInputSchema,
  getTheaterMembershipInputSchema,
} from './schemas'

export const acceptTheaterInviteFn = createServerFn({ method: 'POST' })
  .validator(acceptTheaterInviteInputSchema)
  .handler(async ({ data }) => acceptTheaterInvite(data))

export const getTheaterMembershipFn = createServerFn({ method: 'GET' })
  .validator(getTheaterMembershipInputSchema)
  .handler(async ({ data }) => getTheaterMembership(data))
