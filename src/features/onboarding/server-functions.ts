import { createServerFn } from '@tanstack/react-start'

import { getOnboardingState } from './queries'
import { getOnboardingStateInputSchema } from './schemas'

export const getOnboardingStateFn = createServerFn({ method: 'GET' })
  .validator(getOnboardingStateInputSchema)
  .handler(async () => getOnboardingState())
