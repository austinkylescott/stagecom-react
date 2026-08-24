import { getBearerTokenFromRequest } from '@/server/auth/session'
import { appError } from '@/server/errors'
import { createSupabaseAnonClient } from '@/server/supabase/client'

import type { NotificationCommandDependencies } from './commands'

export function createSupabaseNotificationPersistence(): NotificationCommandDependencies['persistence'] {
  return {
    async canControlAttention({ notificationId, userId }) {
      const token = getBearerTokenFromRequest()
      if (!token) throw appError('unauthenticated', 'Sign in is required.')

      const supabase = createSupabaseAnonClient(token)
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('id', notificationId)
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        throw appError(
          'external_service_error',
          'Notification could not be authorized.',
        )
      }

      return Boolean(data)
    },
    async setAttention({ action, notificationId }) {
      const token = getBearerTokenFromRequest()
      if (!token) throw appError('unauthenticated', 'Sign in is required.')

      const supabase = createSupabaseAnonClient(token)
      const { data, error } = await supabase
        .rpc('set_notification_attention', {
          p_action: action,
          p_notification_id: notificationId,
        })
        .maybeSingle()

      if (error) {
        throw appError(
          'external_service_error',
          'Notification could not be updated.',
        )
      }

      return data
        ? {
            dismissedAt: data.dismissed_at,
            id: data.id,
            readAt: data.read_at,
          }
        : null
    },
  }
}
