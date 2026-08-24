export type NotificationInboxInput = {
  context: {
    destination?: string
    eventTitle?: string
    theaterName?: string
  }
  createdAt: string
  dismissedAt: string | null
  id: string
  readAt: string | null
  type: string
}

export type InboxNotification = NotificationInboxInput & {
  destination?: string
  description: string
  state: 'dismissed' | 'read' | 'unread'
  title: string
}

export function createNotificationInboxReadModel({
  notifications,
}: {
  notifications: NotificationInboxInput[]
}) {
  const ordered = notifications
    .map((notification) => ({
      ...notification,
      ...(notification.context.destination
        ? { destination: notification.context.destination }
        : {}),
      description: notificationDescription(notification),
      state: notificationState(notification),
      title: notificationTitle(notification.type),
    }))
    .sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        left.id.localeCompare(right.id),
    )

  return {
    attention: ordered.filter(
      (notification) => notification.state !== 'dismissed',
    ),
    dismissed: ordered.filter(
      (notification) => notification.state === 'dismissed',
    ),
  }
}

function notificationDescription(notification: NotificationInboxInput) {
  return [notification.context.eventTitle, notification.context.theaterName]
    .filter((value): value is string => Boolean(value))
    .join(' · ')
}

function notificationState(
  notification: NotificationInboxInput,
): InboxNotification['state'] {
  if (notification.dismissedAt) return 'dismissed'
  return notification.readAt ? 'read' : 'unread'
}

function notificationTitle(type: string) {
  return (
    {
      'event.cancelled': 'Event cancelled',
      'event.cast.invited': 'Cast invitation',
      'event.counteroffer.availability_requested':
        'Availability response requested',
      'event.operational_health.at_risk': 'Event at risk',
      'event.proposal_counteroffer.expiring_soon': 'Counteroffer expiring soon',
      'event.proposal_counteroffer.issued': 'Counteroffer issued',
      'event.proposal_revision.approved': 'Proposal approved',
      'event.proposal_revision.changes_requested': 'Proposal changes requested',
      'event.proposal_revision.denied': 'Proposal denied',
      'event.proposal_revision.owner_override_approved': 'Proposal approved',
      'event.published': 'Event published',
      'theater.membership.deactivated': 'Theater membership ended',
    }[type] ?? 'Event update'
  )
}
