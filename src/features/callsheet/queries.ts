import { getMyPollActions } from '@/features/availability-polls/queries'
import { getEventPortfolio } from '@/features/events/event-portfolio/query'
import { getPublishedTheaterEvents } from '@/features/theaters/public-queries'
import type { CallsheetEvent } from './read-model'
import { appError, err, ok } from '@/server/errors'
import { getBearerTokenFromRequest } from '@/server/auth/session'
import { createSupabaseServiceRoleClient } from '@/server/supabase/client'

import { getEventCommitments } from './event-commitments'
import { createCallsheetReadModel } from './read-model'
import { getMySharedTheaterWork } from './shared-work'

export async function getMyCallsheet() {
  const sharedResult = await getMySharedTheaterWork()
  if (!sharedResult.ok) return sharedResult
  const { theaters, sharedWork } = sharedResult.data
  const theaterById = new Map(theaters.map((theater) => [theater.id, theater]))

  if (theaters.length === 0)
    return ok({
      commitments: [],
      sharedWork,
      theaters,
      events: [],
      discovery: [],
    })

  const supabase = createSupabaseServiceRoleClient()
  const { data: adminInvitations, error: adminInvitationError } = await supabase
    .from('admin_invitations')
    .select('id, theater_id')
    .eq('member_user_id', sharedResult.data.actorUserId)
    .eq('status', 'pending')
    .in(
      'theater_id',
      theaters.map((theater) => theater.id),
    )

  if (adminInvitationError) {
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )
  }

  const adminCommitments = adminInvitations.flatMap((invitation) => {
    const theater = theaterById.get(invitation.theater_id)
    if (!theater) return []
    return [
      {
        action: 'Respond to Admin invitation',
        actionableAt: null,
        event: { slug: '', title: 'Admin authority invitation' },
        id: `admin-invitation:${invitation.id}`,
        responseId: invitation.id,
        kind: 'admin_invitation' as const,
        relationship: 'Theater Member',
        targetAnchor: '',
        theater: { slug: theater.slug, title: theater.name },
      },
    ]
  })

  const { data: ownershipTransfers, error: ownershipTransferError } =
    await supabase
      .from('theater_ownership_transfers')
      .select('id, theater_id')
      .eq('member_user_id', sharedResult.data.actorUserId)
      .eq('status', 'pending')
      .in(
        'theater_id',
        theaters.map((theater) => theater.id),
      )

  if (ownershipTransferError) {
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )
  }

  const ownershipTransferCommitments = ownershipTransfers.flatMap(
    (transfer) => {
      const theater = theaterById.get(transfer.theater_id)
      if (!theater) return []
      return [
        {
          action: 'Respond to ownership transfer',
          actionableAt: null,
          event: { slug: '', title: 'Theater ownership transfer' },
          id: `ownership-transfer:${transfer.id}`,
          responseId: transfer.id,
          kind: 'ownership_transfer' as const,
          relationship: 'Proposed successor',
          targetAnchor: '',
          theater: { slug: theater.slug, title: theater.name },
        },
      ]
    },
  )

  const accessToken = getBearerTokenFromRequest()
  if (!accessToken)
    return err(appError('unauthenticated', 'Sign in is required.'))
  const eventCommitments = await getEventCommitments({
    accessToken,
    scope: { kind: 'all_active_theaters' },
  })
  if (!eventCommitments.ok) return eventCommitments
  // Reuse each Theater's authorized portfolio and anonymous-safe published snapshots.
  const events: CallsheetEvent[] = []
  const discovery: CallsheetEvent[] = []
  const summaries = await Promise.all(
    theaters.map(async (theater) => ({
      theater,
      portfolio: await getEventPortfolio({ theaterSlug: theater.slug }),
      published: await getPublishedTheaterEvents({ theaterSlug: theater.slug }),
    })),
  )
  for (const { theater, portfolio, published } of summaries) {
    if (!portfolio.ok) return portfolio
    if (!published.ok) return published
    const workspaceIds = new Set(portfolio.data.workspaceEventIds)
    const related = portfolio.data.portfolio.events.filter((event) =>
      workspaceIds.has(event.id),
    )
    events.push(
      ...related.map((event) => ({
        id: `${theater.id}:${event.id}`,
        title: event.title,
        href: event.overviewHref,
        theaterName: theater.name,
      })),
    )
    const relatedPublicDestinations = new Set(
      related.map((event) => `/theater/${theater.slug}/${event.slug}`),
    )
    discovery.push(
      ...published.data.events
        .filter((event) => !relatedPublicDestinations.has(event.href))
        .map((event) => ({
          id: event.href,
          title: event.title,
          href: event.href,
          theaterName: theater.name,
        })),
    )
  }
  const pollActions = await getMyPollActions()
  if (!pollActions.ok) return pollActions
  return ok({
    ...createCallsheetReadModel({
      commitments: [
        ...adminCommitments,
        ...ownershipTransferCommitments,
        ...eventCommitments.data,
        ...pollActions.data,
      ],
      sharedWork,
    }),
    theaters,
    events,
    discovery,
  })
}
