import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { theaterSlugInputSchema } from '@/features/theaters/schemas'
import { getTheaterOperations } from './queries'

export const getTheaterOperationsFn = createServerFn({ method: 'GET' })
  .validator(theaterSlugInputSchema)
  .handler(async ({ data }) => {
    setResponseHeader('Cache-Control', 'no-store')
    return getTheaterOperations(data)
  })
