import type { ComponentType } from 'react'
import { Link } from '@tanstack/react-router'
import {
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Eye,
  LogOut,
  Menu,
  Settings,
  Theater,
  UserRound,
  UsersRound,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from '@/components/ui/navigation-menu'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

type AppNavProps = {
  email?: string
}

type TheaterNavProps = {
  theaterSlug: string
}

type IconComponent = ComponentType<{ className?: string }>

type AppNavItem = {
  icon: IconComponent
  label: string
  to: '/app/callsheet' | '/onboarding'
}

type TheaterNavItem = {
  accent: 'event' | 'performer' | 'theater'
  exact?: boolean
  icon: IconComponent
  label: string
  to:
    | '/app/$theaterSlug'
    | '/app/$theaterSlug/events'
    | '/app/$theaterSlug/members'
    | '/app/$theaterSlug/settings'
    | '/app/$theaterSlug/preview'
}

const appNavItems: AppNavItem[] = [
  {
    icon: ClipboardList,
    label: 'My Callsheet',
    to: '/app/callsheet',
  },
  {
    icon: Theater,
    label: 'Onboarding',
    to: '/onboarding',
  },
]

const theaterNavItems: TheaterNavItem[] = [
  {
    accent: 'theater',
    exact: true,
    icon: ClipboardList,
    label: 'Callsheet',
    to: '/app/$theaterSlug',
  },
  {
    accent: 'event',
    icon: CalendarDays,
    label: 'Events',
    to: '/app/$theaterSlug/events',
  },
  {
    accent: 'performer',
    icon: UsersRound,
    label: 'Members',
    to: '/app/$theaterSlug/members',
  },
  {
    accent: 'theater',
    icon: Settings,
    label: 'Settings',
    to: '/app/$theaterSlug/settings',
  },
  {
    accent: 'event',
    icon: Eye,
    label: 'Preview',
    to: '/app/$theaterSlug/preview',
  },
]

const appNavLinkClass =
  'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-extrabold text-[var(--sea-ink-soft)] no-underline outline-none transition hover:bg-[var(--theater-soft)] hover:text-[var(--theater-ink)] focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]/35 [&.is-active]:bg-[var(--theater-soft)] [&.is-active]:text-[var(--theater-ink)]'

const mobileNavLinkClass =
  'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-extrabold text-[var(--sea-ink)] no-underline hover:bg-[var(--theater-soft)]'

const theaterNavLinkBaseClass =
  'group inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-transparent px-3 text-sm font-extrabold text-[var(--sea-ink-soft)] no-underline outline-none transition hover:bg-[var(--surface-strong)] hover:text-[var(--sea-ink)] focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]/35 [&.is-active]:bg-[var(--surface-strong)] [&.is-active]:text-[var(--sea-ink)] [&.is-active]:shadow-[var(--shadow-hard-sm)]'

const accentClassNames = {
  event:
    '[&.is-active]:border-[var(--event)] [&.is-active_svg]:text-[var(--event)] group-hover:[&_svg]:text-[var(--event)]',
  performer:
    '[&.is-active]:border-[var(--performer)] [&.is-active_svg]:text-[var(--performer)] group-hover:[&_svg]:text-[var(--performer)]',
  theater:
    '[&.is-active]:border-[var(--theater)] [&.is-active_svg]:text-[var(--theater-ink)] group-hover:[&_svg]:text-[var(--theater-ink)]',
} satisfies Record<TheaterNavItem['accent'], string>

export function AppNav({ email }: AppNavProps) {
  const accountInitial = getAccountInitial(email)

  return (
    <header className="border-b border-[var(--line)] bg-[var(--header-bg)] backdrop-blur">
      <div className="page-wrap flex min-h-16 items-center justify-between gap-4 py-3">
        <Link
          className="inline-flex items-center gap-2 text-xl font-black text-[var(--sea-ink)] no-underline"
          to="/app/callsheet"
        >
          <span className="grid size-9 place-items-center rounded-md border border-[var(--chip-line)] bg-[var(--theater-soft)] text-[var(--theater-ink)]">
            <Theater className="size-5" />
          </span>
          <span className="display-title text-2xl">Stagecom</span>
        </Link>

        <NavigationMenu
          className="hidden justify-start md:flex"
          viewport={false}
        >
          <NavigationMenuList className="justify-start gap-1">
            {appNavItems.map((item) => (
              <NavigationMenuItem key={item.to}>
                <AppNavLink item={item} />
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <AccountMenu accountInitial={accountInitial} email={email} />
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              aria-label="Open navigation"
              className="border-[var(--line)] bg-[var(--surface-strong)] text-[var(--sea-ink)] hover:bg-[var(--theater-soft)] md:hidden"
              size="icon"
              variant="outline"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            className="border-[var(--line)] bg-[var(--paper)]"
            side="right"
          >
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-left text-xl font-black text-[var(--sea-ink)]">
                <Theater className="size-5 text-[var(--theater-ink)]" />
                Stagecom
              </SheetTitle>
              <SheetDescription className="truncate text-left">
                {email ?? 'App navigation'}
              </SheetDescription>
            </SheetHeader>
            <nav aria-label="App navigation" className="grid gap-1 px-4">
              {appNavItems.map((item) => (
                <SheetClose asChild key={item.to}>
                  <Link
                    activeProps={{ className: 'is-active' }}
                    className={cn(
                      mobileNavLinkClass,
                      '[&.is-active]:bg-[var(--theater-soft)] [&.is-active]:text-[var(--theater-ink)]',
                    )}
                    to={item.to}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                </SheetClose>
              ))}
            </nav>
            <Separator className="bg-[var(--line)]" />
            <div className="grid gap-3 px-4">
              <div className="flex items-center gap-3 rounded-md border border-[var(--line)] bg-[var(--surface-strong)] p-3">
                <AccountAvatar accountInitial={accountInitial} />
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-[var(--sea-ink)]">
                    Account
                  </p>
                  {email ? (
                    <p className="truncate text-xs font-bold text-[var(--sea-ink-soft)]">
                      {email}
                    </p>
                  ) : null}
                </div>
              </div>
              <SheetClose asChild>
                <Link
                  className={cn(
                    mobileNavLinkClass,
                    'text-[var(--performer-ink)] hover:bg-[var(--performer-soft)]',
                  )}
                  to="/logout"
                >
                  <LogOut className="size-4" />
                  Sign out
                </Link>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

export function TheaterNav({ theaterSlug }: TheaterNavProps) {
  return (
    <div className="border-b border-[var(--line)] bg-[var(--paper)]">
      <div className="page-wrap grid gap-3 py-4 lg:grid-cols-[minmax(180px,240px)_1fr] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--kicker)]">
            Theater workspace
          </p>
          <h2 className="mt-1 truncate text-lg font-black text-[var(--sea-ink)]">
            {theaterSlug}
          </h2>
        </div>
        <nav
          aria-label="Theater navigation"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:justify-end"
        >
          {theaterNavItems.map((item) => (
            <TheaterNavLink
              item={item}
              key={item.to}
              theaterSlug={theaterSlug}
            />
          ))}
        </nav>
      </div>
    </div>
  )
}

function AppNavLink({ item }: { item: AppNavItem }) {
  return (
    <Link
      activeProps={{ className: 'is-active' }}
      className={appNavLinkClass}
      to={item.to}
    >
      <item.icon className="size-4" />
      {item.label}
    </Link>
  )
}

function TheaterNavLink({
  item,
  theaterSlug,
}: {
  item: TheaterNavItem
  theaterSlug: string
}) {
  return (
    <Link
      activeOptions={item.exact ? { exact: true } : undefined}
      activeProps={{ className: 'is-active' }}
      className={cn(theaterNavLinkBaseClass, accentClassNames[item.accent])}
      params={{ theaterSlug }}
      to={item.to}
    >
      <item.icon className="size-4 transition-colors" />
      {item.label}
    </Link>
  )
}

function AccountMenu({
  accountInitial,
  email,
}: {
  accountInitial: string
  email?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="h-10 gap-2 border-[var(--line)] bg-[var(--surface-strong)] px-2 pr-3 text-[var(--sea-ink)] hover:bg-[var(--theater-soft)]"
          variant="outline"
        >
          <AccountAvatar accountInitial={accountInitial} />
          <span className="max-w-[180px] truncate text-sm font-extrabold">
            {email ?? 'Account'}
          </span>
          <ChevronDown className="size-4 text-[var(--sea-ink-soft)]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 border-[var(--line)] bg-[var(--paper-strong)]"
      >
        <DropdownMenuLabel className="grid gap-1">
          <span className="text-sm font-extrabold text-[var(--sea-ink)]">
            Signed in
          </span>
          {email ? (
            <span className="truncate text-xs font-bold text-[var(--sea-ink-soft)]">
              {email}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[var(--line)]" />
        <DropdownMenuItem asChild>
          <Link className="cursor-pointer" to="/app/callsheet">
            <ClipboardList className="size-4" />
            My Callsheet
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link className="cursor-pointer" to="/onboarding">
            <UserRound className="size-4" />
            Onboarding
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[var(--line)]" />
        <DropdownMenuItem asChild variant="destructive">
          <Link className="cursor-pointer" to="/logout">
            <LogOut className="size-4" />
            Sign out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function AccountAvatar({ accountInitial }: { accountInitial: string }) {
  return (
    <Avatar
      className="border border-[var(--chip-line)] bg-[var(--theater-soft)]"
      size="sm"
    >
      <AvatarFallback className="bg-[var(--theater-soft)] text-xs font-black text-[var(--theater-ink)]">
        {accountInitial}
      </AvatarFallback>
    </Avatar>
  )
}

function getAccountInitial(email?: string) {
  return email?.trim().charAt(0).toUpperCase() || 'S'
}
