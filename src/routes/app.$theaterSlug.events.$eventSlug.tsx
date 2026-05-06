import { createFileRoute } from '@tanstack/react-router'

import { RoutePlaceholder } from '@/components/stage/route-placeholder'

export const Route = createFileRoute('/app/$theaterSlug/events/$eventSlug')({
  component: EventWorkspacePage,
})

function EventWorkspacePage() {
  const { eventSlug, theaterSlug } = Route.useParams()

  return (
    <RoutePlaceholder
      eyebrow="Events"
      title="Event workspace"
      description="Authenticated event admin page for content, cast, acts, and producer workflows."
      details={[
        ['Theater', theaterSlug],
        ['Event', eventSlug],
      ]}
    />
  )
}
