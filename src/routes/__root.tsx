import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '@/integrations/tanstack-query/devtools'
import { PublicNav } from '@/components/stage/app-nav'

import appCss from '@/styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Stagecom',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  component: RootRoute,
  notFoundComponent: RootNotFound,
  shellComponent: RootDocument,
})

function RootRoute() {
  const { isAppRoute, isOperationalPrototype } = useRouterState({
    select: (state) => ({
      isAppRoute:
        state.location.pathname === '/app' ||
        state.location.pathname.startsWith('/app/'),
      isOperationalPrototype:
        state.location.pathname === '/dev/operational-workspaces-prototype',
    }),
  })

  return (
    <>
      {isAppRoute || isOperationalPrototype ? null : <PublicNav />}
      <Outlet />
    </>
  )
}

function RootNotFound() {
  return (
    <main className="page-wrap py-6">
      <Card className=" px-6 py-7 sm:px-8 gap-0">
        <p className="text-xs font-medium tracking-normal text-muted-foreground">
          Not found
        </p>
        <h1 className="display-title mt-3 text-2xl font-medium text-foreground sm:text-2xl">
          Page not found
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          This page is not available. Return to Callsheet to choose an available
          next step.
        </p>
        <Button asChild variant="default" className="mt-6">
          <Link to="/app/callsheet">Return to Callsheet</Link>
        </Button>
      </Card>
    </main>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
