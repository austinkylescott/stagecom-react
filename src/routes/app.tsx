import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { AppNav } from '@/components/stage/app-nav'
import {
  WorkspaceErrorState,
  WorkspaceLoadingState,
} from '@/features/application-shell/components'
import { getCurrentUserFn } from '@/features/auth/server-functions'
import { getMyTheatersFn } from '@/features/theaters/server-functions'

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
  pendingComponent: WorkspaceLoadingState,
  component: AppLayout,
})

function AppLayout() {
  const { currentUser, theaters } = Route.useRouteContext()

  return (
    <>
      <AppNav email={currentUser.email} theaters={theaters} />
      <Outlet />
    </>
  )
}
