import { z } from 'zod'

import { slugSchema } from '@/server/schemas'

export const getTheaterMembershipInputSchema = z.object({
  theaterSlug: slugSchema,
})
