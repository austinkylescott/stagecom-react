import type { OperationalPlan, ProposalPreparationReadModel } from './types'

export type Partition = 'operationalPlan' | 'proposedCast'

export type PresentedProblem = {
  message: string
}

export type Phase =
  | { kind: 'ready' }
  | { kind: 'saving'; partition: Partition }
  | { kind: 'refreshing'; partition: Partition }
  | { kind: 'stale'; partition: Partition; problem: PresentedProblem }
  | { kind: 'submitting' }
  | { kind: 'submitted'; revisionNumber: number; workspaceFresh: boolean }

export type PreparationState = {
  castNotice: string | null
  castProblem: PresentedProblem | null
  draftOperationalPlan: OperationalPlan
  draftProposedCastUserIds: string[]
  model: ProposalPreparationReadModel
  phase: Phase
  planNotice: string | null
  planProblem: PresentedProblem | null
  recordedOperationalPlan: OperationalPlan
  recordedProposedCastUserIds: string[]
  submissionBlockers: Array<{ code: string; message: string }>
  submissionProblem: PresentedProblem | null
}

export function canSubmit(state: PreparationState) {
  return (
    state.phase.kind === 'ready' &&
    state.model.capabilities.submitProposalRevision &&
    plansEqual(state.draftOperationalPlan, state.recordedOperationalPlan) &&
    setsEqual(state.draftProposedCastUserIds, state.recordedProposedCastUserIds)
  )
}

export function isPartitionBusy(phase: Phase, partition: Partition) {
  return (
    (phase.kind === 'saving' || phase.kind === 'refreshing') &&
    phase.partition === partition
  )
}

export function isPartitionFrozen(phase: Phase, partition: Partition) {
  return (
    isPartitionBusy(phase, partition) ||
    (phase.kind === 'stale' && phase.partition === partition) ||
    phase.kind === 'submitting' ||
    phase.kind === 'submitted'
  )
}

export function isRemoteTransition(phase: Phase) {
  return (
    phase.kind === 'saving' ||
    phase.kind === 'refreshing' ||
    phase.kind === 'stale' ||
    phase.kind === 'submitting' ||
    phase.kind === 'submitted'
  )
}

export function plansEqual(left: OperationalPlan, right: OperationalPlan) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function setsEqual(left: string[], right: string[]) {
  const sortedRight = [...right].sort()
  return (
    left.length === right.length &&
    [...left].sort().every((value, index) => value === sortedRight[index])
  )
}
