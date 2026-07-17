import { createFileRoute } from '@tanstack/react-router'

import { TargetedInvitationsPage } from '@/features/invitations/components'
import { listTargetedInvitationsFn } from '@/features/invitations/server-functions'
import { canManageTheater } from '@/features/theaters/permissions'

export const Route = createFileRoute('/app/$theaterSlug/members')({
  loader: async ({ context }) => {
    const canManage = canManageTheater(context.membership.roles)

    if (!canManage) {
      return { canManage, invitations: [] }
    }

    const result = await listTargetedInvitationsFn({
      data: { theaterId: context.theater.id },
    })

    if (!result.ok) {
      throw result.error
    }

    return { canManage, invitations: result.data.invitations }
  },
  component: TheaterMembersPage,
})

function TheaterMembersPage() {
  const { theater } = Route.useRouteContext()
  const { canManage, invitations } = Route.useLoaderData()

  return (
    <TargetedInvitationsPage
      canManage={canManage}
      initialInvitations={invitations}
      theaterId={theater.id}
    />
  )
}
