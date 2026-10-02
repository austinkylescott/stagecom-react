import {
  getBearerTokenFromRequest,
  getCurrentUserFromRequest,
} from '@/server/auth/session'
import { appError, err, ok } from '@/server/errors'
import { createSupabaseAnonClient } from '@/server/supabase/client'

export async function teamClient() {
  const identity = await getCurrentUserFromRequest()
  if (!identity.ok) return identity
  const token = getBearerTokenFromRequest()
  if (!token) return err(appError('unauthenticated', 'Sign in is required.'))
  return ok(createSupabaseAnonClient(token))
}
export function teamError(error: { code: string; message: string }) {
  const code =
    error.code === '42501'
      ? 'forbidden'
      : error.code === 'P0002'
        ? 'not_found'
        : ['55000', '23505', '40001', '40P01'].includes(error.code)
          ? 'conflict'
          : ['22023', '23514', '22P02'].includes(error.code)
            ? 'validation_error'
            : 'external_service_error'
  return err(
    appError(
      code,
      code === 'external_service_error'
        ? 'Teams could not be saved. Your input is preserved; retry when connected.'
        : error.message,
    ),
  )
}
