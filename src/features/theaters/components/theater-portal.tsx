import { Link } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { canManageTheater } from '@/features/theaters/permissions'
import type { Database } from '@/server/db/database.types'

export function TheaterPortal({
  theater,
  roles,
}: {
  theater: { name: string; slug: string }
  roles: Database['public']['Enums']['theater_role'][]
}) {
  return (
    <main className="page-wrap min-w-0 break-words py-6 sm:py-8">
      <p className="text-sm text-muted-foreground">Your Theater</p>
      <h1 className="mt-3 text-2xl font-medium">{theater.name}</h1>
      <p className="mt-3 text-muted-foreground">
        Explore programming and the people who make it happen.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Programming</CardTitle>
            <CardDescription>
              Find Events, including plans without dates, and your next
              available action.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link
                to="/app/$theaterSlug/events"
                params={{ theaterSlug: theater.slug }}
              >
                Explore programming
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link
                to="/app/$theaterSlug/calendar"
                params={{ theaterSlug: theater.slug }}
              >
                Theater Calendar
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Community</CardTitle>
            <CardDescription>
              Find the Members of {theater.name}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link
                to="/app/$theaterSlug/members"
                params={{ theaterSlug: theater.slug }}
              >
                Explore community
              </Link>
            </Button>
          </CardContent>
        </Card>
        {canManageTheater(roles) ? (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Theater Operations</CardTitle>
              <CardDescription>
                Your Owner or Admin authority gives you access to Theater
                decisions, exceptions, and operational work.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link
                  to="/app/$theaterSlug/operations"
                  params={{ theaterSlug: theater.slug }}
                >
                  Open Theater Operations
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  )
}
