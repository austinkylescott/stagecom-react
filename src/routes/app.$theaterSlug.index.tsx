import { createFileRoute } from '@tanstack/react-router'
import { TheaterPortal } from '@/features/theaters/components/theater-portal'

export const Route = createFileRoute('/app/$theaterSlug/')({
  component: TheaterPortalPage,
})

function TheaterPortalPage() {
  const { theater, membership } = Route.useRouteContext()
  return <TheaterPortal theater={theater} roles={membership.roles} />
}
