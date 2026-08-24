import { createFileRoute } from '@tanstack/react-router'

import { NotificationInboxPage } from '@/features/notifications/components'
import { getMyNotificationsFn } from '@/features/notifications/server-functions'

export const Route = createFileRoute('/app/notifications')({
  loader: async () => {
    const result = await getMyNotificationsFn()
    if (!result.ok) throw result.error
    return result.data
  },
  component: NotificationsPage,
})

function NotificationsPage() {
  return <NotificationInboxPage {...Route.useLoaderData()} />
}
