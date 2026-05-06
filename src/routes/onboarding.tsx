import {
  Outlet,
  createFileRoute,
  useRouterState,
} from '@tanstack/react-router'

import { OnboardingHubPage } from '@/features/first-slice/pages'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

function OnboardingPage() {
  const activeRouteId = useRouterState({
    select: (state) => state.matches.at(-1)?.routeId,
  })

  if (activeRouteId !== Route.id) {
    return <Outlet />
  }

  return <OnboardingHubPage />
}
