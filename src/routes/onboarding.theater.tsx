import { createFileRoute } from '@tanstack/react-router'

import { TheaterSetupPage } from '@/features/theaters/components'

export const Route = createFileRoute('/onboarding/theater')({
  component: TheaterOnboardingPage,
})

function TheaterOnboardingPage() {
  return <TheaterSetupPage />
}
