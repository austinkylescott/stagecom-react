import { OperationalExceptions } from '@/features/operational-exceptions/components'
import { createFileRoute } from '@tanstack/react-router'
import { WorkQueue } from '@/features/work-queue/components'
import { getTheaterOperationsFn } from '@/features/theater-operations/server-functions'
import {
  TheaterOperationsCockpit,
  TheaterOperationsErrorState,
} from '@/features/theater-operations/components'

export const Route = createFileRoute('/app/$theaterSlug/')({
  staleTime: 0,
  gcTime: 0,
  loader: async ({ params }) => {
    const result = await getTheaterOperationsFn({
      data: { theaterSlug: params.theaterSlug },
    })
    if (!result.ok) throw result.error
    return result.data
  },
  pendingComponent: () => (
    <p role="status" className="page-wrap py-8">
      Loading Theater Operations…
    </p>
  ),
  component: TheaterWorkPage,
  errorComponent: TheaterOperationsErrorState,
})

function TheaterWorkPage() {
  const {
    work: { items, exceptions, canResolveWork },
    theater,
    cockpit,
  } = Route.useLoaderData()
  return (
    <main className="page-wrap break-words py-6 sm:py-8">
      <p className="text-sm font-bold text-[var(--kicker)]">{theater.name}</p>
      <h1 className="display-title mt-3 text-4xl font-bold">
        Theater Operations
      </h1>
      {cockpit ? (
        <TheaterOperationsCockpit model={cockpit} theater={theater} />
      ) : (
        <>
          {canResolveWork ? (
            <WorkQueue items={items} />
          ) : (
            <p className="mt-4">
              Choose Events, Calendar, or People to explore your Theater.
            </p>
          )}
          {canResolveWork || exceptions.length > 0 ? (
            <OperationalExceptions items={exceptions} />
          ) : null}
        </>
      )}
    </main>
  )
}
