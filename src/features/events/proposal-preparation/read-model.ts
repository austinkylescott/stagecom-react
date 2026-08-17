import { rankCandidateSlots } from '../proposal-recommendations'

import type {
  CandidateSlotRecommendation,
  OperationalPlan,
  ProposalPreparationReadModel,
} from './types'

type CandidateSlotSource = {
  duration_minutes: number
  id: string
  local_starts_at: string
  location_kind: 'primary_venue' | 'off_site'
  location_name: string
  off_site_approved: boolean
  position: number
  resource_id: string | null
  starts_at: string
  timezone_name: string
  timezone_source: 'unknown' | 'inferred' | 'manual'
}

type OccurrenceSource = {
  candidate_slots: CandidateSlotSource[]
  confirmed_candidate_slot_id: string | null
  id: string
  occurrence_type: 'rehearsal' | 'performance'
  position: number
  visibility: 'public' | 'internal'
}

type ResourceRequestSource = {
  id: string
  label: string
  position: number
  quantity: number
  resource_type: 'staff' | 'equipment' | 'other'
}

type OperationalPlanSource = {
  minimum_viable_cast: number | null
  show_occurrences: OccurrenceSource[]
  show_resource_requests: ResourceRequestSource[]
  target_cast_size: number | null
}

type RecommendationInput = {
  availability: Array<{
    candidate_slot_id: string
    response: 'available' | 'unavailable' | 'uncertain'
    user_id: string
  }>
  calls: Array<{
    call: 'required' | 'optional' | 'not_called'
    occurrence_id: string
    user_id: string
  }>
  commitments: Array<{ durationMinutes: number; startsAt: string }>
  event: Pick<OperationalPlanSource, 'minimum_viable_cast' | 'show_occurrences'>
  proposedCastUserIds: string[]
  setupBufferMinutes: number
  turnoverBufferMinutes: number
}

type ReadModelInput = {
  acceptedCastMembers: Array<{ displayName: string; userId: string }>
  capabilities: ProposalPreparationReadModel['capabilities']
  event: OperationalPlanSource & { id: string; slug: string }
  includeResourceRequests: boolean
  proposedCastUserIds: string[]
  recommendations: CandidateSlotRecommendation[]
  theater: ProposalPreparationReadModel['theater']
}

export function createProposalPreparationReadModel({
  acceptedCastMembers,
  capabilities,
  event,
  includeResourceRequests,
  proposedCastUserIds,
  recommendations,
  theater,
}: ReadModelInput): ProposalPreparationReadModel {
  return {
    acceptedCastMembers,
    capabilities,
    eventId: event.id,
    eventSlug: event.slug,
    operationalPlan: projectOperationalPlan(event, includeResourceRequests),
    proposedCastUserIds,
    recommendations,
    theater,
  }
}

export function createProposalPreparationRecommendations({
  availability,
  calls,
  commitments,
  event,
  proposedCastUserIds,
  setupBufferMinutes,
  turnoverBufferMinutes,
}: RecommendationInput) {
  return rankCandidateSlots({
    availability: availability.map((response) => ({
      candidateSlotId: response.candidate_slot_id,
      response: response.response,
      userId: response.user_id,
    })),
    calls: calls.map((call) => ({
      call: call.call,
      occurrenceId: call.occurrence_id,
      userId: call.user_id,
    })),
    commitments,
    occurrences: event.show_occurrences.map((occurrence) => ({
      id: occurrence.id,
      minimumViableCast: event.minimum_viable_cast ?? 1,
      slots: occurrence.candidate_slots.map((slot) => ({
        durationMinutes: slot.duration_minutes,
        id: slot.id,
        locationKind: slot.location_kind,
        startsAt: slot.starts_at,
      })),
      type: occurrence.occurrence_type,
    })),
    proposedCastUserIds,
    setupBufferMinutes,
    turnoverBufferMinutes,
  })
}

export function projectOperationalPlan(
  event: OperationalPlanSource,
  includeResourceRequests: boolean,
): OperationalPlan {
  return {
    minimumViableCast: event.minimum_viable_cast ?? 1,
    occurrences: orderOccurrences(event.show_occurrences).map((occurrence) => ({
      candidateSlots: occurrence.candidate_slots.map((slot) => ({
        durationMinutes: slot.duration_minutes,
        id: slot.id,
        localStartsAt: slot.local_starts_at.slice(0, 16),
        locationKind: slot.location_kind,
        locationName: slot.location_name,
        offSiteApproved: slot.off_site_approved,
        position: slot.position,
        ...(slot.resource_id ? { resourceId: slot.resource_id } : {}),
        timezoneName: slot.timezone_name,
        timezoneSource: slot.timezone_source,
      })),
      confirmedCandidateSlotId: occurrence.confirmed_candidate_slot_id,
      id: occurrence.id,
      position: occurrence.position,
      type: occurrence.occurrence_type,
      visibility: occurrence.visibility,
    })),
    resourceRequests: includeResourceRequests
      ? orderByPosition(event.show_resource_requests).map((request) => ({
          id: request.id,
          label: request.label,
          position: request.position,
          quantity: request.quantity,
          type: request.resource_type,
        }))
      : [],
    targetCastSize: event.target_cast_size ?? 1,
  }
}

export function orderOccurrences<T extends OccurrenceSource>(occurrences: T[]) {
  return orderByPosition(occurrences).map((occurrence) => ({
    ...occurrence,
    candidate_slots: orderByPosition(occurrence.candidate_slots),
  }))
}

export function orderByPosition<T extends { position: number }>(items: T[]) {
  return [...items].sort((left, right) => left.position - right.position)
}
