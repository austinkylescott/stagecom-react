import { getCurrentUserFromRequest } from '@/server/auth/session'
import { appError, err, ok, toAppError, type AppResult } from '@/server/errors'

import { createSupabaseNotificationPersistence } from './persistence'

export type NotificationAttentionAction = 'dismiss' | 'read'

export type NotificationCommandDependencies = {
  getCurrentUser: () => Promise<AppResult<{ id: string }>>
  persistence: {
    canControlAttention: (input: {
      notificationId: string
      userId: string
    }) => Promise<boolean>
    setAttention: (input: {
      action: NotificationAttentionAction
      notificationId: string
      userId: string
    }) => Promise<{
      dismissedAt: string | null
      id: string
      readAt: string | null
    } | null>
  }
}

export async function markNotificationRead(
  input: { notificationId: string },
  dependencies: NotificationCommandDependencies = getDefaultDependencies(),
) {
  return setNotificationAttention('read', input, dependencies)
}

export async function dismissNotification(
  input: { notificationId: string },
  dependencies: NotificationCommandDependencies = getDefaultDependencies(),
) {
  return setNotificationAttention('dismiss', input, dependencies)
}

async function setNotificationAttention(
  action: NotificationAttentionAction,
  input: { notificationId: string },
  dependencies: NotificationCommandDependencies,
) {
  const currentUser = await dependencies.getCurrentUser()
  if (!currentUser.ok) return currentUser

  try {
    const canControlAttention =
      await dependencies.persistence.canControlAttention({
        notificationId: input.notificationId,
        userId: currentUser.data.id,
      })
    if (!canControlAttention) {
      return err(appError('not_found', 'Notification was not found.'))
    }

    const notification = await dependencies.persistence.setAttention({
      action,
      notificationId: input.notificationId,
      userId: currentUser.data.id,
    })

    if (!notification) {
      return err(appError('not_found', 'Notification was not found.'))
    }

    return ok(notification)
  } catch (error) {
    return err(toAppError(error))
  }
}

function getDefaultDependencies(): NotificationCommandDependencies {
  return {
    getCurrentUser: getCurrentUserFromRequest,
    persistence: createSupabaseNotificationPersistence(),
  }
}
