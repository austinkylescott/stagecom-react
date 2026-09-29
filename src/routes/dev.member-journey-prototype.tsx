import { createFileRoute } from '@tanstack/react-router'

import { MemberJourneyPrototype } from '@/features/member-journey-prototype/member-journey-prototype'

export const Route = createFileRoute('/dev/member-journey-prototype')({
  validateSearch: (search: Record<string, unknown>) => ({
    variant: typeof search.variant === 'string' ? search.variant : undefined,
    persona: typeof search.persona === 'string' ? search.persona : undefined,
    screen: typeof search.screen === 'string' ? search.screen : undefined,
  }),
  component: PrototypeRoute,
})

function PrototypeRoute() {
  return <MemberJourneyPrototype initialSearch={Route.useSearch()} />
}
