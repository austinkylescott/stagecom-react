import { createFileRoute } from '@tanstack/react-router'

import { PeopleWorkspacePage } from '@/features/invitations/components'
import { listTargetedInvitationsFn } from '@/features/invitations/server-functions'
import { listReusableJoinLinksFn } from '@/features/join-links/server-functions'
import { getPeopleWorkspaceFn } from '@/features/memberships/server-functions'

export const Route = createFileRoute('/app/$theaterSlug/members')({
  loader: async ({ context }) => {
    const peopleResult = await getPeopleWorkspaceFn({
      data: { theaterId: context.theater.id },
    })

    if (!peopleResult.ok) {
      throw peopleResult.error
    }

    const canManage = peopleResult.data.operator !== null

    if (!canManage) {
      return {
        canManage,
        people: peopleResult.data,
        invitations: [],
        joinLinks: [],
      }
    }

    const [invitationResult, joinLinkResult] = await Promise.all([
      listTargetedInvitationsFn({ data: { theaterId: context.theater.id } }),
      listReusableJoinLinksFn({ data: { theaterId: context.theater.id } }),
    ])

    if (!invitationResult.ok) throw invitationResult.error
    if (!joinLinkResult.ok) throw joinLinkResult.error

    return {
      canManage,
      people: peopleResult.data,
      invitations: invitationResult.data.invitations,
      joinLinks: joinLinkResult.data.links,
    }
  },
  component: TheaterMembersPage,
})

function TheaterMembersPage() {
  const { membership, theater } = Route.useRouteContext()
  const { canManage, invitations, joinLinks, people } = Route.useLoaderData()

  return (
    <PeopleWorkspacePage
      canManage={canManage}
      actorUserId={membership.user_id}
      initialInvitations={invitations}
      initialJoinLinks={joinLinks}
      people={people}
      theaterId={theater.id}
    />
  )
}
