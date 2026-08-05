import { createServerFn } from '@tanstack/react-start'

import {
  clearAuthSession,
  setAuthSession,
  signInAsDemoPersona,
  updateDisplayName,
} from './commands'
import {
  getCurrentUser,
  getDemoAccessStatus,
  resolveAuthRedirect,
} from './queries'
import {
  authSessionInputSchema,
  demoPersonaInputSchema,
  resolveAuthRedirectInputSchema,
  updateDisplayNameInputSchema,
} from './schemas'

export const getCurrentUserFn = createServerFn({ method: 'GET' }).handler(
  async () => getCurrentUser(),
)

export const getDemoAccessStatusFn = createServerFn({ method: 'GET' }).handler(
  async () => getDemoAccessStatus(),
)

export const setAuthSessionFn = createServerFn({ method: 'POST' })
  .validator(authSessionInputSchema)
  .handler(async ({ data }) => setAuthSession(data))

export const clearAuthSessionFn = createServerFn({ method: 'POST' }).handler(
  async () => clearAuthSession(),
)

export const signInAsDemoPersonaFn = createServerFn({ method: 'POST' })
  .validator(demoPersonaInputSchema)
  .handler(async ({ data }) => signInAsDemoPersona(data))

export const resolveAuthRedirectFn = createServerFn({ method: 'GET' })
  .validator(resolveAuthRedirectInputSchema)
  .handler(async ({ data }) => resolveAuthRedirect(data))

export const updateDisplayNameFn = createServerFn({ method: 'POST' })
  .validator(updateDisplayNameInputSchema)
  .handler(async ({ data }) => updateDisplayName(data))
