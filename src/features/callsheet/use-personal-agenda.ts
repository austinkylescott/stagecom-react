import { useState } from 'react'

import { appError, err } from '@/server/errors'
import { getMyUpcomingCallsFn } from './server-functions'

type AgendaResult = Awaited<ReturnType<typeof getMyUpcomingCallsFn>>

export function usePersonalAgenda(loaded: AgendaResult) {
  const [retried, setRetried] = useState<{
    source: AgendaResult
    result: AgendaResult
  }>()
  // A new route load supersedes any earlier retry, including one still in flight.
  const result = retried?.source === loaded ? retried.result : loaded

  async function onRetry() {
    let next: AgendaResult
    try {
      next = await getMyUpcomingCallsFn()
    } catch {
      next = err(
        appError(
          'external_service_error',
          'Scheduled Events could not be loaded.',
        ),
      )
    }
    setRetried({ source: loaded, result: next })
  }

  return { calls: result.ok ? result.data : [], failed: !result.ok, onRetry }
}
