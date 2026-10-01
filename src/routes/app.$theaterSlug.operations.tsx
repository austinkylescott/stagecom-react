import { createFileRoute } from '@tanstack/react-router'
import { getTheaterOperationsFn } from '@/features/theater-operations/server-functions'
import {
  TheaterOperationsCockpit,
  TheaterOperationsErrorState,
} from '@/features/theater-operations/components'

export const Route = createFileRoute('/app/$theaterSlug/operations')({
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
  const { theater, cockpit } = Route.useLoaderData()
  return (
    <main className="page-wrap break-words py-6 sm:py-8">
      <p className="text-sm font-medium text-muted-foreground">
        {theater.name}
      </p>
      <h1 className="display-title mt-3 text-2xl font-medium">
        Theater Operations
      </h1>
      <TheaterOperationsCockpit model={cockpit} theater={theater} />
    </main>
  )
}
