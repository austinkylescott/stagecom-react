import { createServerFn } from '@tanstack/react-start'

import {
  clearAuthSession,
  setAuthSession,
  updateDisplayName,
} from './commands'
import { getCurrentUser, resolveAuthRedirect } from './queries'
import {
  authSessionInputSchema,
  resolveAuthRedirectInputSchema,
  updateDisplayNameInputSchema,
} from './schemas'

export const getCurrentUserFn = createServerFn({ method: 'GET' }).handler(
  async () => getCurrentUser(),
)

export const setAuthSessionFn = createServerFn({ method: 'POST' })
  .inputValidator(authSessionInputSchema)
  .handler(async ({ data }) => setAuthSession(data))

export const clearAuthSessionFn = createServerFn({ method: 'POST' }).handler(
  async () => clearAuthSession(),
)

export const resolveAuthRedirectFn = createServerFn({ method: 'GET' })
  .inputValidator(resolveAuthRedirectInputSchema)
  .handler(async ({ data }) => resolveAuthRedirect(data))

export const updateDisplayNameFn = createServerFn({ method: 'POST' })
  .inputValidator(updateDisplayNameInputSchema)
  .handler(async ({ data }) => updateDisplayName(data))
