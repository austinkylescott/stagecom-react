import { createFileRoute } from '@tanstack/react-router'

import { RoutePlaceholder } from '@/components/stage/route-placeholder'

export const Route = createFileRoute('/app/$theaterSlug/events')({
  component: TheaterEventsPage,
})

function TheaterEventsPage() {
  const { theaterSlug } = Route.useParams()

  return (
    <RoutePlaceholder
      eyebrow="Events"
      title="Event operations"
      description="Theater-scoped event list for operators and producers."
      details={[['Theater', theaterSlug]]}
    />
  )
}
