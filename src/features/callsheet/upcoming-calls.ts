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
    .sort(compareCalls)
}

export function compareCalls(a: CallsheetCommitment, b: CallsheetCommitment) {
  return (
    Date.parse(a.actionableAt ?? '') - Date.parse(b.actionableAt ?? '') ||
    a.id.localeCompare(b.id)
  )
}

export function callHref(call: CallsheetCommitment) {
  return `/app/${call.theater.slug}/events/${call.event.slug}${call.targetAnchor}`
}

export function callMeaning(call: CallsheetCommitment) {
  if (!call.call) return null
  const type =
    call.call.occurrenceType === 'rehearsal' ? 'Rehearsal' : 'Performance'
  const requirement =
    call.call.requirement === 'required' ? 'Required' : 'Optional'
  return `${type} · ${requirement} Call`
}
