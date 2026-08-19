import { createFileRoute } from '@tanstack/react-router'

import { RoutePlaceholder } from '@/components/stage/route-placeholder'

export const Route = createFileRoute('/app/calendar')({
  component: PersonalCalendarPage,
})

function PersonalCalendarPage() {
  return (
    <RoutePlaceholder
      description="Your upcoming Calls and accepted commitments will appear here as they become available. Enter a Theater to view its shared schedule."
      eyebrow="Personal schedule"
      title="Calendar"
    />
  )
}
