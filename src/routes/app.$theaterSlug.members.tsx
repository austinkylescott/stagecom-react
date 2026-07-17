import { createFileRoute } from '@tanstack/react-router'

import { TargetedInvitationsPage } from '@/features/invitations/components'
import { listTargetedInvitationsFn } from '@/features/invitations/server-functions'
import { listReusableJoinLinksFn } from '@/features/join-links/server-functions'
import { canManageTheater } from '@/features/theaters/permissions'

export const Route = createFileRoute('/app/$theaterSlug/members')({
  loader: async ({ context }) => {
    const canManage = canManageTheater(context.membership.roles)

    if (!canManage) {
      return { canManage, invitations: [], joinLinks: [] }
    }

    const [invitationResult, joinLinkResult] = await Promise.all([
      listTargetedInvitationsFn({
        data: { theaterId: context.theater.id },
      }),
      listReusableJoinLinksFn({
        data: { theaterId: context.theater.id },
      }),
    ])

    if (!invitationResult.ok) {
      throw invitationResult.error
    }

    if (!joinLinkResult.ok) {
      throw joinLinkResult.error
    }

    return {
      canManage,
      invitations: invitationResult.data.invitations,
      joinLinks: joinLinkResult.data.links,
    }
  },
  component: TheaterMembersPage,
})

function TheaterMembersPage() {
  const { theater } = Route.useRouteContext()
  const { canManage, invitations, joinLinks } = Route.useLoaderData()

  return (
    <TargetedInvitationsPage
      canManage={canManage}
      initialInvitations={invitations}
      initialJoinLinks={joinLinks}
      theaterId={theater.id}
    />
  )
}
