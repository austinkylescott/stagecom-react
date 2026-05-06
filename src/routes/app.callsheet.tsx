import { createFileRoute } from '@tanstack/react-router'

import { RoutePlaceholder } from '@/components/stage/route-placeholder'

export const Route = createFileRoute('/app/callsheet')({
  component: MyCallsheetPage,
})

function MyCallsheetPage() {
  return (
    <RoutePlaceholder
      eyebrow="Workspace"
      title="My callsheet"
      description="Cross-theater callsheet for upcoming assignments, memberships, and event work."
    />
  )
}
