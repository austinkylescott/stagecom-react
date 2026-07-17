import { createServerFn } from '@tanstack/react-start'

import { setTheaterMemberCapability, updateTheaterGovernance } from './commands'
import { getTheaterGovernance } from './queries'
import {
  setTheaterMemberCapabilityInputSchema,
  theaterGovernanceInputSchema,
  updateTheaterGovernanceInputSchema,
} from './schemas'

export const updateTheaterGovernanceFn = createServerFn({ method: 'POST' })
  .validator(updateTheaterGovernanceInputSchema)
  .handler(async ({ data }) => updateTheaterGovernance(data))

export const setTheaterMemberCapabilityFn = createServerFn({ method: 'POST' })
  .validator(setTheaterMemberCapabilityInputSchema)
  .handler(async ({ data }) => setTheaterMemberCapability(data))

export const getTheaterGovernanceFn = createServerFn({ method: 'GET' })
  .validator(theaterGovernanceInputSchema)
  .handler(async ({ data }) => getTheaterGovernance(data))
