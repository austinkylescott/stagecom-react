import { createFileRoute } from '@tanstack/react-router'

import { RoutePlaceholder } from '@/components/stage/route-placeholder'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <RoutePlaceholder
      eyebrow="Stagecom"
      title="Theater operations start here"
      description="Public entry route for the rebuild. Marketing stays intentionally light until the product workflows are in place."
    />
  )
}
