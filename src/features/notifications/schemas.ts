import { z } from 'zod'

import { uuidSchema } from '@/server/schemas'

export const notificationAttentionInputSchema = z.object({
  notificationId: uuidSchema,
})
