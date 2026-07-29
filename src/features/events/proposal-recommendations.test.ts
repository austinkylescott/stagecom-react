import { describe, expect, it } from 'vitest'

import { rankCandidateSlots } from './proposal-recommendations'

describe('Candidate Slot recommendations', () => {
  it('deterministically ranks viability and explains required, minimum, and venue evidence', () => {
    const recommendations = rankCandidateSlots({
      availability: [
        { candidateSlotId: 'slot-a', response: 'available', userId: 'cast-1' },
        { candidateSlotId: 'slot-a', response: 'available', userId: 'cast-2' },
        { candidateSlotId: 'slot-b', response: 'available', userId: 'cast-1' },
        { candidateSlotId: 'slot-b', response: 'uncertain', userId: 'cast-2' },
      ],
      calls: [
        { call: 'required', occurrenceId: 'performance', userId: 'cast-1' },
        { call: 'optional', occurrenceId: 'performance', userId: 'cast-2' },
      ],
      commitments: [],
      occurrences: [
        {
          id: 'performance',
          minimumViableCast: 2,
          slots: [
            {
              durationMinutes: 90,
              id: 'slot-b',
              locationKind: 'primary_venue',
              startsAt: '2026-09-11T23:30:00Z',
            },
            {
              durationMinutes: 90,
              id: 'slot-a',
              locationKind: 'primary_venue',
              startsAt: '2026-09-10T23:30:00Z',
            },
          ],
          type: 'performance',
        },
      ],
      proposedCastUserIds: ['cast-1', 'cast-2'],
      setupBufferMinutes: 30,
      turnoverBufferMinutes: 30,
    })

    expect(
      recommendations.map(({ slotId, isViable, rank }) => ({
        slotId,
        isViable,
        rank,
      })),
    ).toEqual([
      { isViable: true, rank: 1, slotId: 'slot-a' },
      { isViable: false, rank: 2, slotId: 'slot-b' },
    ])
    expect(recommendations[0]?.evidence.map(({ code }) => code)).toEqual([
      'required_responses',
      'minimum_viable_cast',
      'primary_venue_conflict',
    ])
  })

  it('includes buffers for Primary Venue conflicts and never conflicts off-site Slots', () => {
    const recommendations = rankCandidateSlots({
      availability: [],
      calls: [],
      commitments: [{ durationMinutes: 60, startsAt: '2026-09-10T18:00:00Z' }],
      occurrences: [
        {
          id: 'rehearsal',
          minimumViableCast: 1,
          slots: [
            {
              durationMinutes: 60,
              id: 'primary',
              locationKind: 'primary_venue',
              startsAt: '2026-09-10T19:20:00Z',
            },
            {
              durationMinutes: 60,
              id: 'off-site',
              locationKind: 'off_site',
              startsAt: '2026-09-10T18:30:00Z',
            },
          ],
          type: 'rehearsal',
        },
      ],
      proposedCastUserIds: [],
      setupBufferMinutes: 15,
      turnoverBufferMinutes: 15,
    })

    expect(
      recommendations.find(({ slotId }) => slotId === 'primary')
        ?.hasPrimaryVenueConflict,
    ).toBe(true)
    expect(
      recommendations.find(({ slotId }) => slotId === 'off-site')
        ?.hasPrimaryVenueConflict,
    ).toBe(false)
  })
})
