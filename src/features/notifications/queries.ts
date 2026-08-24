import {
  getBearerTokenFromRequest,
  getCurrentUserFromRequest,
} from '@/server/auth/session'
import { appError, err, ok } from '@/server/errors'
import { createSupabaseAnonClient } from '@/server/supabase/client'

import { createNotificationInboxReadModel } from './read-model'

export async function getMyNotifications() {
  const currentUser = await getCurrentUserFromRequest()
  if (!currentUser.ok) return currentUser

  const token = getBearerTokenFromRequest()
  if (!token) return err(appError('unauthenticated', 'Sign in is required.'))

  const userSupabase = createSupabaseAnonClient(token)
  const [notificationResult, membershipResult] = await Promise.all([
    userSupabase
      .from('notifications')
      .select(
        'id, type, entity_type, entity_id, payload, read_at, dismissed_at, created_at',
      )
      .eq('user_id', currentUser.data.id)
      .order('created_at', { ascending: false }),
    userSupabase
      .from('theater_memberships')
      .select('theater_id, theaters!inner(name, slug)')
      .eq('user_id', currentUser.data.id)
      .eq('status', 'active'),
  ])

  if (notificationResult.error || membershipResult.error) {
    return err(
      appError('external_service_error', 'Notifications could not be loaded.'),
    )
  }

  const notifications = notificationResult.data
  const eventIds = [...new Set(notifications.flatMap(notificationEventId))]
  const eventResult = eventIds.length
    ? await userSupabase
        .from('shows')
        .select('id, theater_id, title, slug')
        .in('id', eventIds)
    : { data: [], error: null }

  if (eventResult.error) {
    return err(
      appError('external_service_error', 'Notifications could not be loaded.'),
    )
  }

  const eventById = new Map(eventResult.data.map((event) => [event.id, event]))
  const activeTheaterById = new Map(
    membershipResult.data.map((membership) => [
      membership.theater_id,
      membership.theaters,
    ]),
  )

  return ok(
    createNotificationInboxReadModel({
      notifications: notifications.map((notification) => {
        const eventId = notificationEventId(notification)[0]
        const event = eventId ? eventById.get(eventId) : undefined
        const theaterId =
          event?.theater_id ?? payloadString(notification.payload, 'theaterId')
        const activeTheater = theaterId
          ? activeTheaterById.get(theaterId)
          : undefined
        const destination =
          event && activeTheater
            ? `/app/${activeTheater.slug}/events/${event.slug}`
            : undefined

        return {
          context: {
            ...(destination ? { destination } : {}),
            ...(event ? { eventTitle: event.title } : {}),
            ...(activeTheater ? { theaterName: activeTheater.name } : {}),
          },
          createdAt: notification.created_at,
          dismissedAt: notification.dismissed_at,
          id: notification.id,
          readAt: notification.read_at,
          type: notification.type,
        }
      }),
    }),
  )
}

function notificationEventId(notification: {
  entity_id: string
  entity_type: string
  payload: unknown
}) {
  const payloadEventId = payloadString(notification.payload, 'eventId')
  if (payloadEventId) return [payloadEventId]
  return notification.entity_type === 'show' ? [notification.entity_id] : []
}

function payloadString(payload: unknown, key: string) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return undefined
  }

  const value = (payload as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : undefined
}
