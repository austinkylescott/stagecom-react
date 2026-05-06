import { createFileRoute } from '@tanstack/react-router'

import { RoutePlaceholder } from '@/components/stage/route-placeholder'

export const Route = createFileRoute('/theater/$theaterSlug/$eventSlug')({
  component: PublicEventPage,
})

function PublicEventPage() {
  const { eventSlug, theaterSlug } = Route.useParams()

  return (
    <RoutePlaceholder
      eyebrow="Public event"
      title="Published event"
      description="Anonymous-safe public event page. Only published events for published theaters should resolve here."
      details={[
        ['Theater', theaterSlug],
        ['Event', eventSlug],
      ]}
    />
  )
}
