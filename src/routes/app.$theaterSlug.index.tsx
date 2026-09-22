import { createFileRoute } from '@tanstack/react-router'
import { WorkQueue } from '@/features/work-queue/components'
import { getTheaterWorkQueueFn } from '@/features/work-queue/server-functions'

export const Route = createFileRoute('/app/$theaterSlug/')({
  staleTime: 0,
  gcTime: 0,
  loader: async ({ params }) => {
    const result = await getTheaterWorkQueueFn({
      data: { theaterSlug: params.theaterSlug },
    })
    if (!result.ok) throw result.error
    return result.data
  },
  pendingComponent: () => (
    <p role="status" className="page-wrap py-8">
      Loading current Theater work…
    </p>
  ),
  component: TheaterWorkPage,
})

function TheaterWorkPage() {
  const { items, canResolveWork } = Route.useLoaderData()
  const { theater } = Route.useRouteContext()
  return (
    <main className="page-wrap py-8 sm:py-12">
      <p className="text-sm font-bold text-[var(--kicker)]">{theater.name}</p>
      <h1 className="display-title mt-3 text-4xl font-bold">
        Theater Operations
      </h1>
      {canResolveWork ? (
        <WorkQueue items={items} />
      ) : (
        <p className="mt-4">
          Choose Events, Calendar, or People to explore your Theater.
        </p>
      )}
    </main>
  )
}
