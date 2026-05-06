import { appError, err, ok } from '@/server/errors'
import { clearAuthCookies, setAuthCookies } from '@/server/auth/cookies'
import { getCurrentUserFromRequest } from '@/server/auth/session'
import { createSupabaseServiceRoleClient } from '@/server/supabase/client'

import type {
  authSessionInputSchema,
  updateDisplayNameInputSchema,
} from './schemas'
import type { z } from 'zod'

export async function setAuthSession(
  input: z.infer<typeof authSessionInputSchema>,
) {
  setAuthCookies({
    accessToken: input.accessToken,
    expiresAt: input.expiresAt,
    refreshToken: input.refreshToken,
  })

  return ok({ stored: true })
}

export async function clearAuthSession() {
  clearAuthCookies()

  return ok({ signedOut: true })
}

export async function updateDisplayName(
  input: z.infer<typeof updateDisplayNameInputSchema>,
) {
  const currentUser = await getCurrentUserFromRequest()

  if (!currentUser.ok) {
    return currentUser
  }

  const supabase = createSupabaseServiceRoleClient()
  const displayName = input.displayName.trim()
  const { error } = await supabase.from('profiles').upsert({
    id: currentUser.data.id,
    display_name: displayName,
  })

  if (error) {
    return err(
      appError('external_service_error', 'Profile could not be updated.'),
    )
  }

  return ok({ displayName })
}
