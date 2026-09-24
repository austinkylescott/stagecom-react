import { getRequestHeader } from '@tanstack/react-start/server'

import { appError, err, ok } from '../errors'
import { createSupabaseAnonClient } from '../supabase/client'
import { getAuthAccessTokenCookie } from './cookies'

import type { User } from '@supabase/supabase-js'
import type { AppResult } from '../errors'

export type CurrentSessionUser = Pick<
  User,
  'id' | 'email' | 'app_metadata' | 'user_metadata'
>

export function getBearerTokenFromRequest(): string | null {
  const header = getRequestHeader('authorization')

  if (!header?.startsWith('Bearer ')) {
    return getAuthAccessTokenCookie() ?? null
  }

  return header.slice('Bearer '.length).trim() || null
}

export async function getCurrentUserFromRequest(): Promise<
  AppResult<CurrentSessionUser>
> {
  const token = getBearerTokenFromRequest()

  if (!token) {
    return err(appError('unauthenticated', 'Sign in is required.'))
  }

  return getCurrentUserFromToken(token)
}

export async function getCurrentUserFromToken(
  token: string,
): Promise<AppResult<CurrentSessionUser>> {
  if (!token) {
    return err(appError('unauthenticated', 'Sign in is required.'))
  }

  const supabase = createSupabaseAnonClient(token)
  const { data, error } = await supabase.auth.getUser(token)

  if (error) {
    return err(appError('unauthenticated', 'Sign in is required.'))
  }

  return ok({
    id: data.user.id,
    email: data.user.email,
    app_metadata: data.user.app_metadata,
    user_metadata: data.user.user_metadata,
  })
}
