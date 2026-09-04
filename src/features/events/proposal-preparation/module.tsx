import { createContext, useContext, useEffect, useReducer } from 'react'

import { createProposalPreparationSections } from './presentation'
import { canSubmit, plansEqual, setsEqual } from './state'

import type { Dispatch, ReactNode, SetStateAction } from 'react'
import type { Partition, PreparationState, PresentedProblem } from './state'
import type { OperationalPlan, ProposalPreparationReadModel } from './types'

export type { PresentedProblem } from './state'

type StateAction =
  | { model: ProposalPreparationReadModel; type: 'reset' }
  | { plan: OperationalPlan; type: 'edit-plan' }
  | { type: 'edit-cast'; userIds: string[] }
  | { partition: Partition; type: 'save-started' }
  | {
      partition: 'operationalPlan'
      plan: OperationalPlan
      type: 'save-confirmed'
    }
  | {
      partition: 'proposedCast'
      type: 'save-confirmed'
      userIds: string[]
    }
  | {
      partition: Partition
      problem: PresentedProblem
      type: 'save-failed'
    }
  | { partition: Partition; type: 'refresh-started' }
  | {
      model: ProposalPreparationReadModel
      partition: Partition
      type: 'refreshed'
    }
  | {
      partition: Partition
      problem: PresentedProblem
      type: 'refresh-failed'
    }
  | { type: 'submit-started' }
  | {
      blockers: Array<{ code: string; message: string }>
      problem: PresentedProblem
      type: 'submit-failed'
    }
  | { revisionNumber: number; type: 'submitted' }
  | { type: 'workspace-invalidated' }
  | { problem: PresentedProblem; type: 'workspace-invalidation-failed' }

export type ProposalPreparationAdapterResult<T> =
  | { data: T; ok: true }
  | {
      blockers: Array<{ code: string; message: string }>
      ok: false
      problem: PresentedProblem
    }

export type ProposalPreparationAdapter = {
  refresh: (input: {
    eventSlug: string
    theaterSlug: string
  }) => Promise<ProposalPreparationAdapterResult<ProposalPreparationReadModel>>
  saveOperationalPlan: (
    input: OperationalPlan & { eventId: string },
  ) => Promise<ProposalPreparationAdapterResult<unknown>>
  saveProposedCast: (input: {
    castMemberUserIds: string[]
    commandId: string
    eventId: string
  }) => Promise<
    ProposalPreparationAdapterResult<{ castMemberUserIds: string[] }>
  >
  submitProposalRevision: (input: {
    commandId: string
    eventId: string
  }) => Promise<ProposalPreparationAdapterResult<{ revisionNumber: number }>>
}

type ModuleDependencies = {
  adapter: ProposalPreparationAdapter
  createId: () => string
  useInvalidateEventWorkspace: () => () => Promise<void>
}

export type PreparationContextValue = {
  addCandidateSlot: (occurrenceId: string) => void
  addOccurrence: () => void
  addResourceRequest: () => void
  moveOccurrence: (from: number, to: number) => void
  removeCandidateSlot: (occurrenceId: string, slotId: string) => void
  removeOccurrence: (occurrenceId: string) => void
  removeResourceRequest: (requestId: string) => void
  retryRefresh: () => Promise<void>
  saveOperationalPlan: () => Promise<void>
  saveProposedCast: () => Promise<void>
  setOperationalPlan: Dispatch<SetStateAction<OperationalPlan>>
  setProposedCastMember: (userId: string, selected: boolean) => void
  state: PreparationState
  submitProposalRevision: () => Promise<void>
  updateCandidateSlot: (
    occurrenceId: string,
    slotId: string,
    update: Partial<
      OperationalPlan['occurrences'][number]['candidateSlots'][number]
    >,
  ) => void
  updateOccurrence: (
    occurrenceId: string,
    update: Partial<OperationalPlan['occurrences'][number]>,
  ) => void
  updateResourceRequest: (
    requestId: string,
    update: Partial<OperationalPlan['resourceRequests'][number]>,
  ) => void
}

export type ProposalPreparationModule = {
  PlanSection: () => ReactNode
  ProposedCastSection: () => ReactNode
  RevisionSection: () => ReactNode
  Root: (props: {
    children: ReactNode
    initial: ProposalPreparationReadModel
  }) => ReactNode
}

function createInitialState(
  model: ProposalPreparationReadModel,
): PreparationState {
  return {
    castNotice: null,
    castProblem: null,
    draftOperationalPlan: model.operationalPlan,
    draftProposedCastUserIds: model.proposedCastUserIds,
    model,
    phase: { kind: 'ready' },
    planNotice: null,
    planProblem: null,
    recordedOperationalPlan: model.operationalPlan,
    recordedProposedCastUserIds: model.proposedCastUserIds,
    submissionBlockers: [],
    submissionProblem: null,
  }
}

function reducer(
  state: PreparationState,
  action: StateAction,
): PreparationState {
  switch (action.type) {
    case 'reset':
      return createInitialState(action.model)
    case 'edit-plan':
      return {
        ...state,
        draftOperationalPlan: action.plan,
        planNotice: null,
        planProblem: null,
        submissionBlockers: [],
      }
    case 'edit-cast':
      return {
        ...state,
        castNotice: null,
        castProblem: null,
        draftProposedCastUserIds: action.userIds,
        submissionBlockers: [],
      }
    case 'save-started':
      return {
        ...state,
        castNotice:
          action.partition === 'proposedCast' ? null : state.castNotice,
        castProblem:
          action.partition === 'proposedCast' ? null : state.castProblem,
        phase: { kind: 'saving', partition: action.partition },
        planNotice:
          action.partition === 'operationalPlan' ? null : state.planNotice,
        planProblem:
          action.partition === 'operationalPlan' ? null : state.planProblem,
      }
    case 'save-confirmed':
      return action.partition === 'operationalPlan'
        ? {
            ...state,
            draftOperationalPlan: action.plan,
            planNotice: 'Plan saved.',
            recordedOperationalPlan: action.plan,
          }
        : {
            ...state,
            castNotice: 'Proposed Cast saved.',
            draftProposedCastUserIds: action.userIds,
            recordedProposedCastUserIds: action.userIds,
          }
    case 'save-failed':
      return {
        ...state,
        castProblem:
          action.partition === 'proposedCast'
            ? action.problem
            : state.castProblem,
        phase: { kind: 'ready' },
        planProblem:
          action.partition === 'operationalPlan'
            ? action.problem
            : state.planProblem,
      }
    case 'refresh-started':
      return {
        ...state,
        phase: { kind: 'refreshing', partition: action.partition },
      }
    case 'refreshed': {
      const planDirty = !plansEqual(
        state.draftOperationalPlan,
        state.recordedOperationalPlan,
      )
      const castDirty = !setsEqual(
        state.draftProposedCastUserIds,
        state.recordedProposedCastUserIds,
      )

      return {
        ...state,
        draftOperationalPlan:
          action.partition === 'operationalPlan' || !planDirty
            ? action.model.operationalPlan
            : state.draftOperationalPlan,
        draftProposedCastUserIds:
          action.partition === 'proposedCast' || !castDirty
            ? action.model.proposedCastUserIds
            : state.draftProposedCastUserIds,
        model: action.model,
        phase: { kind: 'ready' },
        recordedOperationalPlan: action.model.operationalPlan,
        recordedProposedCastUserIds: action.model.proposedCastUserIds,
        submissionBlockers: [],
      }
    }
    case 'refresh-failed':
      return {
        ...state,
        phase: {
          kind: 'stale',
          partition: action.partition,
          problem: action.problem,
        },
      }
    case 'submit-started':
      return {
        ...state,
        phase: { kind: 'submitting' },
        submissionBlockers: [],
        submissionProblem: null,
      }
    case 'submit-failed':
      return {
        ...state,
        phase: { kind: 'ready' },
        submissionBlockers: action.blockers,
        submissionProblem: action.problem,
      }
    case 'submitted':
      return {
        ...state,
        phase: {
          kind: 'submitted',
          revisionNumber: action.revisionNumber,
          workspaceFresh: false,
        },
      }
    case 'workspace-invalidated':
      return state.phase.kind === 'submitted'
        ? {
            ...state,
            phase: { ...state.phase, workspaceFresh: true },
          }
        : state
    case 'workspace-invalidation-failed':
      return state.phase.kind === 'submitted'
        ? {
            ...state,
            phase: { ...state.phase, workspaceFresh: false },
            submissionProblem: action.problem,
          }
        : state
  }
}

export function createProposalPreparationModule(
  dependencies: ModuleDependencies,
): ProposalPreparationModule {
  const PreparationContext = createContext<PreparationContextValue | null>(null)

  function usePreparation() {
    const value = useContext(PreparationContext)
    if (!value) {
      throw new Error('Proposal preparation must be rendered inside its Root.')
    }
    return value
  }

  function Root({
    children,
    initial,
  }: {
    children: ReactNode
    initial: ProposalPreparationReadModel
  }) {
    const [state, dispatch] = useReducer(reducer, initial, createInitialState)
    const invalidateEventWorkspace = dependencies.useInvalidateEventWorkspace()

    useEffect(() => {
      if (initial.eventId !== state.model.eventId) {
        dispatch({ model: initial, type: 'reset' })
      }
    }, [initial, state.model.eventId])

    const setOperationalPlan: Dispatch<SetStateAction<OperationalPlan>> = (
      update,
    ) => {
      const plan =
        typeof update === 'function'
          ? update(state.draftOperationalPlan)
          : update
      dispatch({ plan, type: 'edit-plan' })
    }

    const refresh = async (partition: Partition) => {
      dispatch({ partition, type: 'refresh-started' })
      const result = await dependencies.adapter.refresh({
        eventSlug: state.model.eventSlug,
        theaterSlug: state.model.theater.slug,
      })
      if (!result.ok) {
        dispatch({
          partition,
          problem: result.problem,
          type: 'refresh-failed',
        })
        return
      }
      dispatch({ model: result.data, partition, type: 'refreshed' })
    }

    const saveOperationalPlan = async () => {
      if (state.phase.kind !== 'ready') return
      const plan = normalizePositions(state.draftOperationalPlan)
      dispatch({ partition: 'operationalPlan', type: 'save-started' })
      const result = await dependencies.adapter.saveOperationalPlan({
        eventId: state.model.eventId,
        ...plan,
      })
      if (!result.ok) {
        dispatch({
          partition: 'operationalPlan',
          problem: result.problem,
          type: 'save-failed',
        })
        return
      }
      dispatch({ partition: 'operationalPlan', plan, type: 'save-confirmed' })
      await refresh('operationalPlan')
    }

    const saveProposedCast = async () => {
      if (state.phase.kind !== 'ready') return
      dispatch({ partition: 'proposedCast', type: 'save-started' })
      const result = await dependencies.adapter.saveProposedCast({
        castMemberUserIds: state.draftProposedCastUserIds,
        commandId: dependencies.createId(),
        eventId: state.model.eventId,
      })
      if (!result.ok) {
        dispatch({
          partition: 'proposedCast',
          problem: result.problem,
          type: 'save-failed',
        })
        return
      }
      dispatch({
        partition: 'proposedCast',
        type: 'save-confirmed',
        userIds: result.data.castMemberUserIds,
      })
      await refresh('proposedCast')
    }

    const submitProposalRevision = async () => {
      if (!canSubmit(state)) return
      dispatch({ type: 'submit-started' })
      const result = await dependencies.adapter.submitProposalRevision({
        commandId: dependencies.createId(),
        eventId: state.model.eventId,
      })
      if (!result.ok) {
        dispatch({
          blockers: result.blockers,
          problem: result.problem,
          type: 'submit-failed',
        })
        return
      }
      dispatch({
        revisionNumber: result.data.revisionNumber,
        type: 'submitted',
      })
      try {
        await invalidateEventWorkspace()
        dispatch({ type: 'workspace-invalidated' })
      } catch {
        dispatch({
          problem: {
            message:
              'Proposal Revision submitted, but the Event workspace could not be refreshed.',
          },
          type: 'workspace-invalidation-failed',
        })
      }
    }

    const context: PreparationContextValue = {
      addCandidateSlot: (occurrenceId) =>
        setOperationalPlan((current) => ({
          ...current,
          occurrences: current.occurrences.map((occurrence) =>
            occurrence.id === occurrenceId
              ? {
                  ...occurrence,
                  candidateSlots: [
                    ...occurrence.candidateSlots,
                    newCandidateSlot(
                      occurrence.candidateSlots.length,
                      state.model,
                      dependencies.createId,
                    ),
                  ],
                }
              : occurrence,
          ),
        })),
      addOccurrence: () =>
        setOperationalPlan((current) => ({
          ...current,
          occurrences: [
            ...current.occurrences,
            {
              candidateSlots: [],
              confirmedCandidateSlotId: null,
              id: dependencies.createId(),
              position: current.occurrences.length,
              type: 'rehearsal',
              visibility: 'internal',
            },
          ],
        })),
      addResourceRequest: () =>
        setOperationalPlan((current) => ({
          ...current,
          resourceRequests: [
            ...current.resourceRequests,
            {
              id: dependencies.createId(),
              label: '',
              position: current.resourceRequests.length,
              quantity: 1,
              type: 'staff',
            },
          ],
        })),
      moveOccurrence: (from, to) =>
        setOperationalPlan((current) => ({
          ...current,
          occurrences: moveItem(current.occurrences, from, to),
        })),
      removeCandidateSlot: (occurrenceId, slotId) =>
        setOperationalPlan((current) => ({
          ...current,
          occurrences: current.occurrences.map((occurrence) =>
            occurrence.id === occurrenceId
              ? {
                  ...occurrence,
                  candidateSlots: occurrence.candidateSlots.filter(
                    ({ id }) => id !== slotId,
                  ),
                  confirmedCandidateSlotId:
                    occurrence.confirmedCandidateSlotId === slotId
                      ? null
                      : occurrence.confirmedCandidateSlotId,
                }
              : occurrence,
          ),
        })),
      removeOccurrence: (occurrenceId) =>
        setOperationalPlan((current) => ({
          ...current,
          occurrences: current.occurrences.filter(
            ({ id }) => id !== occurrenceId,
          ),
        })),
      removeResourceRequest: (requestId) =>
        setOperationalPlan((current) => ({
          ...current,
          resourceRequests: current.resourceRequests.filter(
            ({ id }) => id !== requestId,
          ),
        })),
      retryRefresh: async () => {
        if (state.phase.kind !== 'stale') return
        await refresh(state.phase.partition)
      },
      saveOperationalPlan,
      saveProposedCast,
      setOperationalPlan,
      setProposedCastMember: (userId, selected) => {
        const userIds = selected
          ? [...state.draftProposedCastUserIds, userId]
          : state.draftProposedCastUserIds.filter(
              (candidate) => candidate !== userId,
            )
        dispatch({ type: 'edit-cast', userIds })
      },
      state,
      submitProposalRevision,
      updateCandidateSlot: (occurrenceId, slotId, update) =>
        setOperationalPlan((current) => ({
          ...current,
          occurrences: current.occurrences.map((occurrence) =>
            occurrence.id === occurrenceId
              ? {
                  ...occurrence,
                  candidateSlots: occurrence.candidateSlots.map((slot) =>
                    slot.id === slotId ? { ...slot, ...update } : slot,
                  ),
                }
              : occurrence,
          ),
        })),
      updateOccurrence: (occurrenceId, update) =>
        setOperationalPlan((current) => ({
          ...current,
          occurrences: current.occurrences.map((occurrence) =>
            occurrence.id === occurrenceId
              ? { ...occurrence, ...update }
              : occurrence,
          ),
        })),
      updateResourceRequest: (requestId, update) =>
        setOperationalPlan((current) => ({
          ...current,
          resourceRequests: current.resourceRequests.map((request) =>
            request.id === requestId ? { ...request, ...update } : request,
          ),
        })),
    }

    return (
      <PreparationContext.Provider value={context}>
        {children}
      </PreparationContext.Provider>
    )
  }

  const { PlanSection, ProposedCastSection, RevisionSection } =
    createProposalPreparationSections(usePreparation)

  return { PlanSection, ProposedCastSection, RevisionSection, Root }
}

function newCandidateSlot(
  position: number,
  model: ProposalPreparationReadModel,
  createId: () => string,
): OperationalPlan['occurrences'][number]['candidateSlots'][number] {
  return {
    durationMinutes: 120,
    id: createId(),
    localStartsAt: '',
    locationKind: 'primary_venue',
    locationName: model.theater.primaryVenueName,
    offSiteApproved: false,
    position,
    resourceId: model.theater.primaryVenueId,
    timezoneName: model.theater.timezoneName,
    timezoneSource: model.theater.timezoneSource,
  }
}

function moveItem<T>(items: T[], from: number, to: number) {
  const next = [...items]
  const [item] = next.splice(from, 1)
  if (item !== undefined) next.splice(to, 0, item)
  return next
}

function normalizePositions(plan: OperationalPlan): OperationalPlan {
  return {
    ...plan,
    occurrences: plan.occurrences.map((occurrence, position) => ({
      ...occurrence,
      candidateSlots: occurrence.candidateSlots.map((slot, slotPosition) => ({
        ...slot,
        position: slotPosition,
      })),
      position,
    })),
    resourceRequests: plan.resourceRequests.map((request, position) => ({
      ...request,
      position,
    })),
  }
}
