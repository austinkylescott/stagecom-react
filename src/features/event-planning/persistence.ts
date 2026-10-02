import {
  getBearerTokenFromRequest,
  getCurrentUserFromRequest,
} from '@/server/auth/session'
import { z } from 'zod'
import { appError, err, ok } from '@/server/errors'
import { createSupabaseAnonClient } from '@/server/supabase/client'

export async function planningClient() {
  const identity = await getCurrentUserFromRequest()
  if (!identity.ok) return identity
  const token = getBearerTokenFromRequest()
  if (!token) return err(appError('unauthenticated', 'Sign in is required.'))
  return ok(createSupabaseAnonClient(token))
}
export function planningError(error: {
  code: string
  message: string
  details?: string
}) {
  const code =
    error.code === '42501'
      ? 'forbidden'
      : error.code === 'P0002'
        ? 'not_found'
        : ['55000', '23505', '23P01', '40001', '40P01'].includes(error.code)
          ? 'conflict'
          : ['22023', '23514', '22P02'].includes(error.code)
            ? 'validation_error'
            : 'external_service_error'
  let details: z.infer<ReturnType<typeof z.json>> | undefined
  try {
    details = z.json().parse(JSON.parse(error.details ?? 'null'))
  } catch {
    details = undefined
  }
  return err(
    appError(
      code,
      code === 'external_service_error'
        ? 'Planning could not be saved. Your input is preserved; retry when connected.'
        : error.message,
      details,
    ),
  )
}
