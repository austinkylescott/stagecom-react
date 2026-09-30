import { useEffect, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Menu,
  Theater,
  UsersRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { CallsheetTheater } from '@/features/callsheet/read-model'

const linkClass =
  'flex min-h-11 min-w-0 items-center gap-3 rounded-md px-3 text-sm no-underline hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 [&.is-active]:bg-muted [&.is-active]:font-semibold'

export function WorkspaceNav({
  email,
  theaters,
}: {
  email?: string
  theaters: CallsheetTheater[]
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const [selectedSlug, setSelectedSlug] = useState<string>()
  const routeTheater = theaters.find(
    (theater) => pathname.split('/')[2] === theater.slug,
  )
  useEffect(() => {
    if (routeTheater) setSelectedSlug(routeTheater.slug)
  }, [routeTheater])
  const current =
    routeTheater ??
    theaters.find((theater) => theater.slug === selectedSlug) ??
    theaters.find((theater) => theater.isDefault) ??
    theaters.at(0)
  const destination = pathname.endsWith('/calendar')
    ? '/app/$theaterSlug/calendar'
    : pathname.endsWith('/members')
      ? '/app/$theaterSlug/members'
      : '/app/$theaterSlug'

  function navigation(close = false) {
    const links = [
      <Link
        activeProps={{ className: 'is-active' }}
        className={linkClass}
        to="/app/callsheet"
      >
        <ClipboardList className="size-4 shrink-0" />
        Callsheet
      </Link>,
      ...(current
        ? [
            <Link
              activeProps={{ className: 'is-active' }}
              className={linkClass}
              to="/app/$theaterSlug/calendar"
              params={{ theaterSlug: current.slug }}
            >
              <CalendarDays className="size-4 shrink-0" />
              Calendar
            </Link>,
            <Link
              activeOptions={{ exact: true }}
              activeProps={{ className: 'is-active' }}
              className={linkClass}
              to="/app/$theaterSlug"
              params={{ theaterSlug: current.slug }}
            >
              <Theater className="size-4 shrink-0" />
              <span className="truncate">{current.name}</span>
            </Link>,
            <Link
              activeProps={{ className: 'is-active' }}
              className={linkClass}
              to="/app/$theaterSlug/members"
              params={{ theaterSlug: current.slug }}
            >
              <UsersRound className="size-4 shrink-0" />
              People
            </Link>,
          ]
        : []),
    ]
    return (
      <nav aria-label="Workspace navigation" className="grid gap-1">
        {links.map((link, index) =>
          close ? (
            <SheetClose asChild key={index}>
              {link}
            </SheetClose>
          ) : (
            <span key={index}>{link}</span>
          ),
        )}
      </nav>
    )
  }

  const switcher = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          aria-label="Change Theater"
          className="w-full justify-between"
        >
          <span className="truncate">
            {current?.name ?? 'Choose a Theater'}
          </span>
          <ChevronDown className="size-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="neutral-workspace w-64 max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel>Theaters</DropdownMenuLabel>
        {theaters.map((theater) => (
          <DropdownMenuItem asChild key={theater.id}>
            <Link
              to={destination}
              params={{ theaterSlug: theater.slug }}
              onClick={() => {
                setSelectedSlug(theater.slug)
                setDrawerOpen(false)
              }}
            >
              {theater.name}
            </Link>
          </DropdownMenuItem>
        ))}
        {!theaters.length && (
          <DropdownMenuItem asChild>
            <Link to="/onboarding/theater">Create a Theater</Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
  const controls = (
    <>
      <Button variant="ghost" size="icon" asChild>
        <Link aria-label="Notifications" to="/app/notifications">
          <Bell className="size-4" />
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" aria-label="Account">
            Account
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="neutral-workspace max-w-[calc(100vw-2rem)]"
        >
          <DropdownMenuLabel className="break-all">
            {email ?? 'Account'}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/logout">Sign out</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r bg-background p-4 md:flex">
        <Link
          to="/app/callsheet"
          className="mb-6 px-3 py-2 text-lg font-semibold no-underline"
        >
          Stagecom
        </Link>
        <div className="mb-4">{switcher}</div>
        {navigation()}
        <div className="mt-auto flex items-center gap-2 border-t pt-4">
          {controls}
        </div>
      </aside>
      <header className="flex min-h-16 items-center justify-between gap-2 border-b bg-background px-4 md:hidden">
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            <Button aria-label="Open navigation" size="icon" variant="ghost">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="neutral-workspace w-72 max-w-[85vw]"
          >
            <SheetHeader>
              <SheetTitle>Stagecom</SheetTitle>
              <SheetDescription>Workspace navigation</SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-4">
              {switcher}
              {navigation(true)}
            </div>
          </SheetContent>
        </Sheet>
        <Link to="/app/callsheet" className="font-semibold no-underline">
          Stagecom
        </Link>
        <div className="flex items-center gap-1">{controls}</div>
      </header>
    </>
  )
}
