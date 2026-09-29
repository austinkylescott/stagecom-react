import { createFileRoute } from '@tanstack/react-router'

import { MemberJourneyPrototype } from '@/features/member-journey-prototype/member-journey-prototype'

export const Route = createFileRoute('/dev/member-journey-prototype')({
  validateSearch: (search: Record<string, unknown>) => ({
    variant: typeof search.variant === 'string' ? search.variant : undefined,
    persona: typeof search.persona === 'string' ? search.persona : undefined,
    screen: typeof search.screen === 'string' ? search.screen : undefined,
    calendarView:
      typeof search.calendarView === 'string' ? search.calendarView : undefined,
    booking: typeof search.booking === 'string' ? search.booking : undefined,
    eventId: typeof search.eventId === 'string' ? search.eventId : undefined,
  }),
  component: PrototypeRoute,
})

function PrototypeRoute() {
  return <MemberJourneyPrototype initialSearch={Route.useSearch()} />
}
