import type { Json } from '@/server/db/database.types'

type EventHistoryInput = {
  actorUserId: string
  canViewAdminActivity: boolean
  events: Array<{
    action: string
    actorDisplayName: string | null
    actorUserId: string | null
    createdAt: string
    id: string
    payload: Json
    visibility: 'admin_only' | 'member_visible' | 'self_only'
  }>
}

const actionLabels: Record<string, string> = {
  'event.cancelled': 'Event cancelled',
  'event.cancellation.requested': 'Cancellation requested',
  'event.completion.failed': 'Automatic completion failed',
  'event.completed': 'Event completed',
  'event.proposal_counteroffer.accepted': 'Proposal counteroffer accepted',
  'event.proposal_counteroffer.declined': 'Proposal counteroffer declined',
  'event.proposal_counteroffer.expired': 'Proposal counteroffer expired',
  'event.proposal_counteroffer.issued': 'Proposal counteroffer issued',
  'event.proposal_counteroffer.expiring_soon':
    'Proposal counteroffer approaching expiry',
  'event.proposal_revision.approved': 'Proposal Revision approved',
  'event.proposal_revision.changes_requested':
    'Proposal Revision changes requested',
  'event.proposal_revision.denied': 'Proposal Revision denied',
  'event.proposal_revision.owner_override_approved':
    'Proposal Revision approved by Owner override',
  'event.proposal_revision.submitted': 'Proposal Revision submitted',
  'event.risk.allowed': 'At Risk continuation allowed',
  'event.risk.cancelled': 'At Risk Event cancelled',
  'event.risk.rescheduled': 'At Risk Event rescheduled',
  'event.risk.revised': 'At Risk Event revised',
  'event.staff.accepted': 'Event staff assignment accepted',
  'event.staff.declined': 'Event staff assignment declined',
  'event.staff.invited': 'Event staff assignment invited',
  'event.staff.revoked': 'Event staff assignment revoked',
}

export type EventHistoryReadModel = ReturnType<
  typeof createEventHistoryReadModel
>

export function createEventHistoryReadModel(input: EventHistoryInput) {
  const entries = input.events
    .filter((event) => canView(event, input))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((event) => ({
      action: actionLabels[event.action] ?? humanizeAction(event.action),
      actor: event.actorDisplayName ?? 'Stagecom system',
      createdAt: event.createdAt,
      detail: historyDetail(event.payload),
      id: event.id,
    }))

  return { entries }
}

function canView(
  event: EventHistoryInput['events'][number],
  input: Pick<EventHistoryInput, 'actorUserId' | 'canViewAdminActivity'>,
) {
  return (
    event.visibility === 'member_visible' ||
    (event.visibility === 'admin_only' && input.canViewAdminActivity) ||
    (event.visibility === 'self_only' &&
      selfOnlySubjectUserId(event.payload, event.actorUserId) ===
        input.actorUserId)
  )
}

function selfOnlySubjectUserId(payload: Json, fallback: string | null) {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
    return fallback
  }

  return typeof payload.memberUserId === 'string'
    ? payload.memberUserId
    : fallback
}

function historyDetail(payload: Json) {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
    return null
  }

  const reason = payload.reason
  if (typeof reason === 'string' && reason.trim()) return `Reason: ${reason}`

  const errorMessage = payload.errorMessage
  if (typeof errorMessage !== 'string' || !errorMessage.trim()) return null

  const finalConfirmedSlotEndsAt = payload.finalConfirmedSlotEndsAt
  const evaluatedAt = payload.evaluatedAt
  const completionContext = [
    typeof finalConfirmedSlotEndsAt === 'string'
      ? `Final Confirmed Slot ended: ${finalConfirmedSlotEndsAt}.`
      : null,
    typeof evaluatedAt === 'string' ? `Evaluated: ${evaluatedAt}.` : null,
  ]
    .filter(Boolean)
    .join(' ')

  return `Automatic completion failed safely: ${errorMessage}${
    completionContext ? ` ${completionContext}` : ''
  }`
}

function humanizeAction(action: string) {
  return action
    .split('.')
    .filter(Boolean)
    .map((segment) => segment.replaceAll('_', ' '))
    .join(' · ')
    .replace(/^./, (character) => character.toUpperCase())
}
