import { createFileRoute } from '@tanstack/react-router'
import {
  PublicProgramming,
  PublicProgrammingPending,
  PublicProgrammingError,
} from '@/features/public-programming/components'
import { getPublicProgrammingFn } from '@/features/public-programming/server-functions'

export const Route = createFileRoute('/theater/')({
  staleTime: 0,
  gcTime: 0,
  loader: async () => {
    const result = await getPublicProgrammingFn()
    if (!result.ok) throw result.error
    return result.data
  },
  pendingComponent: PublicProgrammingPending,
  errorComponent: PublicProgrammingError,
  component: Discovery,
})

function Discovery() {
  return <PublicProgramming theaters={Route.useLoaderData().theaters} />
}
