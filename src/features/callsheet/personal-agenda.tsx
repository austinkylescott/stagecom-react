import { useState } from 'react'
import { useRouter, useHydrated } from '@tanstack/react-router'
import { CalendarDays, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { callHref, callTime } from './upcoming-calls'
import type { CallsheetCommitment } from './read-model'

type AgendaProps = { calls: CallsheetCommitment[]; failed: boolean }

export function PersonalAgenda({ calls, failed }: AgendaProps) {
  if (!failed && !calls.length) return null
  return (
    <section
      aria-label="Your Next Events"
      className="hidden border-t px-3 py-4 md:block"
    >
      <h2 className="mb-2 px-1 text-sm font-semibold">Your Next Events</h2>
      <AgendaList calls={calls} failed={failed} />
      <a
        href="/app/callsheet#confirmed-calls"
        className="mt-2 inline-flex min-h-11 items-center px-1 text-xs font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
      >
        View all Events
      </a>
    </section>
  )
}

export function MobilePersonalAgenda({ calls, failed }: AgendaProps) {
  const [open, setOpen] = useState(false)
  const next = calls.at(0)
  if (!failed && !calls.length) return null
  return (
    <div className="border-b md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring"
          >
            <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="font-medium">
                {next ? 'Next Event' : 'Your Events'}
              </span>
              <span className="ml-2 text-muted-foreground">
                {failed ? (
                  'Could not load'
                ) : next ? (
                  <CallDate call={next} />
                ) : (
                  'None upcoming'
                )}
              </span>
            </span>
            <ChevronUp aria-hidden="true" className="size-4 shrink-0" />
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Your Upcoming Events</SheetTitle>
            <SheetDescription>
              Events you’re scheduled for across your Theaters.
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-6">
            <AgendaList
              calls={calls}
              failed={failed}
              onNavigate={() => setOpen(false)}
            />
            <a
              href="/app/callsheet#confirmed-calls"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4"
            >
              View Callsheet
            </a>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function AgendaList({
  calls,
  failed,
  onNavigate,
}: AgendaProps & { onNavigate?: () => void }) {
  const router = useRouter()
  if (failed)
    return (
      <div>
        <p className="text-sm text-muted-foreground">
          Could not load your scheduled Events.
        </p>
        <Button
          variant="ghost"
          className="min-h-11"
          onClick={() => router.invalidate()}
        >
          Retry Events
        </Button>
      </div>
    )
  if (!calls.length)
    return (
      <p className="px-1 text-xs text-muted-foreground">
        No upcoming scheduled Events.
      </p>
    )
  return (
    <ol className="divide-y">
      {calls.map((call) => (
        <li key={call.id}>
          <a
            href={callHref(call)}
            onClick={onNavigate}
            className="block min-h-11 rounded-md px-1 py-3 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
          >
            <p className="text-xs font-medium tabular-nums">
              <CallDate call={call} />
            </p>
            <p className="mt-1 break-words text-sm font-medium leading-snug">
              {call.event.title}
            </p>
            <p className="mt-1 break-words text-xs text-muted-foreground">
              {call.theater.title}
            </p>
          </a>
        </li>
      ))}
    </ol>
  )
}

function CallDate({ call }: { call: CallsheetCommitment }) {
  const hydrated = useHydrated()
  const timeZone = hydrated
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'UTC'
  return (
    <time dateTime={call.actionableAt ?? undefined}>
      {callTime(call, timeZone)}
    </time>
  )
}
