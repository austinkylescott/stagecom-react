import { createServerFn } from '@tanstack/react-start'

import { dismissNotification, markNotificationRead } from './commands'
import { getMyNotifications } from './queries'
import { notificationAttentionInputSchema } from './schemas'

export const getMyNotificationsFn = createServerFn({ method: 'GET' }).handler(
  async () => getMyNotifications(),
)

export const markNotificationReadFn = createServerFn({ method: 'POST' })
  .validator(notificationAttentionInputSchema)
  .handler(async ({ data }) => markNotificationRead(data))

export const dismissNotificationFn = createServerFn({ method: 'POST' })
  .validator(notificationAttentionInputSchema)
  .handler(async ({ data }) => dismissNotification(data))
