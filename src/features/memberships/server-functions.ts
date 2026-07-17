import { createServerFn } from '@tanstack/react-start'

import { getTheaterMembership } from './queries'
import { getTheaterMembershipInputSchema } from './schemas'

export const getTheaterMembershipFn = createServerFn({ method: 'GET' })
  .validator(getTheaterMembershipInputSchema)
  .handler(async ({ data }) => getTheaterMembership(data))
