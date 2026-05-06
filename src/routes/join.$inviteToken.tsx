import { createFileRoute } from '@tanstack/react-router'

import { JoinInvitePage } from '@/features/first-slice/pages'

export const Route = createFileRoute('/join/$inviteToken')({
  component: JoinInviteRoute,
})

function JoinInviteRoute() {
  const { inviteToken } = Route.useParams()

  return <JoinInvitePage inviteToken={inviteToken} />
}
