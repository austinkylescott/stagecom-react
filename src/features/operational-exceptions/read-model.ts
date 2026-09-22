import { getProducerContentCommitment } from '@/features/events/public-content-readiness'
import {
  createWorkQueueReadModel,
  getStaffingNeedState,
} from '@/features/work-queue/read-model'
import type { WorkQueueInput } from '@/features/work-queue/read-model'

export type OperationalExceptionsInput = Omit<WorkQueueInput, 'events'> & {
  events: Array<
    WorkQueueInput['events'][number] & {
      leadership: Array<{ userId: string; role: string }>
      hasPublishedContent: boolean
      completionFailure?: {
        evaluatedAt: string
        finalSlotEndsAt: string
      } | null
      finalConfirmedSlotEndsAt?: string | null
      counteroffers: Array<{
        id: string
        state: string
        deadlineAt: string
        hasActiveHold: boolean
      }>
    }
  >
}

export type OperationalException = {
  id: string
  kind: 'expiry' | 'content' | 'staffing' | 'progress' | 'completion'
  label: string
  reason: string
  urgency: 'urgent' | 'watch'
  urgencyReason: string
  deadlineAt: string | null
  theaterName: string
  eventTitle: string
  href: string | null
}

export function createOperationalExceptionsReadModel(
  input: OperationalExceptionsInput,
): OperationalException[] {
  const items: OperationalException[] = []
  const workIds = new Set(
    createWorkQueueReadModel(input).map((item) => item.id),
  )
  const operator = input.viewer.roles.some(
    (role) => role === 'owner' || role === 'admin',
  )
  for (const event of input.events) {
    if (['cancelled', 'completed'].includes(event.lifecycle)) continue
    const leader = event.leadership.some(
      (row) => row.userId === input.viewer.userId,
    )
    if (!operator && !input.viewer.isReviewer && !leader) continue
    const href = `/app/${input.theater.slug}/events/${event.slug}`
    const base = { theaterName: input.theater.name, eventTitle: event.title }
    const producer = event.leadership.some(
      (row) => row.userId === input.viewer.userId && row.role === 'producer',
    )
    if (
      operator &&
      event.lifecycle === 'approved' &&
      event.completionFailure &&
      event.finalConfirmedSlotEndsAt &&
      Date.parse(event.finalConfirmedSlotEndsAt) <= Date.parse(input.now) &&
      Date.parse(event.finalConfirmedSlotEndsAt) ===
        Date.parse(event.completionFailure.finalSlotEndsAt)
    ) {
      items.push({
        ...base,
        id: `completion:${event.id}`,
        kind: 'completion',
        label: 'Automatic completion failed',
        reason: `The system could not safely complete this Event after its final Confirmed Slot. Last evaluated ${event.completionFailure.evaluatedAt}.`,
        urgency: 'urgent',
        urgencyReason:
          'Final Confirmed Slot has ended; completion remains unresolved',
        deadlineAt: null,
        href: `${href}#history`,
      })
    }
    const contentReason = getProducerContentCommitment(event)
    if (operator && !producer && contentReason) {
      items.push({
        ...base,
        id: `content:${event.id}`,
        kind: 'content',
        label: 'Public content awaits Producer',
        reason: contentReason,
        urgency: 'watch',
        urgencyReason: 'Publication is blocked by Producer-owned content',
        deadlineAt: null,
        href: `${href}#public-page`,
      })
    }
    const latestRevision = event.revisions.reduce<
      (typeof event.revisions)[number] | undefined
    >(
      (latest, revision) =>
        !latest || revision.number > latest.number ? revision : latest,
      undefined,
    )
    if (latestRevision) {
      const revision = latestRevision
      const reason =
        revision.state === 'pending' &&
        !revision.hasDecision &&
        !workIds.has(`proposal:${revision.id}`)
          ? 'Another eligible Reviewer must decide this Proposal Revision.'
          : revision.state === 'changes_requested' && !producer
            ? 'Producer must submit the requested Proposal edits.'
            : null
      if (reason)
        items.push({
          ...base,
          id: `progress:${revision.id}`,
          kind: 'progress',
          label: 'Proposal progress awaits another relationship',
          reason,
          urgency: 'watch',
          urgencyReason: 'Proposal progress is blocked',
          deadlineAt: null,
          href: `${href}#proposal-revision-${revision.id}`,
        })
    }
    for (const need of event.staffingNeeds) {
      const { remaining, canInvite } = getStaffingNeedState(
        need,
        event.assignments,
        input.activeMemberIds,
      )
      if (!remaining || (operator && canInvite)) continue
      items.push({
        ...base,
        id: `staffing:${need.id}`,
        kind: 'staffing',
        label: `${need.label} awaiting coverage`,
        reason: `${need.label} needs ${remaining} more accepted assignment${remaining === 1 ? '' : 's'}. ${operator ? 'No eligible Member remains to invite; pending invitations do not count as coverage.' : 'Theater Operators own staffing invitations.'}`,
        urgency: 'watch',
        urgencyReason: 'Required staffing remains unfilled',
        deadlineAt: null,
        href: `${href}#cast-team`,
      })
    }
    for (const offer of event.counteroffers) {
      const deadline = Date.parse(offer.deadlineAt)
      const now = Date.parse(input.now)
      if (
        offer.state !== 'pending' ||
        !(deadline > now && deadline <= now + 86_400_000)
      )
        continue
      items.push({
        ...base,
        id: `expiry:${offer.id}`,
        kind: 'expiry',
        label: 'Counteroffer approaching expiry',
        reason: offer.hasActiveHold
          ? 'Producer response is pending; the exclusive temporary hold expires with the Counteroffer.'
          : 'Producer response is pending before the Counteroffer expires.',
        urgency: 'urgent',
        urgencyReason: 'Expires within 24 hours',
        deadlineAt: offer.deadlineAt,
        href: `${href}#counteroffer-${offer.id}`,
      })
    }
  }
  return items.sort(
    (a, b) =>
      (a.urgency === 'urgent' ? 0 : 1) - (b.urgency === 'urgent' ? 0 : 1) ||
      (a.deadlineAt ? Date.parse(a.deadlineAt) : Infinity) -
        (b.deadlineAt ? Date.parse(b.deadlineAt) : Infinity) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )
}
