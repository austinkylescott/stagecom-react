import { createServerFn } from '@tanstack/react-start'

import { getOnboardingState } from './queries'
import { getOnboardingStateInputSchema } from './schemas'

export const getOnboardingStateFn = createServerFn({ method: 'GET' })
  .inputValidator(getOnboardingStateInputSchema)
  .handler(async () => getOnboardingState())
