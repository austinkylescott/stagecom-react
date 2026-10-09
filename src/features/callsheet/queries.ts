import { getMyPlanningActions } from '@/features/event-planning/queries'
import { getMyPollActions } from '@/features/availability-polls/queries'
import { getEventPortfolio } from '@/features/events/event-portfolio/query'
import { getPublishedTheaterEvents } from '@/features/theaters/public-queries'
import type { CallsheetEvent } from './read-model'
import { appError, err, ok } from '@/server/errors'
import { getBearerTokenFromRequest } from '@/server/auth/session'
import { getMyTheaterInvitations } from './theater-invitations'

import { getEventCommitments } from './event-commitments'
import { createCallsheetReadModel } from './read-model'
import { getMySharedTheaterWork } from './shared-work'

export async function getMyCallsheet() {
  const sharedResult = await getMySharedTheaterWork()
  if (!sharedResult.ok) return sharedResult
  const { theaters, sharedWork } = sharedResult.data

  if (theaters.length === 0)
    return ok({
      commitments: [],
      sharedWork,
      theaters,
      events: [],
      discovery: [],
    })

  const accessToken = getBearerTokenFromRequest()
  if (!accessToken)
    return err(appError('unauthenticated', 'Sign in is required.'))
  const invitationResult = await getMyTheaterInvitations({ accessToken })
  if (!invitationResult.ok) return invitationResult
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
        title: event.title,
        href: event.overviewHref,
        theaterName: theater.name,
        lifecycle: event.lifecycle,
        ...portfolio.data.workspaceDetails.find(
          (details) => details.id === event.id,
        ),
        id: `${theater.id}:${event.id}`,
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
          nextDate: event.startsAt,
          scheduleVisible: true,
        })),
    )
  }
  const planningActions = await getMyPlanningActions()
  if (!planningActions.ok) return planningActions
  const pollActions = await getMyPollActions()
  if (!pollActions.ok) return pollActions
  return ok({
    ...createCallsheetReadModel({
      commitments: [
        ...invitationResult.data,
        ...eventCommitments.data,
        ...pollActions.data,
        ...planningActions.data,
      ],
      sharedWork,
    }),
    theaters,
    events,
    discovery,
  })
}
