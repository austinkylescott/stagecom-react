import { createFileRoute } from '@tanstack/react-router'

import { RoutePlaceholder } from '@/components/stage/route-placeholder'

export const Route = createFileRoute('/app/$theaterSlug/events/new')({
  component: NewEventPage,
})

function NewEventPage() {
  const { theaterSlug } = Route.useParams()

  return (
    <RoutePlaceholder
      eyebrow="Events"
      title="Create an event"
      description="Theater-scoped event builder for shows, practices, meetings, auditions, and workshops."
      details={[['Theater', theaterSlug]]}
    />
  )
}
