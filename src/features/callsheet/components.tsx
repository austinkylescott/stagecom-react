import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

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
  const calls = commitments.filter((item) => item.kind === 'occurrence_call')
  async function resolved(id: string, message: string) {
    setResolvedIds((current) => [...current, id])
    setFeedback(message)
    await onResponded?.()
  }
  return (
    <main className="page-wrap py-6">
      <header className="max-w-2xl">
        <p className="text-xs font-medium tracking-normal text-muted-foreground">
          Personal workspace
        </p>
        <h1 className="display-title mt-3 text-2xl font-medium text-foreground">
          Callsheet
        </h1>
        <p className="mt-3 text-muted-foreground">
          Your commitments and shared work across every active Theater.
        </p>
      </header>

      {feedback ? (
        <p role="status" className="mt-4 text-sm">
          {feedback}
        </p>
      ) : null}
      <section aria-labelledby="response-needed" className="mt-8">
        <h2 id="response-needed" className="text-2xl font-semibold">
          Response needed
        </h2>
        {actions.length ? (
          <div className="mt-4 grid gap-3">
            {actions.map((commitment) => (
              <CommitmentCard
                key={commitment.id}
                commitment={commitment}
                onResolved={resolved}
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed p-5">
            Nothing needs your response right now.
          </p>
        )}
      </section>
      <section aria-labelledby="confirmed-calls" className="mt-8">
        <h2 id="confirmed-calls" className="text-2xl font-semibold">
          Confirmed Calls
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your upcoming agenda across Theaters.
        </p>
        {calls.length ? (
          <div className="mt-4 grid gap-3">
            {[...calls]
              .sort((a, b) =>
                (a.actionableAt ?? '').localeCompare(b.actionableAt ?? ''),
              )
              .map((commitment) => (
                <CommitmentCard
                  key={commitment.id}
                  commitment={commitment}
                  onResolved={resolved}
                />
              ))}
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed p-5">
            No upcoming confirmed Calls.
          </p>
        )}
      </section>
      <EventSection
        title="Relevant Events"
        id="relevant-events"
        events={events}
        empty="Your Event relationships will appear here, including Events without a current action."
      />
      <EventSection
        title="Discover Events"
        id="discover-events"
        events={discovery}
        empty="No upcoming published Events in your Theaters."
      />

      <section
        aria-labelledby="theater-needs-attention"
        className="mt-10 border-t border-border pt-8"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            className="text-2xl font-semibold text-foreground"
            id="theater-needs-attention"
          >
            Theater needs attention
          </h2>
          <p className="text-sm font-semibold text-muted-foreground">
            {sharedWork.length === 1
              ? '1 decision'
              : `${sharedWork.length} decisions`}
          </p>
        </div>
        <p className="mt-2 text-muted-foreground">
          Shared Work Queue decisions you can resolve with your current
          relationships.
        </p>
        {sharedWork.length ? (
          <ol className="mt-4 grid gap-3">
            {sharedWork.map((item) => (
              <li
                className="min-w-0 rounded-lg px-5 py-5"
                key={`${item.theaterName}:${item.id}`}
              >
                <p className="flex flex-wrap gap-x-2 text-xs font-medium tracking-normal text-muted-foreground">
                  <span>{item.theaterName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.relationship}</span>
                </p>
                <h3 className="mt-2 break-words text-xl font-semibold text-foreground">
                  {item.eventTitle ?? 'Theater publication'}
                </h3>
                <p className="mt-2 break-words text-sm text-muted-foreground">
                  <span className="font-medium">Urgency:</span>{' '}
                  {item.priorityReason}
                </p>
                <Button
                  asChild
                  variant="default"
                  className="mt-4 w-full sm:w-auto"
                >
                  <a href={item.href}>{item.label}</a>
                </Button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-border px-5 py-6 text-muted-foreground">
            No shared decisions are ready for you right now.
          </p>
        )}
      </section>

      <section
        aria-labelledby="your-theaters"
        className="mt-10 border-t border-border pt-8"
      >
        <h2
          className="text-2xl font-semibold text-foreground"
          id="your-theaters"
        >
          Your Theaters
        </h2>
        <p className="mt-2 text-muted-foreground">
          Enter a Theater when you need its shared work or schedule.
        </p>
        {theaters.length > 0 ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {theaters.map((theater) => (
              <Card
                role="article"
                className=" px-5 py-5 gap-0"
                key={theater.id}
              >
                <p className="text-xs font-medium tracking-normal text-muted-foreground">
                  {theater.status} {theater.isDefault ? '· Default' : ''}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-foreground">
                  {theater.name}
                </h3>
                <Button
                  asChild
                  variant="default"
                  className="mt-5 w-full sm:w-auto"
                >
                  <a href={`/app/${theater.slug}`}>Enter Theater</a>
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-border px-5 py-6 text-muted-foreground">
            <p>No Theater memberships yet. Create a Theater to begin.</p>
            <Button asChild variant="default" className="mt-4 w-full sm:w-auto">
              <a href="/onboarding/theater">Create a Theater</a>
            </Button>
          </div>
        )}
      </section>
    </main>
  )
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

  async function respond(response: 'accepted' | 'declined') {
    if (!commitment.responseId) return
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
      await onResolved(commitment.id, `${subject} ${response}.`)
    } catch {
      setMessage(
        'Could not complete the response. Refresh to check its status or try again.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="min-w-0 rounded-lg px-5 py-5">
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium tracking-normal text-muted-foreground">
        <span>{commitment.theater.title}</span>
        <span aria-hidden="true">·</span>
        <span>{commitment.relationship}</span>
      </div>
      <h3 className="mt-2 text-xl font-semibold text-foreground">
        {commitment.event.title}
      </h3>
      <p className="mt-2 text-sm font-semibold text-muted-foreground">
        {commitment.action}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {formatCommitmentTime(commitment.actionableAt)}
      </p>
      {commitment.urgencyReason ? (
        <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm font-medium text-foreground">
          {commitment.urgencyReason}
        </p>
      ) : null}
      {commitment.responseId ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
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
            variant="outline"

            disabled={pending}
            onClick={() => respond('declined')}
            type="button"
          >
            Decline
          </Button>
        </div>
      ) : (
        <Button asChild variant="default" className="mt-5 w-full sm:w-auto">
          <a
            href={`/app/${commitment.theater.slug}/events/${commitment.event.slug}${commitment.targetAnchor}`}
          >
            {commitment.action}
          </a>
        </Button>
      )}
      {message ? (
        <p role="alert" className="mt-3 text-sm font-semibold">
          {message}
        </p>
      ) : null}
    </Card>
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
  empty,
}: {
  title: string
  id: string
  events: CallsheetEvent[]
  empty: string
}) {
  return (
    <section aria-labelledby={id} className="mt-8">
      <h2 id={id} className="text-2xl font-semibold">
        {title}
      </h2>
      {events.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {events.map((event) => (
            <Card role="article" className="min-w-0 gap-2 p-5" key={event.id}>
              <p className="text-sm text-muted-foreground">
                {event.theaterName}
              </p>
              <h3 className="break-words text-lg font-semibold">
                {event.title}
              </h3>
              <Button asChild variant="outline">
                <a href={event.href}>
                  Open Event<span className="sr-only">: {event.title}</span>
                </a>
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed p-5 text-muted-foreground">
          {empty}
        </p>
      )}
    </section>
  )
}
