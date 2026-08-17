// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProposalPreparationModule } from './module'
import { createInMemoryProposalPreparationAdapter } from './testing'

import type { ProposalPreparationReadModel } from './types'

afterEach(cleanup)

describe('ProposalPreparation', () => {
  it('preserves a dirty plan while saving and refreshing the Proposed Cast', async () => {
    const initial = preparationModel()
    const refreshedCast = preparationModel({ proposedCastUserIds: ['cast-1'] })
    const refreshedPlan = preparationModel({
      operationalPlan: {
        ...initial.operationalPlan,
        targetCastSize: 4,
      },
      proposedCastUserIds: ['cast-1'],
    })
    const adapter = createInMemoryProposalPreparationAdapter(initial, {
      refreshResults: [
        { data: refreshedCast, ok: true },
        { data: refreshedPlan, ok: true },
      ],
      revisionNumber: 2,
    })
    const invalidate = vi.fn(async () => undefined)
    const Preparation = createProposalPreparationModule({
      adapter,
      createId: vi
        .fn()
        .mockReturnValueOnce('cast-command')
        .mockReturnValueOnce('submit-command'),
      useInvalidateEventWorkspace: () => invalidate,
    })

    render(
      <Preparation.Root initial={initial}>
        <Preparation.RevisionSection />
        <Preparation.PlanSection />
      </Preparation.Root>,
    )

    fireEvent.change(screen.getByLabelText('Target cast size'), {
      target: { value: '4' },
    })
    fireEvent.click(screen.getByLabelText('Ada Actor'))
    fireEvent.click(screen.getByRole('button', { name: 'Save Proposed Cast' }))

    await screen.findByText('Proposed Cast saved.')
    expect(adapter.calls.saveProposedCast).toEqual([
      {
        castMemberUserIds: ['cast-1'],
        commandId: 'cast-command',
        eventId: 'event-1',
      },
    ])
    expect(
      screen.getByLabelText<HTMLInputElement>('Target cast size').value,
    ).toBe('4')
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: 'Submit Proposal Revision',
      }).disabled,
    ).toBe(true)

    fireEvent.click(
      screen.getByRole('button', { name: 'Save operational plan' }),
    )

    await waitFor(() =>
      expect(adapter.calls.saveOperationalPlan).toHaveLength(1),
    )
    expect(adapter.calls.saveOperationalPlan[0]).toEqual(
      expect.objectContaining({ eventId: 'event-1', targetCastSize: 4 }),
    )
    await waitFor(() =>
      expect(
        screen.getByRole<HTMLButtonElement>('button', {
          name: 'Submit Proposal Revision',
        }).disabled,
      ).toBe(false),
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Submit Proposal Revision' }),
    )

    await screen.findByText('Proposal Revision 2 submitted for review.')
    expect(adapter.calls.submitProposalRevision).toEqual([
      { commandId: 'submit-command', eventId: 'event-1' },
    ])
    expect(invalidate).toHaveBeenCalledOnce()
  })

  it('enters a stale state and blocks submission when refresh fails after a save', async () => {
    const initial = preparationModel()
    const adapter = createInMemoryProposalPreparationAdapter(initial, {
      refreshResults: [
        {
          blockers: [],
          ok: false,
          problem: { message: 'Read model unavailable.' },
        },
        {
          data: preparationModel({ proposedCastUserIds: ['cast-1'] }),
          ok: true,
        },
      ],
    })
    const Preparation = createProposalPreparationModule({
      adapter,
      createId: () => 'cast-command',
      useInvalidateEventWorkspace: () => async () => undefined,
    })

    render(
      <Preparation.Root initial={initial}>
        <Preparation.RevisionSection />
        <Preparation.PlanSection />
      </Preparation.Root>,
    )

    fireEvent.change(screen.getByLabelText('Target cast size'), {
      target: { value: '4' },
    })
    fireEvent.click(screen.getByLabelText('Ada Actor'))
    fireEvent.click(screen.getByRole('button', { name: 'Save Proposed Cast' }))

    await screen.findByText(
      'Your save succeeded, but readiness could not be refreshed.',
    )
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: 'Submit Proposal Revision',
      }).disabled,
    ).toBe(true)
    expect(screen.getByLabelText<HTMLInputElement>('Ada Actor').disabled).toBe(
      true,
    )
    expect(
      screen.getByLabelText<HTMLInputElement>('Target cast size').disabled,
    ).toBe(false)
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: 'Save operational plan',
      }).disabled,
    ).toBe(true)
    expect(adapter.calls.submitProposalRevision).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Retry refresh' }))

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Retry refresh' }),
      ).toBeNull(),
    )
    expect(adapter.calls.refresh).toHaveLength(2)
    expect(
      screen.getByLabelText<HTMLInputElement>('Target cast size').value,
    ).toBe('4')
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: 'Save operational plan',
      }).disabled,
    ).toBe(false)
  })

  it('renders projected submission failures without knowing server error details', async () => {
    const initial = preparationModel()
    const adapter = createInMemoryProposalPreparationAdapter(initial)
    adapter.submitProposalRevision = async (input) => {
      adapter.calls.submitProposalRevision.push(input)
      return {
        blockers: [{ code: 'cast_required', message: 'Select a Cast Member.' }],
        ok: false,
        problem: { message: 'Proposal Revision is not ready.' },
      }
    }
    const Preparation = createProposalPreparationModule({
      adapter,
      createId: () => 'submit-command',
      useInvalidateEventWorkspace: () => async () => undefined,
    })

    render(
      <Preparation.Root initial={initial}>
        <Preparation.RevisionSection />
      </Preparation.Root>,
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Submit Proposal Revision' }),
    )

    await screen.findByText('Proposal Revision is not ready.')
    expect(screen.getByText('Select a Cast Member.')).toBeDefined()
    expect(adapter.calls.submitProposalRevision).toEqual([
      { commandId: 'submit-command', eventId: 'event-1' },
    ])
  })
})

function preparationModel(
  overrides: Partial<ProposalPreparationReadModel> = {},
): ProposalPreparationReadModel {
  return {
    acceptedCastMembers: [{ displayName: 'Ada Actor', userId: 'cast-1' }],
    capabilities: {
      editOperationalPlan: true,
      selectProposedCast: true,
      submitProposalRevision: true,
      viewResourceRequests: true,
    },
    eventId: 'event-1',
    eventSlug: 'summer-show',
    operationalPlan: {
      minimumViableCast: 1,
      occurrences: [
        {
          candidateSlots: [
            {
              durationMinutes: 90,
              id: 'slot-1',
              localStartsAt: '2026-08-12T19:00',
              locationKind: 'primary_venue',
              locationName: 'Main Stage',
              offSiteApproved: false,
              position: 0,
              resourceId: 'venue-1',
              timezoneName: 'America/New_York',
              timezoneSource: 'manual',
            },
          ],
          confirmedCandidateSlotId: 'slot-1',
          id: 'occurrence-1',
          position: 0,
          type: 'performance',
          visibility: 'public',
        },
      ],
      resourceRequests: [],
      targetCastSize: 3,
    },
    proposedCastUserIds: [],
    recommendations: [
      {
        availableCalledCastCount: 1,
        evidence: [{ code: 'ready', message: 'Ready for review.' }],
        hasPrimaryVenueConflict: false,
        isViable: true,
        minimumViableCast: 1,
        occurrenceId: 'occurrence-1',
        rank: 1,
        requiredAvailableCount: 1,
        requiredCount: 1,
        requiredUnconfirmedCount: 0,
        slotId: 'slot-1',
      },
    ],
    theater: {
      primaryVenueId: 'venue-1',
      primaryVenueName: 'Main Stage',
      slug: 'stagecom',
      timezoneName: 'America/New_York',
      timezoneSource: 'manual',
    },
    ...overrides,
  }
}
