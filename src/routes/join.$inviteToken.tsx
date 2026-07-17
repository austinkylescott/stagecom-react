import { createFileRoute } from '@tanstack/react-router'

import { getCurrentUserFn } from '@/features/auth/server-functions'
import { TargetedInvitationPage } from '@/features/invitations/components'
import { getTargetedInvitationPreviewFn } from '@/features/invitations/server-functions'

export const Route = createFileRoute('/join/$inviteToken')({
  loader: async ({ params }) => {
    if (params.inviteToken.length < 24 || params.inviteToken.length > 256) {
      return { preview: { state: 'invalid' as const }, signedIn: false }
    }

    const [preview, currentUser] = await Promise.all([
      getTargetedInvitationPreviewFn({
        data: { inviteToken: params.inviteToken },
      }),
      getCurrentUserFn(),
    ])

    if (!preview.ok) {
      throw preview.error
    }

    return { preview: preview.data, signedIn: currentUser.ok }
  },
  component: JoinInviteRoute,
})

function JoinInviteRoute() {
  const { inviteToken } = Route.useParams()
  const { preview, signedIn } = Route.useLoaderData()

  return (
    <TargetedInvitationPage
      inviteToken={inviteToken}
      preview={preview}
      signedIn={signedIn}
    />
  )
}
