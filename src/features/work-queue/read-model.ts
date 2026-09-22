import { z } from 'zod'
import { evaluatePublicReadiness } from '@/features/events/public-content-readiness'

export type WorkQueueInput = {
  now: string
  viewer: { userId: string; roles: string[]; isReviewer: boolean }
  theater: {
    id: string
    slug: string
    name: string
    status: string
    ownerSelfApprovalEnabled: boolean
    missingPublicationFields: string[]
  }
  setupBufferMinutes: number
  turnoverBufferMinutes: number
  reservations: Array<{ resourceId: string; startsAt: string; endsAt: string }>
  activeMemberIds: string[]
  events: Array<{
    id: string
    slug: string
    title: string
    lifecycle: string
    approvedRevisionId: string | null
    health: string
    continuationAllowed: boolean
    revisions: Array<{
      id: string
      number: number
      state: string
      authorId: string
      hasDecision: boolean
      snapshot: unknown
    }>
    occurrences: Array<{ startsAt: string; publicPerformance: boolean }>
    cancellationRequests: Array<{ id: string; resolvedAt: string | null }>
    staffingNeeds: Array<{ id: string; label: string; quantity: number }>
    assignments: Array<{
      needId: string | null
      userId: string
      status: string
    }>
    publicDraft: {
      id: string
      version: number
      description: string
      imageUrl: string | null
    } | null
  }>
}

export type WorkQueueItem = {
  id: string
  label: string
  relationship: string
  priorityReason: string
  href: string
  theaterName: string
  eventTitle: string | null
  deadlineAt: string | null
  kind: 'proposal' | 'risk' | 'cancellation' | 'staffing' | 'publication'
}

export function createWorkQueueReadModel(
  input: WorkQueueInput,
): WorkQueueItem[] {
  const items: WorkQueueItem[] = []
  const operator = input.viewer.roles.some(
    (role) => role === 'owner' || role === 'admin',
  )
  if (
    operator &&
    input.theater.status === 'draft' &&
    input.theater.missingPublicationFields.length === 0
  ) {
    items.push({
      id: `publication:${input.theater.id}`,
      label: 'Preview and publish Theater',
      relationship: 'Theater Operator',
      priorityReason: 'Theater profile is ready for Publication',
      href: `/app/${input.theater.slug}/preview`,
      theaterName: input.theater.name,
      eventTitle: null,
      deadlineAt: null,
      kind: 'publication',
    })
  }
  for (const event of input.events) {
    if (['cancelled', 'completed'].includes(event.lifecycle)) continue
    const base = {
      theaterName: input.theater.name,
      eventTitle: event.title,
      deadlineAt: null,
    }
    const eventHref = `/app/${input.theater.slug}/events/${event.slug}`
    if (
      operator &&
      event.lifecycle === 'approved' &&
      event.approvedRevisionId &&
      event.health === 'at_risk' &&
      !event.continuationAllowed
    ) {
      items.push({
        ...base,
        kind: 'risk',
        id: `risk:${event.id}`,
        label: 'Manage At Risk Event',
        relationship: 'Theater Operator',
        priorityReason: 'At Risk · management decision required',
        href: `${eventHref}#operational-health`,
      })
    }
    if (operator) {
      for (const need of event.staffingNeeds) {
        const assignments = event.assignments.filter(
          (assignment) => assignment.needId === need.id,
        )
        const accepted = assignments.filter(
          (assignment) =>
            assignment.status === 'accepted' &&
            input.activeMemberIds.includes(assignment.userId),
        ).length
        const remaining = Math.max(0, need.quantity - accepted)
        // Existing assignments cannot be re-invited, including declined/revoked ones.
        const canInvite = input.activeMemberIds.some(
          (userId) =>
            !assignments.some((assignment) => assignment.userId === userId),
        )
        if (remaining && canInvite) {
          items.push({
            ...base,
            kind: 'staffing',
            id: `staffing:${need.id}`,
            label: `Fill ${need.label} · ${remaining} awaiting accepted coverage`,
            relationship: 'Theater Operator',
            priorityReason: 'Required staffing needs accepted coverage',
            href: `${eventHref}#event-staff-assignment`,
          })
        }
      }
      for (const request of event.cancellationRequests) {
        if (request.resolvedAt) continue
        items.push({
          ...base,
          kind: 'cancellation',
          id: `cancellation:${request.id}`,
          label: 'Decide cancellation request',
          relationship: 'Theater Operator',
          priorityReason: 'Producer requested cancellation',
          href: `${eventHref}#overview`,
        })
      }
      const blockers = evaluatePublicReadiness({
        atRiskContinuationAllowed: event.continuationAllowed,
        eventAtRisk: event.health === 'at_risk',
        hasDraft: event.publicDraft !== null,
        hasDescription: Boolean(event.publicDraft?.description.trim()),
        hasImage: Boolean(event.publicDraft?.imageUrl?.trim()),
        hasCurrentOperationalApproval:
          event.lifecycle === 'approved' && event.approvedRevisionId !== null,
        hasPublicPerformance: event.occurrences.some(
          (occurrence) => occurrence.publicPerformance,
        ),
        theaterPublished: input.theater.status === 'published',
      })
      if (event.publicDraft && blockers.length === 0) {
        items.push({
          ...base,
          kind: 'publication',
          id: `publication:${event.publicDraft.id}:${event.publicDraft.version}`,
          label: 'Preview and publish Event',
          relationship: 'Theater Operator',
          priorityReason: 'Public-content snapshot is ready for Publication',
          href: `${eventHref}#public-page`,
        })
      }
    }
    for (const revision of event.revisions) {
      if (revision.state !== 'pending' || revision.hasDecision) continue
      const selfAuthored = revision.authorId === input.viewer.userId
      const ownerOverride =
        selfAuthored &&
        input.viewer.roles.includes('owner') &&
        input.theater.ownerSelfApprovalEnabled &&
        canApproveSnapshot(revision.snapshot, input)
      if (
        !(operator || input.viewer.isReviewer) ||
        (selfAuthored && !ownerOverride)
      )
        continue
      items.push({
        kind: 'proposal',
        id: `proposal:${revision.id}`,
        label: ownerOverride
          ? 'Use audited self-approval override'
          : `Review Proposal Revision ${revision.number}`,
        relationship: ownerOverride ? 'Owner' : 'Reviewer',
        priorityReason: 'Proposal Revision awaits review',
        href: `/app/${input.theater.slug}/events/${event.slug}#proposal-revision-${revision.id}`,
        ...base,
      })
    }
  }
  return orderWorkQueueItems(items, input.now)
}

export function orderWorkQueueItems(
  items: WorkQueueItem[],
  nowIso: string,
): WorkQueueItem[] {
  return items
    .map((item) => {
      const deadline = item.deadlineAt ? Date.parse(item.deadlineAt) : Infinity
      const now = Date.parse(nowIso)
      if (deadline <= now)
        return {
          item: {
            ...item,
            priorityReason: 'Overdue · decision deadline has passed',
          },
          rank: 0,
          deadline,
        }
      if (item.kind === 'risk') return { item, rank: 0, deadline }
      if (deadline <= now + 24 * 60 * 60 * 1000)
        return {
          item: {
            ...item,
            priorityReason: 'Decision deadline expires within 24 hours',
          },
          rank: 1,
          deadline,
        }
      return {
        item,
        rank: item.kind === 'publication' ? 3 : 2,
        deadline,
      }
    })
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.deadline - b.deadline ||
        (a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0),
    )
    .map(({ item }) => item)
}

const approvalSnapshotSchema = z.object({
  occurrences: z.array(
    z.object({
      confirmedSlot: z.object({
        locationKind: z.enum(['primary_venue', 'off_site']),
        resourceId: z.string().nullable().optional(),
        startsAt: z.string(),
        durationMinutes: z.number().positive(),
      }),
    }),
  ),
})

function canApproveSnapshot(snapshot: unknown, input: WorkQueueInput) {
  const parsed = approvalSnapshotSchema.safeParse(snapshot)
  if (!parsed.success) return false
  const reservations = [...input.reservations]
  for (const { confirmedSlot: slot } of parsed.data.occurrences) {
    if (slot.locationKind !== 'primary_venue') continue
    if (!slot.resourceId) return false
    const startsAt =
      Date.parse(slot.startsAt) - input.setupBufferMinutes * 60_000
    const endsAt =
      Date.parse(slot.startsAt) +
      (slot.durationMinutes + input.turnoverBufferMinutes) * 60_000
    if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt)) return false
    if (
      reservations.some(
        (reservation) =>
          reservation.resourceId === slot.resourceId &&
          startsAt < Date.parse(reservation.endsAt) &&
          endsAt > Date.parse(reservation.startsAt),
      )
    )
      return false
    reservations.push({
      resourceId: slot.resourceId,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
    })
  }
  return true
}
