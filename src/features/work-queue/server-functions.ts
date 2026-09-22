import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { theaterSlugInputSchema } from '@/features/theaters/schemas'
import { getTheaterWorkQueue } from './queries'

export const getTheaterWorkQueueFn = createServerFn({ method: 'GET' })
  .validator(theaterSlugInputSchema)
  .handler(async ({ data }) => {
    setResponseHeader('Cache-Control', 'no-store')
    return getTheaterWorkQueue(data)
  })
