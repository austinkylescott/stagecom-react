import { createFileRoute } from '@tanstack/react-router'

import { authSearchSchema } from '@/features/auth/schemas'
import { CompleteProfilePage } from '@/features/first-slice/pages'

export const Route = createFileRoute('/complete-profile')({
  validateSearch: authSearchSchema,
  component: CompleteProfileRoute,
})

function CompleteProfileRoute() {
  const { next } = Route.useSearch()

  return <CompleteProfilePage next={next} />
}
