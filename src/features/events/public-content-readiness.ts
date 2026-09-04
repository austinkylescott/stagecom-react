export type PublicReadinessBlocker = {
  code:
    | 'description_missing'
    | 'event_at_risk'
    | 'image_missing'
    | 'operational_approval_missing'
    | 'public_content_missing'
    | 'public_performance_missing'
    | 'theater_unpublished'
  message: string
}

export type PublicReadinessBlockersByOwner = {
  producer: PublicReadinessBlocker[]
  theaterOperator: PublicReadinessBlocker[]
}

export function evaluatePublicReadiness(input: {
  atRiskContinuationAllowed: boolean
  eventAtRisk: boolean
  hasDraft: boolean
  hasDescription: boolean
  hasImage: boolean
  hasCurrentOperationalApproval: boolean
  hasPublicPerformance: boolean
  theaterPublished: boolean
}): PublicReadinessBlocker[] {
  const blockers: PublicReadinessBlocker[] = []
  if (!input.theaterPublished) {
    blockers.push({
      code: 'theater_unpublished',
      message: 'Publish the Theater before publishing this Event.',
    })
  }
  if (!input.hasCurrentOperationalApproval) {
    blockers.push({
      code: 'operational_approval_missing',
      message: 'Operational Approval is required.',
    })
  }
  if (!input.hasDraft) {
    blockers.push({
      code: 'public_content_missing',
      message: 'Prepare the Event public-content revision.',
    })
  } else {
    if (!input.hasDescription) {
      blockers.push({
        code: 'description_missing',
        message: 'Add a public Event description.',
      })
    }
    if (!input.hasImage) {
      blockers.push({
        code: 'image_missing',
        message: 'Add a public Event image.',
      })
    }
  }
  if (!input.hasPublicPerformance) {
    blockers.push({
      code: 'public_performance_missing',
      message: 'Confirm at least one public Performance.',
    })
  }
  if (input.eventAtRisk && !input.atRiskContinuationAllowed) {
    blockers.push({
      code: 'event_at_risk',
      message: 'Management must explicitly allow this At Risk Event.',
    })
  }
  return blockers
}

export function partitionPublicReadinessBlockers(
  blockers: PublicReadinessBlocker[],
): PublicReadinessBlockersByOwner {
  const producerCodes = new Set<PublicReadinessBlocker['code']>([
    'description_missing',
    'image_missing',
    'public_content_missing',
    'public_performance_missing',
  ])

  return {
    producer: blockers.filter(({ code }) => producerCodes.has(code)),
    theaterOperator: blockers.filter(({ code }) => !producerCodes.has(code)),
  }
}
