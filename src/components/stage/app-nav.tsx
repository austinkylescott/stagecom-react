import { Link } from '@tanstack/react-router'
import { CalendarDays, ClipboardList, Settings, Theater } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getTheaterNavigation } from '@/features/application-shell/navigation'
import type { Database } from '@/server/db/database.types'
import type { TheaterNavigationId } from '@/features/application-shell/navigation'

const theaterLinks = [
  {
    id: 'operations',
    label: 'Theater Operations',
    to: '/app/$theaterSlug',
    icon: ClipboardList,
  },
  {
    id: 'events',
    label: 'Events',
    to: '/app/$theaterSlug/events',
    icon: CalendarDays,
  },
  {
    id: 'settings',
    label: 'Settings',
    to: '/app/$theaterSlug/settings',
    icon: Settings,
  },
] as const satisfies ReadonlyArray<{
  id: TheaterNavigationId
  label: string
  to: string
  icon: typeof Settings
}>

export function PublicNav() {
  return (
    <header className="border-b">
      <div className="page-wrap flex h-14 items-center gap-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Theater className="size-4" />
          Stagecom
        </Link>
        <nav
          aria-label="Public navigation"
          className="ml-auto flex items-center gap-2"
        >
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/app/callsheet">My Callsheet</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/signup">
              <span className="sm:hidden">Join</span>
              <span className="hidden sm:inline">Create account</span>
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}

export function TheaterNav({
  theaterName,
  theaterSlug,
  roles,
}: {
  theaterName: string
  theaterSlug: string
  roles: Database['public']['Enums']['theater_role'][]
}) {
  const available = getTheaterNavigation(roles)
  return (
    <div className="border-b">
      <div className="page-wrap flex flex-wrap items-center justify-between gap-3 py-3">
        <p className="text-sm font-medium">{theaterName}</p>
        <nav aria-label="Theater navigation" className="flex flex-wrap gap-1">
          {theaterLinks
            .filter((item) => available.includes(item.id))
            .map((item) => (
              <Button asChild variant="ghost" size="sm" key={item.id}>
                <Link
                  to={item.to}
                  params={{ theaterSlug }}
                  activeOptions={{ exact: item.id === 'operations' }}
                  activeProps={{
                    className: 'bg-accent text-accent-foreground',
                  }}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              </Button>
            ))}
        </nav>
      </div>
    </div>
  )
}
