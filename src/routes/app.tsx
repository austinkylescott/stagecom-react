import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { AppNav } from '@/components/stage/app-nav'
import { getCurrentUserFn } from '@/features/auth/server-functions'

export const Route = createFileRoute('/app')({
  beforeLoad: async ({ location }) => {
    const currentUser = await getCurrentUserFn()

    if (!currentUser.ok) {
      throw redirect({
        to: '/login',
        search: {
          next: location.href,
        },
      })
    }

    return {
      currentUser: currentUser.data,
    }
  },
  component: AppLayout,
})

function AppLayout() {
  const { currentUser } = Route.useRouteContext()

  return (
    <>
      <AppNav email={currentUser.email} />
      <Outlet />
    </>
  )
}
