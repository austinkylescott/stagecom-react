import { createFileRoute } from '@tanstack/react-router'

import { RoutePlaceholder } from '@/components/stage/route-placeholder'

export const Route = createFileRoute('/app/$theaterSlug/calendar')({
  component: TheaterCalendarPage,
})

function TheaterCalendarPage() {
  const { theaterSlug } = Route.useParams()

  return (
    <RoutePlaceholder
      description="This Theater's shared availability will appear here. Return to Callsheet for your personal commitments."
      details={[['Theater', theaterSlug]]}
      eyebrow="Theater schedule"
      title="Calendar"
    />
  )
}
