import { useRef, useState } from 'react'
import { useHydrated } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'

import { respondToTheaterAdminInvitationFn } from '@/features/admin-invitations/server-functions'
import { respondToTheaterOwnershipTransferFn } from '@/features/ownership-transfers/server-functions'
import { respondToEventStaffInvitationFn } from '@/features/events/server-functions'

import type {
  CallsheetCommitment,
  CallsheetTheater,
  CallsheetEvent,
} from './read-model'
import type { WorkQueueItem } from '@/features/work-queue/read-model'

export function CallsheetPage({
  commitments,
  sharedWork,
  theaters,
  events = [],
  discovery = [],
  onResponded,
}: {
  commitments: CallsheetCommitment[]
  sharedWork: WorkQueueItem[]
  theaters: CallsheetTheater[]
  events?: CallsheetEvent[]
  discovery?: CallsheetEvent[]
  onResponded?: () => Promise<void>
}) {
  const [resolvedIds, setResolvedIds] = useState<string[]>([])
  const [feedback, setFeedback] = useState<string | null>(null)
  const actions = commitments.filter(
    (item) => item.kind !== 'occurrence_call' && !resolvedIds.includes(item.id),
  )
  const calls = commitments
    .filter((item) => item.kind === 'occurrence_call')
    .sort((a, b) => (a.actionableAt ?? '').localeCompare(b.actionableAt ?? ''))

  async function resolved(id: string, message: string) {
    setResolvedIds((current) => [...current, id])
    setFeedback(message)
    try {
      await onResponded?.()
    } catch {
      setFeedback(`${message} Refresh to load the updated Callsheet.`)
    }
  }

  return (
    <main className="page-wrap py-6 sm:py-8">
      <header className="border-b pb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Callsheet
        </h1>
        {actions.length + sharedWork.length + calls.length > 0 ? (
          <nav
            aria-label="Callsheet overview"
            className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm"
          >
            {actions.length > 0 ? (
              <a
                className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                href="#response-needed"
              >
                {actions.length}{' '}
                {actions.length === 1 ? 'response needed' : 'responses needed'}
              </a>
            ) : null}
            {sharedWork.length > 0 ? (
              <a
                className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                href="#theater-needs-attention"
              >
                {sharedWork.length}{' '}
                {sharedWork.length === 1
                  ? 'shared decision'
                  : 'shared decisions'}
              </a>
            ) : null}
            {calls.length > 0 ? (
              <a
                className="inline-flex min-h-11 items-center text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                href="#confirmed-calls"
              >
                {calls.length}{' '}
                {calls.length === 1 ? 'confirmed Call' : 'confirmed Calls'}
              </a>
            ) : null}
          </nav>
        ) : null}
      </header>

      {feedback ? (
        <p role="status" className="mt-4 rounded-md bg-muted px-4 py-3 text-sm">
          {feedback}
        </p>
      ) : null}

      {actions.length + sharedWork.length + calls.length > 0 ? (
        <div className="space-y-7 py-6">
          {actions.length + sharedWork.length > 0 ? (
            <div className="min-w-0">
              <h2 className="mb-4 text-xl font-semibold tracking-tight">
                Needs your attention
              </h2>
              {actions.length > 0 ? (
                <section
                  aria-labelledby="response-needed"
                  className="scroll-mt-6"
                >
                  <SectionHeading
                    id="response-needed"
                    title="Response needed"
                    count={actions.length}
                  />

                  <div className="mt-2 divide-y">
                    {actions.map((commitment) => (
                      <CommitmentCard
                        key={commitment.id}
                        commitment={commitment}
                        onResolved={resolved}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {sharedWork.length > 0 ? (
                <section
                  aria-labelledby="theater-needs-attention"
                  className="mt-5 scroll-mt-6"
                >
                  <SectionHeading
                    id="theater-needs-attention"
                    title="Shared decisions"
                    count={sharedWork.length}
                  />

                  <ol className="mt-2 divide-y border-t">
                    {sharedWork.map((item) => (
                      <li
                        className="min-w-0 py-4 sm:flex sm:items-center sm:justify-between sm:gap-8"
                        key={`${item.theaterName}:${item.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="mt-1 break-words text-base font-semibold leading-snug">
                            {item.eventTitle ?? item.theaterName}
                          </h4>
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            {decisionReason(item)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.theaterName} · {item.relationship}
                          </p>
                        </div>
                        <Button
                          asChild
                          className="mt-3 min-h-11 h-auto max-w-full shrink-0 whitespace-normal text-left sm:mt-0 sm:max-w-64"
                          variant="outline"
                        >
                          <a href={item.href}>
                            {item.label}
                            <span className="sr-only">
                              : {item.eventTitle ?? item.theaterName}
                            </span>
                            <ArrowRight
                              aria-hidden="true"
                              className="shrink-0"
                            />
                          </a>
                        </Button>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}
            </div>
          ) : null}

          {calls.length > 0 ? (
            <section
              aria-labelledby="confirmed-calls"
              className="min-w-0 scroll-mt-6 border-t pt-6"
            >
              <h2
                id="confirmed-calls"
                className="flex items-baseline justify-between gap-3 text-base font-semibold tracking-tight"
              >
                Confirmed Calls
                <span
                  aria-hidden="true"
                  className="text-sm font-normal tabular-nums text-muted-foreground"
                >
                  {calls.length}
                </span>
              </h2>

              <ol className="mt-4 divide-y">
                {calls.map((commitment) => (
                  <li
                    key={commitment.id}
                    className="py-4 first:pt-0 sm:grid sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-center sm:gap-x-6"
                  >
                    <p className="text-sm font-medium tabular-nums">
                      {formatCommitmentTime(commitment.actionableAt)}
                    </p>
                    <div className="min-w-0">
                      <h3 className="mt-2 break-words text-base font-semibold leading-snug sm:mt-0">
                        {commitment.event.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        <span>{commitment.theater.title}</span> ·{' '}
                        <span>{commitment.relationship}</span>
                      </p>
                    </div>
                    <Button
                      asChild
                      variant="ghost"
                      className="mt-2 -ml-3 min-h-11"
                    >
                      <a href={commitmentHref(commitment)}>
                        {commitment.action}
                        <ArrowRight aria-hidden="true" />
                      </a>
                    </Button>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      ) : null}

      {events.length + discovery.length > 0 ? (
        <div className="grid gap-6 py-6">
          <EventSection
            title="Your Event workspaces"
            id="relevant-events"
            events={events}
            description="Events you participate in, lead, or oversee."
          />
          <EventSection
            title="More Events to explore"
            id="discover-events"
            events={discovery}
          />
        </div>
      ) : null}

      {!theaters.length ? (
        <div className="border-t pt-6">
          <p className="text-sm text-muted-foreground">
            No Theater memberships yet.
          </p>
          <Button asChild className="mt-3 min-h-11">
            <a href="/onboarding/theater">Create a Theater</a>
          </Button>
        </div>
      ) : null}
    </main>
  )
}

function SectionHeading({
  id,
  title,
  count,
}: {
  id: string
  title: string
  count: number
}) {
  return (
    <h3
      id={id}
      className="flex items-baseline justify-between gap-3 text-base font-semibold"
    >
      {title}
      <span
        aria-hidden="true"
        className="text-sm font-normal tabular-nums text-muted-foreground"
      >
        {count}
      </span>
    </h3>
  )
}

function commitmentHref(commitment: CallsheetCommitment) {
  return `/app/${commitment.theater.slug}/events/${commitment.event.slug}${commitment.targetAnchor}`
}

function CommitmentCard({
  commitment,
  onResolved,
}: {
  commitment: CallsheetCommitment
  onResolved: (id: string, message: string) => Promise<void>
}) {
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const submitting = useRef(false)

  async function respond(response: 'accepted' | 'declined') {
    if (!commitment.responseId || submitting.current) return
    submitting.current = true
    setPending(true)
    setMessage(null)
    try {
      const result =
        commitment.kind === 'staff_invitation'
          ? await respondToEventStaffInvitationFn({
              data: { assignmentId: commitment.responseId, response },
            })
          : commitment.kind === 'ownership_transfer'
            ? await respondToTheaterOwnershipTransferFn({
                data: {
                  commandId: crypto.randomUUID(),
                  response,
                  transferId: commitment.responseId,
                },
              })
            : await respondToTheaterAdminInvitationFn({
                data: {
                  commandId: crypto.randomUUID(),
                  invitationId: commitment.responseId,
                  response,
                },
              })
      if (!result.ok) {
        setMessage(result.error.message)
        return
      }
      const subject =
        commitment.kind === 'staff_invitation'
          ? 'Event staff assignment'
          : commitment.kind === 'ownership_transfer'
            ? 'Theater ownership transfer'
            : 'Admin authority'
      await onResolved(commitment.id, `${subject} ${result.data.status}.`)
    } catch {
      setMessage(
        'Could not complete the response. Refresh to check its status or try again.',
      )
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  return (
    <article className="min-w-0 py-4" aria-busy={pending}>
      <p className="text-sm text-muted-foreground">
        <span>{commitment.theater.title}</span> ·{' '}
        <span>{commitment.relationship}</span>
      </p>
      <h4 className="mt-1 break-words text-base font-semibold leading-snug">
        {commitment.event.title}
      </h4>
      {commitment.responseId ? (
        <InvitationDetails commitment={commitment} />
      ) : null}
      {commitment.actionableAt ? (
        <p className="mt-2 text-sm tabular-nums text-muted-foreground">
          {formatCommitmentTime(commitment.actionableAt)}
        </p>
      ) : null}
      {commitment.urgencyReason ? (
        <p className="mt-2 text-sm font-medium">{commitment.urgencyReason}</p>
      ) : null}
      {commitment.responseId ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            className="min-h-11"
            disabled={pending}
            onClick={() => respond('accepted')}
            type="button"
          >
            {commitment.kind === 'staff_invitation'
              ? 'Accept staff assignment'
              : commitment.kind === 'ownership_transfer'
                ? 'Accept Theater ownership'
                : 'Accept Admin authority'}
          </Button>
          <Button
            className="min-h-11"
            variant="outline"
            disabled={pending}
            onClick={() => respond('declined')}
            type="button"
          >
            Decline
          </Button>
        </div>
      ) : (
        <Button
          asChild
          className="mt-3 min-h-11 h-auto max-w-full whitespace-normal text-left"
        >
          <a href={commitmentHref(commitment)}>
            {commitment.action}
            <ArrowRight aria-hidden="true" className="shrink-0" />
          </a>
        </Button>
      )}
      {pending ? (
        <p role="status" className="text-xs text-muted-foreground">
          Saving your response…
        </p>
      ) : null}
      {message ? (
        <p role="alert" className="mt-3 text-sm font-medium">
          {message}
        </p>
      ) : null}
    </article>
  )
}

function InvitationDetails({
  commitment,
}: {
  commitment: CallsheetCommitment
}) {
  const hydrated = useHydrated()
  const invitation = commitment.invitation
  const offeredAt = invitation?.offeredAt
  const validOfferTime = offeredAt && Number.isFinite(Date.parse(offeredAt))
  return (
    <div className="mt-2 space-y-2 text-sm leading-relaxed">
      {commitment.kind === 'ownership_transfer' ? (
        <p>
          Acceptance makes you the Theater Owner, with final authority for this
          Theater.{' '}
          {invitation?.formerOwnerRole === 'admin'
            ? 'The former Owner becomes an Admin.'
            : invitation?.formerOwnerRole === 'member'
              ? 'The former Owner becomes a Theater Member.'
              : "The former Owner's resulting role is unavailable."}{' '}
          Declining leaves ownership unchanged.
        </p>
      ) : commitment.kind === 'staff_invitation' ? (
        <p>
          Acceptance confirms your Event staff responsibility:{' '}
          {invitation?.responsibility ||
            'Responsibility not recorded or unavailable'}
          . You count toward staffing coverage after accepting; any Occurrence
          Calls are assigned separately. Declining does not accept the
          assignment.
        </p>
      ) : (
        <p>
          Acceptance grants Admin authority to manage this Theater. Declining
          grants no Admin authority and keeps your Theater membership.
        </p>
      )}
      <details>
        <summary className="min-h-11 cursor-pointer content-center rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          Review invitation details
        </summary>
        <div className="space-y-2 text-muted-foreground">
          <p>
            {invitation?.offeredBy
              ? `${commitment.kind === 'ownership_transfer' ? 'Proposed' : 'Invited'} by ${invitation.offeredBy}`
              : 'Inviter not recorded or unavailable.'}
          </p>
          <p>
            {validOfferTime ? (
              <>
                Offered:{' '}
                <time dateTime={offeredAt}>
                  {new Intl.DateTimeFormat('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZoneName: 'short',
                    timeZone: hydrated ? undefined : 'UTC',
                  }).format(new Date(offeredAt))}
                </time>
              </>
            ) : (
              'Offer time not recorded or unavailable.'
            )}
          </p>
          <p>
            Reading these details does not accept the invitation. Choose Accept
            or Decline to record your response.
          </p>
        </div>
      </details>
    </div>
  )
}

function formatCommitmentTime(actionableAt: string | null) {
  if (!actionableAt) return 'Response needed'
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(actionableAt))
}

function EventSection({
  title,
  id,
  events,
  description,
}: {
  title: string
  id: string
  events: CallsheetEvent[]
  description?: string
}) {
  if (!events.length) return null
  return (
    <section aria-labelledby={id} className="min-w-0">
      <h2
        id={id}
        className="flex items-baseline justify-between gap-3 text-base font-semibold"
      >
        {title}
        <span
          aria-hidden="true"
          className="text-sm font-normal tabular-nums text-muted-foreground"
        >
          {events.length}
        </span>
      </h2>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
      <TooltipProvider delayDuration={150}>
        <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
          {events.map((event) => (
            <li key={event.id} className="min-w-0 border-b py-3">
              <a
                className="group flex min-h-11 items-start justify-between gap-3 rounded-md underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                href={event.href}
                aria-label={`Open Event: ${event.title}`}
              >
                <div className="min-w-0">
                  <h3 className="break-words text-sm font-semibold leading-snug group-hover:underline">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.theaterName}
                    {event.relationships?.length
                      ? ` · ${event.relationships.join(' · ')}`
                      : ''}
                    {event.lifecycle ? (
                      <span className="capitalize">
                        {' '}
                        · {event.lifecycle.replaceAll('_', ' ')}
                      </span>
                    ) : null}
                  </p>
                </div>
                <ArrowRight
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                />
              </a>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <EventSchedule event={event} />
                <CastAvatars members={event.castMembers} />
              </div>
            </li>
          ))}
        </ul>
      </TooltipProvider>
    </section>
  )
}

function CastAvatars({ members }: { members: CallsheetEvent['castMembers'] }) {
  if (!members?.length) return null
  const visible = members.slice(0, 5)
  const remaining = members.slice(5)
  return (
    <div
      role="group"
      aria-label={`${members.length} Cast Members`}
      className="flex -space-x-4 sm:-space-x-2"
    >
      {visible.map((member) => (
        <CastAvatar
          key={member.userId}
          name={member.displayName}
          avatarUrl={member.avatarUrl}
        />
      ))}
      {remaining.length ? (
        <CastAvatar
          name={remaining.map((member) => member.displayName).join(', ')}
          label={`${remaining.length} more Cast Members`}
          count={remaining.length}
        />
      ) : null}
    </div>
  )
}

function CastAvatar({
  name,
  avatarUrl,
  count,
  label,
}: {
  name: string
  avatarUrl?: string | null
  count?: number
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?'
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label ?? name}
          onClick={() => setOpen((current) => !current)}
          className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-background hover:z-10 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:size-8"
        >
          <Avatar className="size-8 ring-2 ring-background sm:size-7">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback className="text-[10px] font-medium text-foreground">
              {count ? `+${count}` : initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={5} className="max-w-64">
        {name}
      </TooltipContent>
    </Tooltip>
  )
}

function EventSchedule({ event }: { event: CallsheetEvent }) {
  const hydrated = useHydrated()
  if (event.nextDate)
    return (
      <p className="text-xs font-medium">
        Next:{' '}
        <time dateTime={event.nextDate}>
          {new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short',
            timeZone: hydrated ? undefined : 'UTC',
          }).format(new Date(event.nextDate))}
        </time>
      </p>
    )
  if (event.scheduleVisible === undefined) return null
  if (!event.scheduleVisible)
    return <p className="text-xs text-muted-foreground">Schedule not shared</p>
  return (
    <p className="text-xs text-muted-foreground">
      {['cancelled', 'completed'].includes(event.lifecycle ?? '')
        ? 'No upcoming dates'
        : 'No confirmed dates ahead'}
    </p>
  )
}

function decisionReason(item: WorkQueueItem) {
  // Only translate known copy; preserve deadline overrides and other priority facts.
  if (
    item.priorityReason === 'Public-content snapshot is ready for Publication'
  )
    return 'Review the public page before publishing this Event.'
  if (item.priorityReason === 'Theater profile is ready for Publication')
    return 'Review the Theater profile before publishing it.'
  if (item.priorityReason === 'Proposal Revision awaits review')
    return 'Review the proposed plan and make a decision.'
  return item.priorityReason
}
