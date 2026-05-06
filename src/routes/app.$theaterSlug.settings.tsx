import { createFileRoute } from '@tanstack/react-router'

import { RoutePlaceholder } from '@/components/stage/route-placeholder'

export const Route = createFileRoute('/app/$theaterSlug/settings')({
  component: TheaterSettingsPage,
})

function TheaterSettingsPage() {
  const { theaterSlug } = Route.useParams()

  return (
    <RoutePlaceholder
      eyebrow="Settings"
      title="Theater settings"
      description="Identity, branding, address, publishing, and staff default settings for owner/admin users."
      details={[['Theater', theaterSlug]]}
    />
  )
}
