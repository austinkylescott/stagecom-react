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
    <main className="page-wrap py-10 sm:py-14">
      <section className="island-shell rounded-lg px-6 py-7 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
          Not found
        </p>
        <h1 className="display-title mt-3 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--sea-ink-soft)]">
          This page is not available. Return to Callsheet to choose an available
          next step.
        </p>
        <Link
          className="mt-6 inline-flex rounded-md bg-[var(--sea-ink)] px-4 py-3 text-sm font-extrabold text-white no-underline focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]/35"
          to="/app/callsheet"
        >
          Return to Callsheet
        </Link>
      </section>
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
