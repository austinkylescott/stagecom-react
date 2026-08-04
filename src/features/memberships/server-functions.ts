import { createServerFn } from '@tanstack/react-start'

import { deactivateTheaterMembership } from './commands'
import { getTheaterMembership, listTheaterMembers } from './queries'
import {
  deactivateTheaterMembershipInputSchema,
  getTheaterMembershipInputSchema,
  listTheaterMembersInputSchema,
} from './schemas'

export const getTheaterMembershipFn = createServerFn({ method: 'GET' })
  .validator(getTheaterMembershipInputSchema)
  .handler(async ({ data }) => getTheaterMembership(data))

export const listTheaterMembersFn = createServerFn({ method: 'GET' })
  .validator(listTheaterMembersInputSchema)
  .handler(async ({ data }) => listTheaterMembers(data))

export const deactivateTheaterMembershipFn = createServerFn({ method: 'POST' })
  .validator(deactivateTheaterMembershipInputSchema)
  .handler(async ({ data }) => deactivateTheaterMembership(data))
