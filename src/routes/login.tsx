import { createFileRoute } from '@tanstack/react-router'

import { authSearchSchema } from '@/features/auth/schemas'
import { getDemoAccessStatusFn } from '@/features/auth/server-functions'
import { AuthPage } from '@/features/first-slice/pages'

export const Route = createFileRoute('/login')({
  validateSearch: authSearchSchema,
  loader: async () => {
    const result = await getDemoAccessStatusFn()

    return result.ok && result.data.enabled
  },
  component: LoginPage,
})

function LoginPage() {
  const { inviteToken, next } = Route.useSearch()
  const demoEnabled = Route.useLoaderData()

  return (
    <AuthPage
      demoEnabled={demoEnabled}
      inviteToken={inviteToken}
      mode="login"
      next={next}
    />
  )
}
