import { createFileRoute } from '@tanstack/react-router'

import { RoutePlaceholder } from '@/components/stage/route-placeholder'

export const Route = createFileRoute('/app/$theaterSlug/members')({
  component: TheaterMembersPage,
})

function TheaterMembersPage() {
  const { theaterSlug } = Route.useParams()

  return (
    <RoutePlaceholder
      eyebrow="Members"
      title="Members and invites"
      description="Theater membership, invite, and role management route."
      details={[['Theater', theaterSlug]]}
    />
  )
}
