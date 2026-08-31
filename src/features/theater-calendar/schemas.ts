import { z } from 'zod'

import { slugSchema } from '@/server/schemas'

export const theaterCalendarInputSchema = z.object({ theaterSlug: slugSchema })
