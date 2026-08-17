import type {
  ProposalPreparationAdapter,
  ProposalPreparationAdapterResult,
} from './module'
import type { OperationalPlan, ProposalPreparationReadModel } from './types'

type AdapterCalls = {
  refresh: Array<{ eventSlug: string; theaterSlug: string }>
  saveOperationalPlan: Array<OperationalPlan & { eventId: string }>
  saveProposedCast: Array<{
    castMemberUserIds: string[]
    commandId: string
    eventId: string
  }>
  submitProposalRevision: Array<{ commandId: string; eventId: string }>
}

type InMemoryAdapterOptions = {
  refreshResults?: Array<
    ProposalPreparationAdapterResult<ProposalPreparationReadModel>
  >
  revisionNumber?: number
}

export type InMemoryProposalPreparationAdapter = ProposalPreparationAdapter & {
  calls: AdapterCalls
}

export function createInMemoryProposalPreparationAdapter(
  initial: ProposalPreparationReadModel,
  options: InMemoryAdapterOptions = {},
): InMemoryProposalPreparationAdapter {
  let model = initial
  const refreshResults = [...(options.refreshResults ?? [])]
  const calls: AdapterCalls = {
    refresh: [],
    saveOperationalPlan: [],
    saveProposedCast: [],
    submitProposalRevision: [],
  }

  return {
    calls,
    refresh: async (input) => {
      calls.refresh.push(input)
      const result = refreshResults.shift() ?? { data: model, ok: true }
      if (result.ok) model = result.data
      return result
    },
    saveOperationalPlan: async (input) => {
      calls.saveOperationalPlan.push(input)
      model = {
        ...model,
        operationalPlan: input,
      }
      return { data: undefined, ok: true }
    },
    saveProposedCast: async (input) => {
      calls.saveProposedCast.push(input)
      model = {
        ...model,
        proposedCastUserIds: input.castMemberUserIds,
      }
      return {
        data: { castMemberUserIds: input.castMemberUserIds },
        ok: true,
      }
    },
    submitProposalRevision: async (input) => {
      calls.submitProposalRevision.push(input)
      return {
        data: { revisionNumber: options.revisionNumber ?? 1 },
        ok: true,
      }
    },
  }
}
