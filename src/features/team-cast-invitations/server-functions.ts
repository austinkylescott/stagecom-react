import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { reviewTeamCastInvitations, sendTeamCastInvitations } from './commands'
import { getCastTeamOptions } from './queries'
import {
  optionsInputSchema,
  reviewInputSchema,
  sendInputSchema,
} from './schemas'

export const getCastTeamOptionsFn = createServerFn({ method: 'GET' })
  .validator(optionsInputSchema)
  .handler(({ data }) => {
    setResponseHeader('Cache-Control', 'no-store')
    return getCastTeamOptions(data)
  })
export const reviewTeamCastInvitationsFn = createServerFn({ method: 'POST' })
  .validator(reviewInputSchema)
  .handler(({ data }) => reviewTeamCastInvitations(data))
export const sendTeamCastInvitationsFn = createServerFn({ method: 'POST' })
  .validator(sendInputSchema)
  .handler(({ data }) => sendTeamCastInvitations(data))
