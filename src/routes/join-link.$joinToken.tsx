import { createFileRoute } from '@tanstack/react-router'

import { getCurrentUserFn } from '@/features/auth/server-functions'
import { ReusableJoinLinkPage } from '@/features/join-links/components'
import { getReusableJoinLinkPreviewFn } from '@/features/join-links/server-functions'

export const Route = createFileRoute('/join-link/$joinToken')({
  loader: async ({ params }) => {
    if (params.joinToken.length < 24 || params.joinToken.length > 256) {
      return { preview: { state: 'invalid' as const }, signedIn: false }
    }

    const [preview, currentUser] = await Promise.all([
      getReusableJoinLinkPreviewFn({
        data: { joinToken: params.joinToken },
      }),
      getCurrentUserFn(),
    ])

    if (!preview.ok) {
      throw preview.error
    }

    return { preview: preview.data, signedIn: currentUser.ok }
  },
  component: JoinLinkRoute,
})

function JoinLinkRoute() {
  const { joinToken } = Route.useParams()
  const { preview, signedIn } = Route.useLoaderData()

  return (
    <ReusableJoinLinkPage
      joinToken={joinToken}
      preview={preview}
      signedIn={signedIn}
    />
  )
}
