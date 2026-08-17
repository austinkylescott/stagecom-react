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

export type OperationalPlan = {
  minimumViableCast: number
  occurrences: Array<{
    candidateSlots: Array<{
      durationMinutes: number
      id: string
      localStartsAt: string
      locationKind: 'primary_venue' | 'off_site'
      locationName: string
      offSiteApproved: boolean
      position: number
      resourceId?: string
      timezoneName: string
      timezoneSource: 'unknown' | 'inferred' | 'manual'
    }>
    confirmedCandidateSlotId: string | null
    id: string
    position: number
    type: 'rehearsal' | 'performance'
    visibility: 'public' | 'internal'
  }>
  resourceRequests: Array<{
    id: string
    label: string
    position: number
    quantity: number
    type: 'staff' | 'equipment' | 'other'
  }>
  targetCastSize: number
}

export type ProposalPreparationReadModel = {
  acceptedCastMembers: Array<{ displayName: string; userId: string }>
  capabilities: {
    editOperationalPlan: boolean
    selectProposedCast: boolean
    submitProposalRevision: boolean
    viewResourceRequests: boolean
  }
  eventId: string
  eventSlug: string
  operationalPlan: OperationalPlan
  proposedCastUserIds: string[]
  recommendations: CandidateSlotRecommendation[]
  theater: {
    primaryVenueId: string
    primaryVenueName: string
    slug: string
    timezoneName: string
    timezoneSource: 'unknown' | 'inferred' | 'manual'
  }
}
