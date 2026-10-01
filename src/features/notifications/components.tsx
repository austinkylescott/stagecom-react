import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useState } from 'react'

import {
  dismissNotificationFn,
  markNotificationReadFn,
} from './server-functions'

import type { InboxNotification } from './read-model'

type NotificationInbox = {
  attention: InboxNotification[]
  dismissed: InboxNotification[]
}

export function NotificationInboxPage({
  attention: initialAttention,
  dismissed: initialDismissed,
}: NotificationInbox) {
  const [attention, setAttention] = useState(initialAttention)
  const [dismissed, setDismissed] = useState(initialDismissed)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function markRead(notification: InboxNotification) {
    setError(null)
    setPendingId(notification.id)
    try {
      const result = await markNotificationReadFn({
        data: { notificationId: notification.id },
      })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setAttention((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, readAt: result.data.readAt, state: 'read' }
            : item,
        ),
      )
    } finally {
      setPendingId(null)
    }
  }

  async function dismiss(notification: InboxNotification) {
    setError(null)
    setPendingId(notification.id)
    try {
      const result = await dismissNotificationFn({
        data: { notificationId: notification.id },
      })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setAttention((current) =>
        current.filter((item) => item.id !== notification.id),
      )
      setDismissed((current) => [
        {
          ...notification,
          dismissedAt: result.data.dismissedAt,
          readAt: result.data.readAt,
          state: 'dismissed',
        },
        ...current,
      ])
    } finally {
      setPendingId(null)
    }
  }

  return (
    <main className="page-wrap py-6">
      <header className="max-w-2xl">
        <p className="text-xs font-medium tracking-normal text-muted-foreground">
          Personal workspace
        </p>
        <h1 className="display-title mt-3 text-2xl font-medium text-foreground">
          Notifications
        </h1>
        <p className="mt-3 text-muted-foreground">
          Alerts from Event and Theater activity that matters to you.
        </p>
      </header>

      {error ? (
        <p
          className="mt-6 rounded-md border border-border bg-muted px-4 py-3 font-semibold text-foreground"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <section aria-labelledby="notification-attention" className="mt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2
            className="text-2xl font-semibold text-foreground"
            id="notification-attention"
          >
            Needs your attention
          </h2>
          <p className="text-sm font-semibold text-muted-foreground">
            {attention.length === 1 ? '1 alert' : `${attention.length} alerts`}
          </p>
        </div>
        {attention.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {attention.map((notification) => (
              <NotificationCard
                dismiss={() => dismiss(notification)}
                key={notification.id}
                markRead={() => markRead(notification)}
                notification={notification}
                pending={pendingId === notification.id}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-border px-5 py-6 text-muted-foreground">
            <p className="font-semibold">No active Notifications.</p>
            <p className="mt-1 text-sm">
              Dismissed alerts remain below for your history.
            </p>
          </div>
        )}
      </section>

      {dismissed.length > 0 ? (
        <section
          aria-labelledby="dismissed-notifications"
          className="mt-10 border-t border-border pt-8"
        >
          <h2
            className="text-xl font-semibold text-foreground"
            id="dismissed-notifications"
          >
            Dismissed Notifications
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            These alerts no longer demand your attention. Dismissing one never
            changes shared Event or Theater work.
          </p>
          <div className="mt-4 grid gap-3">
            {dismissed.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}

function NotificationCard({
  dismiss,
  markRead,
  notification,
  pending = false,
}: {
  dismiss?: () => Promise<void>
  markRead?: () => Promise<void>
  notification: InboxNotification
  pending?: boolean
}) {
  return (
    <Card className=" px-5 py-5 gap-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-normal text-muted-foreground">
            {notification.state === 'unread'
              ? 'Unread'
              : notification.state === 'read'
                ? 'Read'
                : 'Dismissed'}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">
            {notification.title}
          </h3>
          {notification.description ? (
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              {notification.description}
            </p>
          ) : null}
        </div>
        <time
          className="text-sm text-muted-foreground"
          dateTime={notification.createdAt}
        >
          {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(
            new Date(notification.createdAt),
          )}
        </time>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {notification.destination ? (
          <Button asChild variant="default">
            <a href={notification.destination}>Open Event</a>
          </Button>
        ) : null}
        {notification.state === 'unread' && markRead ? (
          <Button
            variant="outline"

            disabled={pending}
            onClick={markRead}
            type="button"
          >
            Mark read
          </Button>
        ) : null}
        {notification.state !== 'dismissed' && dismiss ? (
          <Button
            variant="outline"

            disabled={pending}
            onClick={dismiss}
            type="button"
          >
            Dismiss
          </Button>
        ) : null}
      </div>
    </Card>
  )
}
