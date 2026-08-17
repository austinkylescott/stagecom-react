import { useRouter } from '@tanstack/react-router'

import {
  getProposalPreparationFn,
  saveEventOperationalPlanFn,
  saveEventProposedCastFn,
  submitEventProposalRevisionFn,
} from '../server-functions'
import { createProposalPreparationModule } from './module'

import type {
  ProposalPreparationAdapter,
  ProposalPreparationAdapterResult,
} from './module'

const productionAdapter: ProposalPreparationAdapter = {
  refresh: (input) =>
    projectServerFunctionCall(
      () => getProposalPreparationFn({ data: input }),
      'Proposal preparation could not be refreshed.',
    ),
  saveOperationalPlan: (input) =>
    projectServerFunctionCall(
      () => saveEventOperationalPlanFn({ data: input }),
      'Operational plan could not be saved.',
    ),
  saveProposedCast: (input) =>
    projectServerFunctionCall(
      () => saveEventProposedCastFn({ data: input }),
      'Proposed Cast could not be saved.',
    ),
  submitProposalRevision: (input) =>
    projectServerFunctionCall(
      () => submitEventProposalRevisionFn({ data: input }),
      'Proposal Revision could not be submitted.',
    ),
}

function useInvalidateEventWorkspace() {
  const router = useRouter()
  return async () => {
    await router.invalidate({ sync: true })
  }
}

export const ProposalPreparation = createProposalPreparationModule({
  adapter: productionAdapter,
  createId: () => crypto.randomUUID(),
  useInvalidateEventWorkspace,
})

export async function projectServerFunctionCall<T>(
  call: () => Promise<
    | { data: T; ok: true }
    | {
        error: { details?: unknown; message: string }
        ok: false
      }
  >,
  unexpectedMessage: string,
): Promise<ProposalPreparationAdapterResult<T>> {
  try {
    const result = await call()
    if (result.ok) return result

    return {
      blockers: projectBlockers(result.error.details),
      ok: false,
      problem: { message: result.error.message },
    }
  } catch {
    return {
      blockers: [],
      ok: false,
      problem: { message: unexpectedMessage },
    }
  }
}

function projectBlockers(details: unknown) {
  if (!Array.isArray(details)) return []
  return details.filter(
    (detail): detail is { code: string; message: string } =>
      typeof detail === 'object' &&
      detail !== null &&
      'code' in detail &&
      typeof detail.code === 'string' &&
      'message' in detail &&
      typeof detail.message === 'string',
  )
}
