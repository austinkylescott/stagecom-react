import {
  getBearerTokenFromRequest,
  getCurrentUserFromRequest,
} from '@/server/auth/session'
import { createSupabaseAnonClient } from '@/server/supabase/client'
import { appError, err, ok } from '@/server/errors'

export async function castReviewClient() {
  const identity = await getCurrentUserFromRequest()
  if (!identity.ok) return identity
  const token = getBearerTokenFromRequest()
  return token
    ? ok(createSupabaseAnonClient(token))
    : err(appError('unauthenticated', 'Sign in is required.'))
}
export function castReviewError(error: { code: string; message: string }) {
  const code =
    error.code === '42501'
      ? 'forbidden'
      : error.code === 'P0002'
        ? 'not_found'
        : ['55000', '23505', '40001', '40P01'].includes(error.code)
          ? 'conflict'
          : ['22023', '22P02', '23514'].includes(error.code)
            ? 'validation_error'
            : 'external_service_error'
  return err(
    appError(
      code,
      code === 'external_service_error'
        ? 'Cast invitations could not be saved. Your review is preserved; retry when connected.'
        : error.message,
    ),
  )
}
