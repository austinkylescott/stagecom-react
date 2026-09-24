import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { theaterSlugInputSchema } from '@/features/theaters/schemas'
import { getBearerTokenFromRequest } from '@/server/auth/session'
import { appError, err } from '@/server/errors'
import { getTheaterWorkQueue } from './queries'

export const getTheaterWorkQueueFn = createServerFn({ method: 'GET' })
  .validator(theaterSlugInputSchema)
  .handler(async ({ data }) => {
    setResponseHeader('Cache-Control', 'no-store')
    const accessToken = getBearerTokenFromRequest()
    if (!accessToken)
      return err(appError('unauthenticated', 'Sign in is required.'))
    return getTheaterWorkQueue(data, {
      accessToken,
      mode: 'decisions_and_exceptions',
    })
  })
