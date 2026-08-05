import { appError, err, ok, toAppError } from '@/server/errors'
import { clearAuthCookies, setAuthCookies } from '@/server/auth/cookies'
import { getCurrentUserFromRequest } from '@/server/auth/session'
import { serverEnv } from '@/server/env'
import {
  createSupabaseAnonClient,
  createSupabaseServiceRoleClient,
} from '@/server/supabase/client'

import { DEMO_PERSONAS } from './demo-personas'

import type {
  authSessionInputSchema,
  demoPersonaInputSchema,
  updateDisplayNameInputSchema,
} from './schemas'
import type { z } from 'zod'

type DemoSession = {
  accessToken: string
  expiresAt?: number | null
  refreshToken: string
}

export type DemoSignInDependencies = {
  enabled: boolean
  password?: string
  setSession: (session: DemoSession) => void
  signIn: (input: {
    email: string
    password: string
  }) => Promise<DemoSession | null>
}

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

export async function signInAsDemoPersona(
  input: z.infer<typeof demoPersonaInputSchema>,
  dependencies: DemoSignInDependencies = getDemoSignInDependencies(),
) {
  if (!dependencies.enabled) {
    return err(appError('forbidden', 'Demo access is not enabled.'))
  }

  if (!dependencies.password) {
    return err(
      appError('internal_error', 'Demo access has not been configured.'),
    )
  }

  const persona = DEMO_PERSONAS[input.persona]

  try {
    const session = await dependencies.signIn({
      email: persona.email,
      password: dependencies.password,
    })

    if (!session) {
      return err(
        appError(
          'external_service_error',
          'The demo persona could not be signed in. Reseed the demo environment.',
        ),
      )
    }

    dependencies.setSession(session)

    return ok({ path: persona.path, persona: input.persona })
  } catch (error) {
    return err(toAppError(error))
  }
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

function getDemoSignInDependencies(): DemoSignInDependencies {
  return {
    enabled: serverEnv.STAGECOM_DEMO_MODE === 'true',
    password: serverEnv.STAGECOM_DEMO_PASSWORD,
    setSession: setAuthCookies,
    signIn: async ({ email, password }) => {
      const supabase = createSupabaseAnonClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return null
      }

      return {
        accessToken: data.session.access_token,
        expiresAt: data.session.expires_at,
        refreshToken: data.session.refresh_token,
      }
    },
  }
}
