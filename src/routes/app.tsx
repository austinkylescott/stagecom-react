import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { WorkspaceHeader, WorkspaceNav } from '@/components/stage/workspace-nav'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import {
  WorkspaceErrorState,
  WorkspaceLoadingState,
} from '@/features/application-shell/components'
import { getCurrentUserFn } from '@/features/auth/server-functions'
import { getMyTheatersFn } from '@/features/theaters/server-functions'
import { getMyUpcomingCallsFn } from '@/features/callsheet/server-functions'
import { MobilePersonalAgenda } from '@/features/callsheet/personal-agenda'

export const Route = createFileRoute('/app')({
  beforeLoad: async ({ location }) => {
    const [currentUser, theaters] = await Promise.all([
      getCurrentUserFn(),
      getMyTheatersFn(),
    ])

    if (!currentUser.ok) {
      throw redirect({
        to: '/login',
        search: {
          next: location.href,
        },
      })
    }

    if (!theaters.ok) {
      throw theaters.error
    }

    if (location.pathname === '/app') {
      throw redirect({ to: '/app/callsheet' })
    }

    return {
      currentUser: currentUser.data,
      theaters: theaters.data.theaters,
    }
  },
  errorComponent: ({ error }) => <WorkspaceErrorState error={error} />,
  loader: () => getMyUpcomingCallsFn(),
  staleTime: 30_000,
  pendingComponent: WorkspaceLoadingState,
  component: AppLayout,
})

function AppLayout() {
  const { currentUser, theaters } = Route.useRouteContext()
  const callsResult = Route.useLoaderData()
  const calls = callsResult.ok ? callsResult.data : []

  return (
    <SidebarProvider>
      <WorkspaceNav
        email={currentUser.email}
        theaters={theaters}
        calls={calls}
        callsFailed={!callsResult.ok}
      />
      <SidebarInset className="min-w-0">
        <WorkspaceHeader email={currentUser.email} />
        <MobilePersonalAgenda calls={calls} failed={!callsResult.ok} />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
