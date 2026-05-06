import { createFileRoute } from '@tanstack/react-router'

import { authSearchSchema } from '@/features/auth/schemas'
import { AuthPage } from '@/features/first-slice/pages'

export const Route = createFileRoute('/signup')({
  validateSearch: authSearchSchema,
  component: SignupPage,
})

function SignupPage() {
  const { inviteToken, next } = Route.useSearch()

  return <AuthPage inviteToken={inviteToken} mode="signup" next={next} />
}
