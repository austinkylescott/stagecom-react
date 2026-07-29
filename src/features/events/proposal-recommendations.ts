export type RecommendationOccurrence = {
  id: string
  minimumViableCast: number
  slots: Array<{
    durationMinutes: number
    id: string
    locationKind: 'primary_venue' | 'off_site'
    startsAt: string
  }>
  type: 'rehearsal' | 'performance'
}

export type RecommendationCall = {
  call: 'required' | 'optional' | 'not_called'
  occurrenceId: string
  userId: string
}

export type RecommendationAvailability = {
  candidateSlotId: string
  response: 'available' | 'unavailable' | 'uncertain'
  userId: string
}

export type PrimaryVenueCommitment = {
  durationMinutes: number
  startsAt: string
}

export type CandidateSlotRecommendation = {
  availableCalledCastCount: number
  evidence: Array<{ code: string; message: string }>
  hasPrimaryVenueConflict: boolean
  isViable: boolean
  minimumViableCast: number
  occurrenceId: string
  rank: number
  requiredAvailableCount: number
  requiredCount: number
  requiredUnconfirmedCount: number
  slotId: string
}

export function rankCandidateSlots(input: {
  availability: RecommendationAvailability[]
  calls: RecommendationCall[]
  commitments: PrimaryVenueCommitment[]
  occurrences: RecommendationOccurrence[]
  proposedCastUserIds: string[]
  setupBufferMinutes: number
  turnoverBufferMinutes: number
}): CandidateSlotRecommendation[] {
  const proposedCast = new Set(input.proposedCastUserIds)

  return input.occurrences.flatMap((occurrence) => {
    const calls = input.calls.filter(
      (call) =>
        call.occurrenceId === occurrence.id && proposedCast.has(call.userId),
    )

    const recommendations = occurrence.slots.map((slot) => {
      const responses = new Map(
        input.availability
          .filter((response) => response.candidateSlotId === slot.id)
          .map((response) => [response.userId, response.response]),
      )
      const requiredCalls = calls.filter((call) => call.call === 'required')
      const called = calls.filter((call) => call.call !== 'not_called')
      const requiredAvailableCount = requiredCalls.filter(
        (call) => responses.get(call.userId) === 'available',
      ).length
      const requiredUnconfirmedCount =
        requiredCalls.length - requiredAvailableCount
      const availableCalledCastCount = called.filter(
        (call) => responses.get(call.userId) === 'available',
      ).length
      const hasPrimaryVenueConflict =
        slot.locationKind === 'primary_venue' &&
        input.commitments.some((commitment) =>
          bufferedIntervalsOverlap(
            slot,
            commitment,
            input.setupBufferMinutes,
            input.turnoverBufferMinutes,
          ),
        )
      const meetsMinimum =
        occurrence.type !== 'performance' ||
        availableCalledCastCount >= occurrence.minimumViableCast
      const isViable =
        requiredUnconfirmedCount === 0 &&
        meetsMinimum &&
        !hasPrimaryVenueConflict
      const evidence = [
        {
          code: 'required_responses',
          message: `${requiredAvailableCount} of ${requiredCalls.length} required Cast Members confirmed available.`,
        },
        {
          code: 'minimum_viable_cast',
          message:
            occurrence.type === 'performance'
              ? `${availableCalledCastCount} called Cast Members are available; ${occurrence.minimumViableCast} are required.`
              : `${availableCalledCastCount} called Cast Members are available.`,
        },
        {
          code: 'primary_venue_conflict',
          message:
            slot.locationKind === 'off_site'
              ? 'Approved off-site location does not reserve the Primary Venue.'
              : hasPrimaryVenueConflict
                ? 'Conflicts with an approved Primary Venue commitment including setup and turnover buffer.'
                : 'No approved Primary Venue conflict including setup and turnover buffer.',
        },
      ]

      return {
        availableCalledCastCount,
        evidence,
        hasPrimaryVenueConflict,
        isViable,
        minimumViableCast: occurrence.minimumViableCast,
        occurrenceId: occurrence.id,
        rank: 0,
        requiredAvailableCount,
        requiredCount: requiredCalls.length,
        requiredUnconfirmedCount,
        slotId: slot.id,
      }
    })

    return recommendations
      .sort((left, right) => {
        return (
          Number(right.isViable) - Number(left.isViable) ||
          left.requiredUnconfirmedCount - right.requiredUnconfirmedCount ||
          right.availableCalledCastCount - left.availableCalledCastCount ||
          Number(left.hasPrimaryVenueConflict) -
            Number(right.hasPrimaryVenueConflict) ||
          occurrence.slots.findIndex((slot) => slot.id === left.slotId) -
            occurrence.slots.findIndex((slot) => slot.id === right.slotId) ||
          left.slotId.localeCompare(right.slotId)
        )
      })
      .map((recommendation, index) => ({
        ...recommendation,
        rank: index + 1,
      }))
  })
}

function bufferedIntervalsOverlap(
  left: { durationMinutes: number; startsAt: string },
  right: { durationMinutes: number; startsAt: string },
  setupBufferMinutes: number,
  turnoverBufferMinutes: number,
) {
  const minute = 60_000
  const leftStart = Date.parse(left.startsAt) - setupBufferMinutes * minute
  const leftEnd =
    Date.parse(left.startsAt) +
    (left.durationMinutes + turnoverBufferMinutes) * minute
  const rightStart = Date.parse(right.startsAt) - setupBufferMinutes * minute
  const rightEnd =
    Date.parse(right.startsAt) +
    (right.durationMinutes + turnoverBufferMinutes) * minute

  return leftStart < rightEnd && rightStart < leftEnd
}
