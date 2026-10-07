import type { CallsheetCommitment } from './read-model'

export function upcomingCalls(
  commitments: CallsheetCommitment[],
  now = Date.now(),
) {
  return commitments
    .filter(
      (call) =>
        call.kind === 'occurrence_call' &&
        call.actionableAt &&
        Date.parse(call.actionableAt) >= now,
    )
    .sort((a, b) => (a.actionableAt ?? '').localeCompare(b.actionableAt ?? ''))
}

export function callHref(call: CallsheetCommitment) {
  return `/app/${call.theater.slug}/events/${call.event.slug}${call.targetAnchor}`
}

export function callTime(call: CallsheetCommitment, timeZone = 'UTC') {
  if (!call.actionableAt) return 'Time unavailable'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  }).format(new Date(call.actionableAt))
}
