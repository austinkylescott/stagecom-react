import { createFileRoute } from '@tanstack/react-router'

import { TheaterSetupPage } from '@/features/first-slice/pages'

export const Route = createFileRoute('/onboarding/theater')({
  component: TheaterOnboardingPage,
})

function TheaterOnboardingPage() {
  return <TheaterSetupPage />
}
