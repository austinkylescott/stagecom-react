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
  blockers.push(...evaluatePublicContentReadiness(input))
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

function evaluatePublicContentReadiness(input: {
  hasDraft: boolean
  hasDescription: boolean
  hasImage: boolean
}): PublicReadinessBlocker[] {
  const blockers: PublicReadinessBlocker[] = []
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
  return blockers
}

export function getProducerContentCommitment(event: {
  lifecycle: string
  approvedRevisionId: string | null
  hasPublishedContent: boolean
  publicDraft: { description: string; imageUrl: string | null } | null
}): string | null {
  if (event.lifecycle !== 'approved' || !event.approvedRevisionId) return null
  if (!event.publicDraft && event.hasPublishedContent) return null
  const blockers = evaluatePublicContentReadiness({
    hasDraft: event.publicDraft !== null,
    hasDescription: Boolean(event.publicDraft?.description.trim()),
    hasImage: Boolean(event.publicDraft?.imageUrl?.trim()),
  })
  if (blockers.some((blocker) => blocker.code === 'public_content_missing'))
    return 'Producer must prepare the public-content revision.'
  const missing = blockers.map((blocker) =>
    blocker.code === 'description_missing'
      ? 'public description'
      : 'public image',
  )
  return missing.length ? `Producer must add a ${missing.join(' and ')}.` : null
}
