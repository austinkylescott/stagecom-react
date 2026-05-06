import { createFileRoute } from '@tanstack/react-router'

import { authSearchSchema } from '@/features/auth/schemas'
import { AuthPage } from '@/features/first-slice/pages'

export const Route = createFileRoute('/login')({
  validateSearch: authSearchSchema,
  component: LoginPage,
})

function LoginPage() {
  const { inviteToken, next } = Route.useSearch()

  return <AuthPage inviteToken={inviteToken} mode="login" next={next} />
}
