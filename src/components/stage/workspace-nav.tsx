import { useEffect, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  Bell,
  CalendarDays,
  ChevronsUpDown,
  ClipboardList,
  LogOut,
  Theater,
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
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import type {
  CallsheetTheater,
  CallsheetCommitment,
} from '@/features/callsheet/read-model'
import { PersonalAgenda } from '@/features/callsheet/personal-agenda'

export function WorkspaceNav({
  email,
  theaters,
  calls = [],
  callsFailed = false,
}: {
  email?: string
  theaters: CallsheetTheater[]
  calls?: CallsheetCommitment[]
  callsFailed?: boolean
}) {
  const { setOpenMobile } = useSidebar()
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
  const close = () => setOpenMobile(false)
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link to="/app/callsheet" onClick={close}>
                <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Theater className="size-4" />
                </div>
                <span className="font-semibold">Stagecom</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton aria-label="Change Theater">
                  <span className="truncate">
                    {current?.name ?? 'Choose a Theater'}
                  </span>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="start">
                <DropdownMenuLabel>Theaters</DropdownMenuLabel>
                {theaters.map((theater) => (
                  <DropdownMenuItem asChild key={theater.id}>
                    <Link
                      to={destination}
                      params={{ theaterSlug: theater.slug }}
                      onClick={() => {
                        setSelectedSlug(theater.slug)
                        close()
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
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <nav aria-label="Workspace navigation">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/app/callsheet'}
                  >
                    <Link to="/app/callsheet" onClick={close}>
                      <ClipboardList />
                      <span>Callsheet</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {current && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.endsWith('/calendar')}
                      >
                        <Link
                          to="/app/$theaterSlug/calendar"
                          params={{ theaterSlug: current.slug }}
                          onClick={close}
                        >
                          <CalendarDays />
                          <span>Calendar</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === `/app/${current.slug}`}
                      >
                        <Link
                          to="/app/$theaterSlug"
                          params={{ theaterSlug: current.slug }}
                          onClick={close}
                        >
                          <Theater />
                          <span>{current.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.endsWith('/members')}
                      >
                        <Link
                          to="/app/$theaterSlug/members"
                          params={{ theaterSlug: current.slug }}
                          onClick={close}
                        >
                          <UsersRound />
                          <span>People</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
        <PersonalAgenda calls={calls} failed={callsFailed} />
      </SidebarContent>
      <SidebarFooter className="hidden md:flex">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/app/notifications'}
            >
              <Link to="/app/notifications">
                <Bell />
                <span>Notifications</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <WorkspaceAccount email={email} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

export function WorkspaceHeader({ email }: { email?: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger aria-label="Open navigation" />
      <span className="text-sm font-medium">Workspace</span>
      <div className="ml-auto flex items-center gap-2 md:hidden">
        <Button variant="ghost" size="icon" asChild>
          <Link aria-label="Notifications" to="/app/notifications">
            <Bell />
          </Link>
        </Button>
        <WorkspaceAccount email={email} compact />
      </div>
    </header>
  )
}

function WorkspaceAccount({
  email,
  compact = false,
}: {
  email?: string
  compact?: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <Button variant="ghost" size="icon" aria-label="Account">
            <Avatar className="size-7">
              <AvatarFallback>
                {email?.charAt(0).toUpperCase() ?? 'A'}
              </AvatarFallback>
            </Avatar>
          </Button>
        ) : (
          <SidebarMenuButton size="lg" aria-label="Account">
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg">
                {email?.charAt(0).toUpperCase() ?? 'A'}
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 text-left text-sm">
              <span className="font-medium">Account</span>
              <span className="truncate text-xs text-muted-foreground">
                {email}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </SidebarMenuButton>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={compact ? 'bottom' : 'top'}
        align="end"
        className="w-64"
      >
        <DropdownMenuLabel className="break-all">
          {email ?? 'Account'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/logout">
            <LogOut />
            Sign out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
