import { describe, expect, it } from 'vitest'

import { createProposalPreparationReadModel } from './read-model'

describe('Proposal preparation read model', () => {
  it('orders operational data and can preserve the read-only collaborator view', () => {
    const model = createProposalPreparationReadModel({
      acceptedCastMembers: [],
      capabilities: {
        editOperationalPlan: false,
        selectProposedCast: false,
        submitProposalRevision: false,
        viewResourceRequests: false,
      },
      event: {
        id: 'event-1',
        minimum_viable_cast: 2,
        show_occurrences: [occurrence('second', 1), occurrence('first', 0)],
        show_resource_requests: [
          {
            id: 'resource-1',
            label: 'Stage manager',
            position: 0,
            quantity: 1,
            resource_type: 'staff',
          },
        ],
        slug: 'summer-show',
        target_cast_size: 4,
      },
      includeResourceRequests: false,
      proposedCastUserIds: [],
      recommendations: [],
      theater: {
        primaryVenueId: 'venue-1',
        primaryVenueName: 'Main Stage',
        slug: 'stagecom',
        timezoneName: 'America/New_York',
        timezoneSource: 'manual',
      },
    })

    expect(model.operationalPlan.occurrences.map(({ id }) => id)).toEqual([
      'first',
      'second',
    ])
    expect(model.operationalPlan.resourceRequests).toEqual([])
    expect(model.capabilities.editOperationalPlan).toBe(false)
  })
})

function occurrence(id: string, position: number) {
  return {
    candidate_slots: [
      {
        duration_minutes: 90,
        id: `${id}-slot`,
        local_starts_at: '2026-08-12T19:00:00',
        location_kind: 'primary_venue' as const,
        location_name: 'Main Stage',
        off_site_approved: false,
        position: 0,
        resource_id: 'venue-1',
        starts_at: '2026-08-12T23:00:00Z',
        timezone_name: 'America/New_York',
        timezone_source: 'manual' as const,
      },
    ],
    confirmed_candidate_slot_id: null,
    id,
    occurrence_type: 'rehearsal' as const,
    position,
    visibility: 'internal' as const,
  }
}
