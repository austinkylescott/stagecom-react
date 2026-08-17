import { useState } from 'react'

import {
  cancelEventFn,
  completeEventFn,
  createManagedEventFn,
  inviteEventCastMemberFn,
  issueProposalCounterofferFn,
  manageAtRiskEventFn,
  publishEventFn,
  recordCandidateSlotAvailabilityFn,
  requestEventCancellationFn,
  reviewProposalRevisionFn,
  respondToEventCastInvitationFn,
  respondToProposalCounterofferFn,
  saveEventPublicContentFn,
  setOccurrenceCallFn,
  seedDeniedProposalReplacementFn,
  withdrawFromEventCastFn,
} from './server-functions'
import { ProposalPreparation } from './proposal-preparation/production'

import type { Database } from '@/server/db/database.types'
import type { ProposalPreparationReadModel } from './proposal-preparation/types'

type EventLeadershipRole = Database['public']['Enums']['event_leadership_role']
type EventLifecycle = Database['public']['Enums']['show_lifecycle_status']
type EventHealth = Database['public']['Enums']['show_operational_health']
type EventPublication = Database['public']['Enums']['show_publication_status']

type EventMember = {
  displayName: string
  isEligibleProducer: boolean
  roles: string[]
  userId: string
}

function formatAdmissionPrice(priceCents: number) {
  if (priceCents === 0) return 'Free admission'
  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    style: 'currency',
  }).format(priceCents / 100)
}

export function CreateManagedEventPage({
  actorEligible,
  members,
  theater,
}: {
  actorEligible: boolean
  members: EventMember[]
  theater: { id: string; name: string; slug: string }
}) {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [directorUserId, setDirectorUserId] = useState('')
  const [producerUserIds, setProducerUserIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <main className="page-wrap py-8 sm:py-12">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
        Events · {theater.name}
      </p>
      <h1 className="display-title mt-3 text-4xl font-bold text-[var(--sea-ink)]">
        Create a managed Event
      </h1>
      {!actorEligible ? (
        <p className="mt-5 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 font-semibold text-amber-950">
          Current Theater policy does not allow you to use the Producer
          workflow.
        </p>
      ) : null}
      <form
        className="island-shell mt-6 grid gap-5 rounded-lg px-6 py-6"
        onSubmit={async (event) => {
          event.preventDefault()
          setError(null)
          setIsSubmitting(true)

          try {
            const result = await createManagedEventFn({
              data: {
                ...(directorUserId ? { directorUserId } : {}),
                producerUserIds,
                slug,
                theaterId: theater.id,
                title,
              },
            })

            if (!result.ok) {
              setError(result.error.message)
              return
            }

            window.location.assign(
              `/app/${theater.slug}/events/${result.data.slug}`,
            )
          } finally {
            setIsSubmitting(false)
          }
        }}
      >
        <label className="grid gap-2 text-sm font-bold">
          Event title
          <input
            className="rounded-md border border-[var(--line)] bg-white px-4 py-3"
            onChange={(event) => {
              setTitle(event.target.value)
              if (!slug) {
                setSlug(toSlug(event.target.value))
              }
            }}
            value={title}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Event slug
          <input
            className="rounded-md border border-[var(--line)] bg-white px-4 py-3"
            onChange={(event) => setSlug(event.target.value)}
            value={slug}
          />
        </label>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-bold">Co-Producers</legend>
          {members
            .filter((member) => member.isEligibleProducer)
            .map((member) => (
              <label className="flex items-center gap-3" key={member.userId}>
                <input
                  checked={producerUserIds.includes(member.userId)}
                  onChange={(event) =>
                    setProducerUserIds((current) =>
                      event.target.checked
                        ? [...current, member.userId]
                        : current.filter((userId) => userId !== member.userId),
                    )
                  }
                  type="checkbox"
                />
                {member.displayName}
              </label>
            ))}
        </fieldset>
        <label className="grid gap-2 text-sm font-bold">
          Director
          <select
            className="rounded-md border border-[var(--line)] bg-white px-4 py-3"
            onChange={(event) => setDirectorUserId(event.target.value)}
            value={directorUserId}
          >
            <option value="">Assign later</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.displayName}
              </option>
            ))}
          </select>
        </label>
        {error ? <p className="font-semibold text-red-800">{error}</p> : null}
        <button
          className="rounded-md bg-[var(--sea-ink)] px-4 py-3 font-extrabold text-white disabled:opacity-50"
          disabled={!actorEligible || !title.trim() || !slug || isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Creating…' : 'Create Event draft'}
        </button>
      </form>
    </main>
  )
}

export function PublishedEventPage({
  content,
  event,
  theater,
}: {
  content: {
    admissionCallToAction: {
      href: string | null
      label: 'Get tickets' | 'No advance ticketing'
    }
    admissionPriceCents: number
    castCredits: Array<{ displayName: string; position: number }>
    description: string
    imageUrl: string | null
    occurrences: Array<{
      durationMinutes: number
      localStartsAt: string
      locationName: string
      startsAt: string
      timezoneName: string
      utcOffsetMinutes: number
    }>
    title: string
  }
  event: { lifecycleStatus: string }
  theater: { name: string; slug: string }
}) {
  return (
    <main className="page-wrap py-8 sm:py-12">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
        {theater.name} · Event
      </p>
      <h1 className="display-title mt-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
        {content.title}
      </h1>
      {event.lifecycleStatus === 'cancelled' ? (
        <div className="mt-6 rounded-md border border-red-300 bg-red-50 px-5 py-4 text-red-950">
          <p className="font-extrabold">This Event has been cancelled.</p>
          <p className="mt-1 text-sm">
            The published listing remains available so audience members can see
            the definitive cancellation notice.
          </p>
        </div>
      ) : null}
      {content.imageUrl ? (
        <img
          alt=""
          className="mt-6 max-h-[32rem] w-full rounded-lg object-cover"
          src={content.imageUrl}
        />
      ) : null}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="island-shell rounded-lg px-6 py-6">
          <p className="whitespace-pre-wrap text-lg">{content.description}</p>
          {content.castCredits.length > 0 ? (
            <div className="mt-6">
              <h2 className="text-xl font-extrabold">Cast</h2>
              <ul className="mt-2 grid gap-1">
                {content.castCredits.map((credit) => (
                  <li key={`${credit.position}-${credit.displayName}`}>
                    {credit.displayName}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
        <aside className="island-shell rounded-lg px-6 py-6">
          <h2 className="text-xl font-extrabold">Performances</h2>
          <ul className="mt-3 grid gap-4">
            {content.occurrences.map((occurrence) => (
              <li key={`${occurrence.startsAt}-${occurrence.locationName}`}>
                <p className="font-bold">{occurrence.localStartsAt}</p>
                <p className="text-sm text-[var(--sea-ink-soft)]">
                  {occurrence.locationName} · {occurrence.durationMinutes}{' '}
                  minutes · {occurrence.timezoneName}
                </p>
              </li>
            ))}
          </ul>
          {event.lifecycleStatus === 'cancelled' ? (
            <p className="mt-6 font-extrabold text-red-900">
              Admission is closed because this Event was cancelled.
            </p>
          ) : (
            <p className="mt-6 text-lg font-extrabold">
              {formatAdmissionPrice(content.admissionPriceCents)}
            </p>
          )}
          {event.lifecycleStatus !== 'cancelled' &&
          content.admissionCallToAction.href ? (
            <a
              className="mt-3 inline-flex rounded-md bg-[var(--coral)] px-5 py-3 font-extrabold text-white"
              href={content.admissionCallToAction.href}
              rel="noreferrer"
            >
              {content.admissionCallToAction.label}
            </a>
          ) : event.lifecycleStatus !== 'cancelled' ? (
            <p className="mt-3 font-semibold">
              {content.admissionCallToAction.label}
            </p>
          ) : null}
        </aside>
      </div>
    </main>
  )
}

export function ManagedEventsPage({
  events,
  theaterSlug,
}: {
  events: Array<{
    id: string
    lifecycle_status: EventLifecycle
    operational_health: EventHealth
    publication_status: EventPublication
    slug: string
    title: string
  }>
  theaterSlug: string
}) {
  return (
    <main className="page-wrap py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
            Events
          </p>
          <h1 className="display-title mt-3 text-4xl font-bold text-[var(--sea-ink)]">
            Event operations
          </h1>
        </div>
        <a
          className="rounded-md bg-[var(--sea-ink)] px-4 py-3 font-extrabold text-white no-underline"
          href={`/app/${theaterSlug}/events/new`}
        >
          Create Event
        </a>
      </div>
      <div className="mt-6 grid gap-4">
        {events.map((event) => (
          <a
            className="island-shell rounded-lg px-5 py-5 no-underline"
            href={`/app/${theaterSlug}/events/${event.slug}`}
            key={event.id}
          >
            <h2 className="text-2xl font-extrabold text-[var(--sea-ink)]">
              {event.title}
            </h2>
            <p className="mt-2 text-sm font-semibold text-[var(--sea-ink-soft)]">
              Lifecycle: {event.lifecycle_status} · Publication:{' '}
              {event.publication_status} · Health: {event.operational_health}
            </p>
          </a>
        ))}
        {events.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--line)] px-5 py-7">
            No managed Events yet.
          </p>
        ) : null}
      </div>
    </main>
  )
}

export function ManagedEventWorkspace({
  activeMembers,
  actorUserId,
  allowedActions,
  event,
  proposalPreparation,
  publicContent,
  theater,
  view,
}: {
  activeMembers: Array<{ displayName: string; userId: string }>
  actorUserId: string
  allowedActions: {
    assignOccurrenceCalls: boolean
    cancelEvent: boolean
    completeEvent: boolean
    editOperationalPlan: boolean
    inviteCast: boolean
    issueCounteroffer: boolean
    manageAtRisk: boolean
    respondToAvailability: boolean
    respondToInvitation: boolean
    respondToCounteroffer: boolean
    requestCancellation: boolean
    reviewProposalRevisions: boolean
    seedDeniedReplacement: boolean
    selectProposedCast: boolean
    submitProposalRevision: boolean
    useOwnerSelfApproval: boolean
    withdrawFromCast: boolean
  }
  event: {
    id: string
    approved_proposal_revision_id: string | null
    lifecycle_status: EventLifecycle
    minimum_viable_cast: number | null
    at_risk_continuation_allowed: boolean
    operational_health: EventHealth
    operational_health_version: number
    publication_status: EventPublication
    cancelled_at: string | null
    cancelled_by_user_id: string | null
    cancellation_reason: string | null
    show_cancellation_requests: Array<{
      actor_user_id: string
      id: string
      reason: string
      requested_at: string
      resolved_at: string | null
      resolved_by_user_id: string | null
    }>
    show_availability_responses: Array<{
      actor_user_id: string
      candidate_slot_id: string
      responded_at: string
      response: 'available' | 'unavailable' | 'uncertain'
      user_id: string
      version: number
    }>
    show_cast: Array<{
      invited_at: string | null
      profiles: { display_name: string }
      responded_at: string | null
      source: 'invited' | 'requested'
      status: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'removed'
      user_id: string
    }>
    show_leadership: Array<{
      profiles: { display_name: string }
      role: EventLeadershipRole
      user_id: string
    }>
    show_occurrences: Array<{
      confirmed_candidate_slot_id: string | null
      id: string
      occurrence_type: 'rehearsal' | 'performance'
      position: number
      show_occurrence_calls: Array<{
        actor_user_id: string
        assigned_at: string
        call: 'required' | 'optional' | 'not_called'
        occurrence_id: string
        user_id: string
        version: number
      }>
      show_candidate_slots: Array<{
        duration_minutes: number
        id: string
        local_starts_at: string
        location_kind: 'primary_venue' | 'off_site'
        location_name: string
        off_site_approved: boolean
        position: number
        resource_id: string | null
        starts_at: string
        timezone_name: string
        timezone_source: 'unknown' | 'inferred' | 'manual'
      }>
      visibility: 'public' | 'internal'
    }>
    show_resource_requests: Array<{
      id: string
      label: string
      position: number
      quantity: number
      resource_type: 'staff' | 'equipment' | 'other'
    }>
    show_risk_management_decisions: Array<{
      action: 'revise' | 'reschedule' | 'allow' | 'cancel'
      actor_user_id: string
      created_at: string
      id: string
      prior_health_version: number
      reason: string
      resulting_health_version: number
    }>
    show_proposal_revisions: Array<{
      command_id: string
      decision_state:
        | 'pending'
        | 'changes_requested'
        | 'counteroffered'
        | 'approved'
        | 'denied'
      decision_version: number
      id: string
      revision_number: number
      snapshot: Database['public']['Tables']['show_proposal_revisions']['Row']['snapshot']
      submitted_at: string
      submitted_by: string
      show_proposal_decisions: {
        action: 'approve' | 'request_edits' | 'deny'
        actor_user_id: string
        command_id: string
        created_at: string
        id: string
        owner_override: boolean
        reason: string | null
        revision_version: number
      } | null
      show_counteroffers: Array<{
        actor_user_id: string
        candidate_slot_id: string
        created_at: string
        id: string
        occurrence_id: string
        response_deadline: string
        resulting_proposal_revision_id: string | null
        state: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'
      }>
    }>
    show_proposed_cast: Array<{ user_id: string }>
    target_cast_size: number | null
    title: string
  }
  proposalPreparation: ProposalPreparationReadModel | null
  publicContent: {
    allowedActions: {
      editPublicContent: boolean
      publishEvent: boolean
    }
    atRiskContinuationRequired: boolean
    blockers: Array<{ code: string; message: string }>
    draft: {
      admissionPriceCents: number | null
      castCredits: Array<{
        displayName: string
        position: number
        publiclyCredited: boolean
        userId: string
      }>
      description: string
      externalUrl: string | null
      id: string | null
      imageUrl: string | null
      revisionNumber: number | null
      salesChannel: 'external' | 'no_advance_ticketing' | null
      title: string
      version: number | null
    }
    publishedRevisionId: string | null
    preview: {
      admissionCallToAction: {
        href: string | null
        label: 'Get tickets' | 'No advance ticketing'
      }
      admissionPriceCents: number
      castCredits: Array<{ displayName: string; position: number }>
      description: string
      externalUrl: string | null
      imageUrl: string | null
      occurrences: Array<{
        durationMinutes: number
        localStartsAt: string
        locationName: string
        startsAt: string
        timezoneName: string
        utcOffsetMinutes: number
      }>
      salesChannel: 'external' | 'no_advance_ticketing'
      title: string
    } | null
  } | null
  theater: {
    primary_venue_id: string
    primary_venue_name: string | null
    setup_buffer_minutes: number
    slug: string
    timezone: string | null
    timezone_source: 'unknown' | 'inferred' | 'manual'
    turnover_buffer_minutes: number
  }
  view: 'operational' | 'accepted_cast' | 'pending_invitee'
}) {
  const [cast, setCast] = useState(event.show_cast)
  const [inviteeUserId, setInviteeUserId] = useState('')
  const [castingError, setCastingError] = useState<string | null>(null)
  const [isCasting, setIsCasting] = useState(false)
  const [availabilityResponses, setAvailabilityResponses] = useState(
    event.show_availability_responses,
  )
  const [occurrenceCalls, setOccurrenceCalls] = useState(() =>
    event.show_occurrences.flatMap(
      (occurrence) => occurrence.show_occurrence_calls,
    ),
  )
  const [coordinationError, setCoordinationError] = useState<string | null>(
    null,
  )
  const [savingCoordinationKey, setSavingCoordinationKey] = useState<
    string | null
  >(null)
  const [publicDraft, setPublicDraft] = useState(publicContent?.draft ?? null)
  const [publicContentError, setPublicContentError] = useState<string | null>(
    null,
  )
  const [publicContentSaved, setPublicContentSaved] = useState(false)
  const [isSavingPublicContent, setIsSavingPublicContent] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [lifecycleStatus, setLifecycleStatus] = useState(event.lifecycle_status)
  const [operationalHealth, setOperationalHealth] = useState(
    event.operational_health,
  )
  const [operationalHealthVersion, setOperationalHealthVersion] = useState(
    event.operational_health_version,
  )
  const [riskManagementReason, setRiskManagementReason] = useState('')
  const [riskManagementError, setRiskManagementError] = useState<string | null>(
    null,
  )
  const [riskManagementResult, setRiskManagementResult] = useState<
    string | null
  >(null)
  const [isManagingRisk, setIsManagingRisk] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [cancellationError, setCancellationError] = useState<string | null>(
    null,
  )
  const [cancellationResult, setCancellationResult] = useState<string | null>(
    null,
  )
  const [isCancelling, setIsCancelling] = useState(false)
  const [isRequestingCancellation, setIsRequestingCancellation] =
    useState(false)
  const [cancellationRequests, setCancellationRequests] = useState(
    event.show_cancellation_requests,
  )
  const [completionError, setCompletionError] = useState<string | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)
  const [proposalRevisions, setProposalRevisions] = useState(
    event.show_proposal_revisions,
  )
  const ownInvitation = cast.find(
    (castMember) => castMember.user_id === actorUserId,
  )
  const acceptedCast = cast.filter(({ status }) => status === 'accepted')
  const candidateSlots = event.show_occurrences.flatMap((occurrence) =>
    occurrence.show_candidate_slots.map((slot) => ({
      occurrence,
      slot,
    })),
  )

  const content = (
    <main className="page-wrap py-8 sm:py-12">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
        Event workspace
      </p>
      <h1 className="display-title mt-3 text-4xl font-bold text-[var(--sea-ink)]">
        {event.title}
      </h1>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StateCard label="Lifecycle" value={lifecycleStatus} />
        <StateCard
          label="Proposal decision"
          value={proposalRevisions[0]?.decision_state ?? 'not submitted'}
        />
        <StateCard label="Publication" value={event.publication_status} />
        <StateCard label="Operational health" value={operationalHealth} />
      </div>
      {lifecycleStatus === 'cancelled' ? (
        <section className="mt-5 rounded-lg border border-red-300 bg-red-50 px-6 py-5 text-red-950">
          <h2 className="text-xl font-extrabold">Event cancelled</h2>
          <p className="mt-2 text-sm">
            Future Occurrences and schedule commitments have ended. The Event,
            Proposal Revisions, decisions, cast credits, and factual history are
            preserved.
          </p>
          {event.publication_status === 'published' ? (
            <p className="mt-2 text-sm font-bold">
              Its public route remains available with a cancellation notice.
            </p>
          ) : null}
        </section>
      ) : null}
      {(allowedActions.requestCancellation || allowedActions.cancelEvent) &&
      lifecycleStatus !== 'cancelled' ? (
        <section className="island-shell mt-5 rounded-lg px-6 py-5">
          <h2 className="text-xl font-extrabold">Cancellation</h2>
          <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
            Producers may recommend cancellation. Only an active Owner or Admin
            can make the final decision.
          </p>
          <label className="mt-4 grid gap-2 text-sm font-bold">
            Cancellation reason
            <textarea
              className="min-h-24 rounded-md border border-[var(--line)] bg-white px-4 py-3"
              onChange={(change) => setCancellationReason(change.target.value)}
              value={cancellationReason}
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            {allowedActions.requestCancellation ? (
              <button
                className="rounded-md bg-[var(--sea-ink)] px-4 py-3 font-extrabold text-white disabled:opacity-60"
                disabled={
                  !cancellationReason.trim() || isRequestingCancellation
                }
                onClick={async () => {
                  setCancellationError(null)
                  setCancellationResult(null)
                  setIsRequestingCancellation(true)
                  try {
                    const result = await requestEventCancellationFn({
                      data: {
                        commandId: crypto.randomUUID(),
                        eventId: event.id,
                        reason: cancellationReason,
                      },
                    })
                    if (!result.ok) {
                      setCancellationError(result.error.message)
                      return
                    }
                    setCancellationRequests((current) => [
                      {
                        actor_user_id: actorUserId,
                        id: result.data.requestId,
                        reason: result.data.reason,
                        requested_at: result.data.requestedAt,
                        resolved_at: null,
                        resolved_by_user_id: null,
                      },
                      ...current,
                    ])
                    setCancellationResult(
                      'Cancellation requested. An Owner or Admin must make the final decision.',
                    )
                  } finally {
                    setIsRequestingCancellation(false)
                  }
                }}
                type="button"
              >
                {isRequestingCancellation
                  ? 'Requesting…'
                  : 'Request cancellation'}
              </button>
            ) : null}
            {allowedActions.cancelEvent ? (
              <button
                className="rounded-md bg-red-800 px-4 py-3 font-extrabold text-white disabled:opacity-60"
                disabled={!cancellationReason.trim() || isCancelling}
                onClick={async () => {
                  setCancellationError(null)
                  setCancellationResult(null)
                  setIsCancelling(true)
                  try {
                    if (lifecycleStatus === 'completed') {
                      setCancellationError(
                        'This Event can no longer be cancelled. Reload to see its current state.',
                      )
                      return
                    }
                    const result = await cancelEventFn({
                      data: {
                        commandId: crypto.randomUUID(),
                        eventId: event.id,
                        expectedLifecycleStatus: lifecycleStatus,
                        reason: cancellationReason,
                      },
                    })
                    if (!result.ok) {
                      setCancellationError(result.error.message)
                      return
                    }
                    setLifecycleStatus(result.data.lifecycleStatus)
                    setCancellationResult(
                      'Event cancelled. Future commitments were released.',
                    )
                  } finally {
                    setIsCancelling(false)
                  }
                }}
                type="button"
              >
                {isCancelling ? 'Cancelling…' : 'Cancel Event'}
              </button>
            ) : null}
          </div>
          {cancellationResult ? (
            <p className="mt-4 font-bold">{cancellationResult}</p>
          ) : null}
          {cancellationError ? (
            <p className="mt-4 font-bold text-red-800">{cancellationError}</p>
          ) : null}
          {cancellationRequests.length > 0 ? (
            <div className="mt-5 border-t border-[var(--line)] pt-4">
              <h3 className="font-extrabold">Cancellation requests</h3>
              <ul className="mt-2 grid gap-2 text-sm">
                {cancellationRequests.map((request) => (
                  <li key={request.id}>{request.reason}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
      {operationalHealth === 'at_risk' ? (
        <section className="mt-5 rounded-lg border border-amber-300 bg-amber-50 px-6 py-5 text-amber-950">
          <h2 className="text-xl font-extrabold">Event is At Risk</h2>
          <p className="mt-2 text-sm">
            Operational Approval and Publication remain unchanged. Management
            must explicitly revise, reschedule, allow, or cancel this Event.
          </p>
          {allowedActions.manageAtRisk ? (
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-bold">
                At Risk management reason
                <textarea
                  className="min-h-24 rounded-md border border-amber-400 bg-white px-4 py-3"
                  onChange={(change) =>
                    setRiskManagementReason(change.target.value)
                  }
                  value={riskManagementReason}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                {(
                  [
                    ['allow', 'Allow continuation'],
                    ['revise', 'Revise Event'],
                    ['reschedule', 'Reschedule Event'],
                  ] as const
                ).map(([action, label]) => (
                  <button
                    className="rounded-md bg-[var(--sea-ink)] px-4 py-3 font-extrabold text-white disabled:opacity-60"
                    disabled={!riskManagementReason.trim() || isManagingRisk}
                    key={action}
                    onClick={async () => {
                      setRiskManagementError(null)
                      setRiskManagementResult(null)
                      setIsManagingRisk(true)
                      try {
                        const result = await manageAtRiskEventFn({
                          data: {
                            action,
                            commandId: crypto.randomUUID(),
                            eventId: event.id,
                            expectedHealthVersion: operationalHealthVersion,
                            reason: riskManagementReason,
                          },
                        })
                        if (!result.ok) {
                          setRiskManagementError(result.error.message)
                          return
                        }
                        setLifecycleStatus(result.data.lifecycleStatus)
                        setOperationalHealth(result.data.operationalHealth)
                        setOperationalHealthVersion(
                          result.data.operationalHealthVersion,
                        )
                        setRiskManagementResult(
                          action === 'allow'
                            ? 'Continuation allowed with an audited reason. The Event remains At Risk.'
                            : `${label} moved the Event into the requested management workflow.`,
                        )
                      } finally {
                        setIsManagingRisk(false)
                      }
                    }}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {riskManagementResult ? (
            <p className="mt-4 font-bold">{riskManagementResult}</p>
          ) : null}
          {riskManagementError ? (
            <p className="mt-4 font-bold text-red-800">{riskManagementError}</p>
          ) : null}
          {event.show_risk_management_decisions.length > 0 ? (
            <div className="mt-5 border-t border-amber-300 pt-4">
              <h3 className="font-extrabold">Management history</h3>
              <ul className="mt-2 grid gap-2 text-sm">
                {event.show_risk_management_decisions.map((decision) => (
                  <li key={decision.id}>
                    <span className="font-bold capitalize">
                      {decision.action}
                    </span>{' '}
                    — {decision.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
      {allowedActions.completeEvent && lifecycleStatus !== 'completed' ? (
        <div className="island-shell mt-5 rounded-lg px-6 py-5">
          <h2 className="text-xl font-extrabold">Final Confirmed Slot ended</h2>
          <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
            Complete this Event while preserving its Publication, Operational
            Approval, health, cast, and decision history.
          </p>
          <button
            className="mt-4 rounded-md bg-[var(--sea-ink)] px-5 py-3 font-extrabold text-white disabled:opacity-60"
            disabled={isCompleting}
            onClick={async () => {
              setCompletionError(null)
              setIsCompleting(true)
              try {
                const result = await completeEventFn({
                  data: {
                    commandId: crypto.randomUUID(),
                    eventId: event.id,
                  },
                })
                if (!result.ok) {
                  setCompletionError(result.error.message)
                  return
                }
                setLifecycleStatus(result.data.lifecycleStatus)
              } finally {
                setIsCompleting(false)
              }
            }}
            type="button"
          >
            {isCompleting ? 'Completing…' : 'Complete Event'}
          </button>
          {completionError ? (
            <p className="mt-3 font-semibold text-red-800">{completionError}</p>
          ) : null}
        </div>
      ) : null}
      {publicContent && publicDraft ? (
        <section className="island-shell mt-5 rounded-lg px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold">Public presentation</h2>
              <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
                {publicDraft.revisionNumber
                  ? `Unpublished revision ${publicDraft.revisionNumber}, version ${publicDraft.version}.`
                  : 'No public-content revision has been saved yet.'}{' '}
                The published anonymous snapshot is not changed by this form.
              </p>
            </div>
            {publicContent.publishedRevisionId ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-900">
                Published snapshot preserved
              </span>
            ) : null}
          </div>
          {publicContent.blockers.length > 0 ? (
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
              <p className="font-bold text-amber-950">Readiness blockers</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-amber-950">
                {publicContent.blockers.map((blocker) => (
                  <li key={blocker.code}>{blocker.message}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {publicContent.preview ? (
            <article className="mt-5 rounded-lg border border-[var(--line)] bg-white px-5 py-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
                Anonymous preview
              </p>
              <h3 className="mt-2 text-2xl font-extrabold">
                {publicContent.preview.title}
              </h3>
              {publicContent.preview.imageUrl ? (
                <img
                  alt=""
                  className="mt-4 max-h-64 w-full rounded-md object-cover"
                  src={publicContent.preview.imageUrl}
                />
              ) : null}
              <p className="mt-4 whitespace-pre-wrap">
                {publicContent.preview.description}
              </p>
              <p className="mt-4 font-bold">
                {formatAdmissionPrice(
                  publicContent.preview.admissionPriceCents,
                )}
              </p>
              <ul className="mt-3 grid gap-2">
                {publicContent.preview.occurrences.map((occurrence) => (
                  <li key={`${occurrence.startsAt}-${occurrence.locationName}`}>
                    {occurrence.localStartsAt} · {occurrence.locationName}
                  </li>
                ))}
              </ul>
              {publicContent.preview.castCredits.length > 0 ? (
                <p className="mt-4">
                  Cast:{' '}
                  {publicContent.preview.castCredits
                    .map((credit) => credit.displayName)
                    .join(', ')}
                </p>
              ) : null}
              {publicContent.preview.admissionCallToAction.href ? (
                <a
                  className="mt-4 inline-flex rounded-md bg-[var(--sea-ink)] px-5 py-3 font-extrabold text-white"
                  href={publicContent.preview.admissionCallToAction.href}
                >
                  {publicContent.preview.admissionCallToAction.label}
                </a>
              ) : (
                <p className="mt-4 font-semibold">
                  {publicContent.preview.admissionCallToAction.label}
                </p>
              )}
            </article>
          ) : null}
          {publicContent.atRiskContinuationRequired ? (
            <p className="mt-5 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 font-semibold text-amber-950">
              Record an audited management reason above before continuing this
              At Risk Event to Publication.
            </p>
          ) : null}
          {publicContent.allowedActions.publishEvent &&
          publicDraft.id &&
          publicDraft.version ? (
            <button
              className="mt-5 rounded-md bg-[var(--coral)] px-5 py-3 font-extrabold text-white disabled:opacity-60"
              disabled={isPublishing}
              onClick={async () => {
                setPublicContentError(null)
                setIsPublishing(true)
                try {
                  const result = await publishEventFn({
                    data: {
                      commandId: crypto.randomUUID(),
                      eventId: event.id,
                      expectedVersion: publicDraft.version!,
                      publicContentRevisionId: publicDraft.id!,
                    },
                  })
                  if (!result.ok) {
                    setPublicContentError(result.error.message)
                    return
                  }
                  window.location.reload()
                } finally {
                  setIsPublishing(false)
                }
              }}
              type="button"
            >
              {isPublishing ? 'Publishing…' : 'Publish anonymous snapshot'}
            </button>
          ) : null}
          <form
            className="mt-5 grid gap-5"
            onSubmit={async (submitEvent) => {
              submitEvent.preventDefault()
              if (!publicContent.allowedActions.editPublicContent) return
              setPublicContentError(null)
              setPublicContentSaved(false)
              setIsSavingPublicContent(true)
              try {
                const result = await saveEventPublicContentFn({
                  data: {
                    admissionPriceCents: publicDraft.admissionPriceCents ?? 0,
                    castCredits: publicDraft.castCredits.map(
                      ({ position, publiclyCredited, userId }) => ({
                        position,
                        publiclyCredited,
                        userId,
                      }),
                    ),
                    commandId: crypto.randomUUID(),
                    description: publicDraft.description,
                    eventId: event.id,
                    expectedVersion: publicDraft.version,
                    externalUrl:
                      publicDraft.salesChannel === 'external'
                        ? publicDraft.externalUrl
                        : null,
                    imageUrl: publicDraft.imageUrl,
                    salesChannel:
                      publicDraft.salesChannel ?? 'no_advance_ticketing',
                    title: publicDraft.title,
                  },
                })
                if (!result.ok) {
                  setPublicContentError(result.error.message)
                  return
                }
                setPublicDraft(result.data)
                setPublicContentSaved(true)
              } finally {
                setIsSavingPublicContent(false)
              }
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold">
                Public title
                <input
                  className="rounded-md border border-[var(--line)] bg-white px-4 py-3"
                  disabled={!publicContent.allowedActions.editPublicContent}
                  onChange={(change) =>
                    setPublicDraft((current) =>
                      current
                        ? { ...current, title: change.target.value }
                        : current,
                    )
                  }
                  value={publicDraft.title}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                Image URL
                <input
                  className="rounded-md border border-[var(--line)] bg-white px-4 py-3"
                  disabled={!publicContent.allowedActions.editPublicContent}
                  onChange={(change) =>
                    setPublicDraft((current) =>
                      current
                        ? { ...current, imageUrl: change.target.value || null }
                        : current,
                    )
                  }
                  type="url"
                  value={publicDraft.imageUrl ?? ''}
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-bold">
              Public description
              <textarea
                className="min-h-32 rounded-md border border-[var(--line)] bg-white px-4 py-3"
                disabled={!publicContent.allowedActions.editPublicContent}
                onChange={(change) =>
                  setPublicDraft((current) =>
                    current
                      ? { ...current, description: change.target.value }
                      : current,
                  )
                }
                value={publicDraft.description}
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold">
                General-admission price (USD)
                <input
                  className="rounded-md border border-[var(--line)] bg-white px-4 py-3"
                  disabled={!publicContent.allowedActions.editPublicContent}
                  min="0"
                  onChange={(change) =>
                    setPublicDraft((current) =>
                      current
                        ? {
                            ...current,
                            admissionPriceCents: Math.round(
                              Number(change.target.value) * 100,
                            ),
                          }
                        : current,
                    )
                  }
                  step="0.01"
                  type="number"
                  value={(publicDraft.admissionPriceCents ?? 0) / 100}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                Sales Channel
                <select
                  className="rounded-md border border-[var(--line)] bg-white px-4 py-3"
                  disabled={!publicContent.allowedActions.editPublicContent}
                  onChange={(change) =>
                    setPublicDraft((current) =>
                      current
                        ? {
                            ...current,
                            externalUrl:
                              change.target.value === 'external'
                                ? current.externalUrl
                                : null,
                            salesChannel: change.target.value as
                              'external' | 'no_advance_ticketing',
                          }
                        : current,
                    )
                  }
                  value={publicDraft.salesChannel ?? 'no_advance_ticketing'}
                >
                  <option value="external">External ticketing</option>
                  <option value="no_advance_ticketing">
                    No advance ticketing
                  </option>
                </select>
              </label>
            </div>
            {publicDraft.salesChannel === 'external' ? (
              <label className="grid gap-2 text-sm font-bold">
                Ticket or reservation URL
                <input
                  className="rounded-md border border-[var(--line)] bg-white px-4 py-3"
                  disabled={!publicContent.allowedActions.editPublicContent}
                  onChange={(change) =>
                    setPublicDraft((current) =>
                      current
                        ? {
                            ...current,
                            externalUrl: change.target.value || null,
                          }
                        : current,
                    )
                  }
                  required
                  type="url"
                  value={publicDraft.externalUrl ?? ''}
                />
              </label>
            ) : null}
            <fieldset className="grid gap-2">
              <legend className="text-sm font-bold">Public Cast credits</legend>
              {publicDraft.castCredits.map((credit) => (
                <label
                  className="flex items-center gap-3 rounded-md border border-[var(--line)] bg-white px-4 py-3"
                  key={credit.userId}
                >
                  <input
                    checked={credit.publiclyCredited}
                    disabled={!publicContent.allowedActions.editPublicContent}
                    onChange={(change) =>
                      setPublicDraft((current) =>
                        current
                          ? {
                              ...current,
                              castCredits: current.castCredits.map(
                                (candidate) =>
                                  candidate.userId === credit.userId
                                    ? {
                                        ...candidate,
                                        publiclyCredited: change.target.checked,
                                      }
                                    : candidate,
                              ),
                            }
                          : current,
                      )
                    }
                    type="checkbox"
                  />
                  Credit {credit.displayName} for this Event
                </label>
              ))}
            </fieldset>
            {publicContentError ? (
              <p className="font-semibold text-red-800">{publicContentError}</p>
            ) : null}
            {publicContentSaved ? (
              <p className="font-semibold text-emerald-800">
                Unpublished public-content revision saved.
              </p>
            ) : null}
            {publicContent.allowedActions.editPublicContent ? (
              <button
                className="w-fit rounded-md bg-[var(--sea-ink)] px-5 py-3 font-extrabold text-white disabled:opacity-60"
                disabled={isSavingPublicContent || !publicDraft.title.trim()}
                type="submit"
              >
                {isSavingPublicContent
                  ? 'Saving…'
                  : 'Save unpublished revision'}
              </button>
            ) : (
              <p className="text-sm font-semibold text-[var(--sea-ink-soft)]">
                Producer access is required to edit this revision.
              </p>
            )}
          </form>
        </section>
      ) : null}
      {event.show_leadership.length > 0 ? (
        <section className="island-shell mt-5 rounded-lg px-6 py-6">
          <h2 className="text-2xl font-extrabold">Leadership</h2>
          <ul className="mt-3 grid gap-2">
            {event.show_leadership.map((leader) => (
              <li key={`${leader.role}-${leader.user_id}`}>
                {leader.profiles.display_name} · {leader.role}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm font-semibold text-[var(--sea-ink-soft)]">
            Accepted Cast Members:{' '}
            {cast.filter(({ status }) => status === 'accepted').length}.
            Leadership never creates Cast membership; casting begins with a
            separate invitation and acceptance.
          </p>
        </section>
      ) : null}
      <section className="island-shell mt-5 rounded-lg px-6 py-6">
        <h2 className="text-2xl font-extrabold">Cast participation</h2>
        {view === 'pending_invitee' ? (
          <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
            Your participation response is separate from every Candidate Slot
            Availability Response.
          </p>
        ) : null}
        <div className="mt-4 grid gap-2">
          {cast.map((castMember) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--line)] bg-white px-4 py-3"
              key={castMember.user_id}
            >
              <span className="font-bold">
                {castMember.profiles.display_name}
              </span>
              <span className="text-sm font-semibold capitalize text-[var(--sea-ink-soft)]">
                {castMember.status}
              </span>
            </div>
          ))}
          {cast.length === 0 ? (
            <p className="text-sm text-[var(--sea-ink-soft)]">
              No Cast invitations yet.
            </p>
          ) : null}
        </div>
        {allowedActions.inviteCast ? (
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <label className="grid min-w-64 gap-2 text-sm font-bold">
              Active Theater Member
              <select
                className="rounded-md border border-[var(--line)] bg-white px-4 py-3"
                onChange={(change) => setInviteeUserId(change.target.value)}
                value={inviteeUserId}
              >
                <option value="">Choose a Member</option>
                {activeMembers
                  .filter(
                    (member) =>
                      !cast.some(
                        (castMember) => castMember.user_id === member.userId,
                      ),
                  )
                  .map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.displayName}
                    </option>
                  ))}
              </select>
            </label>
            <button
              className="rounded-md bg-[var(--coral)] px-5 py-3 font-extrabold text-white disabled:opacity-60"
              disabled={!inviteeUserId || isCasting}
              onClick={async () => {
                setCastingError(null)
                setIsCasting(true)
                try {
                  const result = await inviteEventCastMemberFn({
                    data: { eventId: event.id, memberUserId: inviteeUserId },
                  })
                  if (!result.ok) {
                    setCastingError(result.error.message)
                    return
                  }
                  const member = activeMembers.find(
                    ({ userId }) => userId === inviteeUserId,
                  )
                  if (member) {
                    setCast((current) => [
                      ...current,
                      {
                        invited_at: new Date().toISOString(),
                        profiles: { display_name: member.displayName },
                        responded_at: null,
                        source: 'invited',
                        status: 'pending',
                        user_id: member.userId,
                      },
                    ])
                  }
                  setInviteeUserId('')
                } finally {
                  setIsCasting(false)
                }
              }}
              type="button"
            >
              {isCasting ? 'Inviting…' : 'Invite to Cast'}
            </button>
          </div>
        ) : null}
        {allowedActions.respondToInvitation &&
        ownInvitation?.status === 'pending' ? (
          <div className="mt-5 flex flex-wrap gap-3">
            {(['accepted', 'declined'] as const).map((response) => (
              <button
                className="rounded-md border border-[var(--line)] bg-white px-5 py-3 font-extrabold capitalize disabled:opacity-60"
                disabled={isCasting}
                key={response}
                onClick={async () => {
                  setCastingError(null)
                  setIsCasting(true)
                  try {
                    const result = await respondToEventCastInvitationFn({
                      data: { eventId: event.id, response },
                    })
                    if (!result.ok) {
                      setCastingError(result.error.message)
                      return
                    }
                    setCast((current) =>
                      current.map((castMember) =>
                        castMember.user_id === actorUserId
                          ? {
                              ...castMember,
                              responded_at: new Date().toISOString(),
                              status: response,
                            }
                          : castMember,
                      ),
                    )
                  } finally {
                    setIsCasting(false)
                  }
                }}
                type="button"
              >
                {response === 'accepted'
                  ? 'Accept invitation'
                  : 'Decline invitation'}
              </button>
            ))}
          </div>
        ) : null}
        {allowedActions.withdrawFromCast &&
        ownInvitation?.status === 'accepted' ? (
          <button
            className="mt-5 rounded-md border border-red-300 bg-white px-5 py-3 font-extrabold text-red-800 disabled:opacity-60"
            disabled={isCasting}
            onClick={async () => {
              setCastingError(null)
              setIsCasting(true)
              try {
                const result = await withdrawFromEventCastFn({
                  data: {
                    commandId: crypto.randomUUID(),
                    eventId: event.id,
                    expectedHealthVersion: operationalHealthVersion,
                  },
                })
                if (!result.ok) {
                  setCastingError(result.error.message)
                  return
                }
                setCast((current) =>
                  current.map((castMember) =>
                    castMember.user_id === actorUserId
                      ? { ...castMember, status: 'withdrawn' }
                      : castMember,
                  ),
                )
                setOperationalHealth(result.data.operationalHealth)
                setOperationalHealthVersion(
                  result.data.operationalHealthVersion,
                )
              } finally {
                setIsCasting(false)
              }
            }}
            type="button"
          >
            Withdraw from Event
          </button>
        ) : null}
        {castingError ? (
          <p className="mt-3 font-bold text-red-700">{castingError}</p>
        ) : null}
      </section>
      {view === 'operational' && proposalPreparation ? (
        <>
          <ProposalPreparation.RevisionSection />
          {proposalRevisions.length > 0 ? (
            <section className="island-shell mt-5 rounded-lg px-6 py-6">
              <h2 className="text-2xl font-extrabold">Submitted revisions</h2>
              <ul className="mt-3 grid gap-2">
                {proposalRevisions.map((revision) => (
                  <li
                    className="rounded-md border border-[var(--line)] bg-white px-4 py-3"
                    key={revision.id}
                  >
                    Revision {revision.revision_number} ·{' '}
                    <span className="capitalize">
                      {revision.decision_state.replace('_', ' ')}
                    </span>
                    {revision.show_proposal_decisions ? (
                      <div
                        className="mt-3 rounded-md bg-[var(--sand)]/50 px-3 py-3 text-sm"
                        key={revision.show_proposal_decisions.id}
                      >
                        <p className="font-bold capitalize">
                          {revision.show_proposal_decisions.action.replace(
                            '_',
                            ' ',
                          )}
                          {revision.show_proposal_decisions.owner_override
                            ? ' · Owner override'
                            : ''}
                        </p>
                        {revision.show_proposal_decisions.reason ? (
                          <p className="mt-1">
                            Reason: {revision.show_proposal_decisions.reason}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {revision.show_counteroffers.map((counteroffer) => (
                      <ProposalCounterofferCard
                        canRespond={allowedActions.respondToCounteroffer}
                        counteroffer={counteroffer}
                        key={counteroffer.id}
                        slot={
                          candidateSlots.find(
                            ({ slot }) =>
                              slot.id === counteroffer.candidate_slot_id,
                          )?.slot
                        }
                      />
                    ))}
                    {revision.decision_state === 'pending' &&
                    allowedActions.reviewProposalRevisions ? (
                      <>
                        <ProposalDecisionControls
                          actorUserId={actorUserId}
                          canUseOwnerOverride={
                            allowedActions.useOwnerSelfApproval &&
                            revision.submitted_by === actorUserId
                          }
                          onDecided={(decision) => {
                            setProposalRevisions((current) =>
                              current.map((candidate) =>
                                candidate.id === revision.id
                                  ? {
                                      ...candidate,
                                      decision_state:
                                        decision.action === 'approve'
                                          ? 'approved'
                                          : decision.action === 'request_edits'
                                            ? 'changes_requested'
                                            : 'denied',
                                      decision_version:
                                        candidate.decision_version + 1,
                                      show_proposal_decisions: {
                                        action: decision.action,
                                        actor_user_id: decision.actorUserId,
                                        command_id: decision.commandId,
                                        created_at: decision.createdAt,
                                        id: decision.id,
                                        owner_override: decision.ownerOverride,
                                        reason: decision.reason,
                                        revision_version:
                                          decision.revisionVersion,
                                      },
                                    }
                                  : candidate,
                              ),
                            )
                            if (decision.action === 'approve') {
                              setLifecycleStatus('approved')
                            } else if (decision.action === 'request_edits') {
                              setLifecycleStatus('draft')
                            }
                          }}
                          revision={revision}
                        />
                        {allowedActions.issueCounteroffer &&
                        revision.submitted_by !== actorUserId ? (
                          <ProposalCounterofferForm
                            occurrences={event.show_occurrences}
                            revision={revision}
                            theater={theater}
                          />
                        ) : null}
                      </>
                    ) : null}
                    {revision.decision_state === 'denied' &&
                    allowedActions.seedDeniedReplacement ? (
                      <DeniedProposalReplacementForm
                        revisionId={revision.id}
                        theaterSlug={theater.slug}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
      <section className="island-shell mt-5 rounded-lg px-6 py-6">
        <h2 className="text-2xl font-extrabold">
          {view === 'pending_invitee'
            ? 'Your Availability Responses'
            : 'Collaborative availability matrix'}
        </h2>
        <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
          Availability is recorded per Candidate Slot and never changes Event
          participation.
        </p>
        <div className="mt-5 grid gap-4">
          {candidateSlots.map(({ slot }, slotIndex) => {
            const ownResponse = availabilityResponses.find(
              (response) =>
                response.candidate_slot_id === slot.id &&
                response.user_id === actorUserId,
            )
            const coordinationKey = `availability-${slot.id}`

            return (
              <article
                className="rounded-md border border-[var(--line)] bg-white px-4 py-4"
                key={slot.id}
              >
                <h3 className="font-extrabold">
                  Candidate Slot {slotIndex + 1}
                </h3>
                <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                  {slot.local_starts_at.slice(0, 16).replace('T', ' ')} ·{' '}
                  {slot.location_name}
                </p>
                {allowedActions.respondToAvailability ? (
                  <label className="mt-3 grid max-w-sm gap-2 text-sm font-bold">
                    Availability for Candidate Slot {slotIndex + 1}
                    <select
                      className="rounded-md border border-[var(--line)] bg-white px-3 py-2"
                      disabled={savingCoordinationKey === coordinationKey}
                      onChange={async (change) => {
                        const response = change.target.value as
                          'available' | 'unavailable' | 'uncertain'
                        setCoordinationError(null)
                        setSavingCoordinationKey(coordinationKey)
                        try {
                          const result =
                            await recordCandidateSlotAvailabilityFn({
                              data: {
                                candidateSlotId: slot.id,
                                commandId: crypto.randomUUID(),
                                expectedVersion: ownResponse?.version ?? null,
                                response,
                              },
                            })
                          if (!result.ok) {
                            setCoordinationError(result.error.message)
                            return
                          }
                          setAvailabilityResponses((current) => [
                            ...current.filter(
                              (item) =>
                                !(
                                  item.candidate_slot_id === slot.id &&
                                  item.user_id === actorUserId
                                ),
                            ),
                            {
                              actor_user_id: result.data.actorUserId,
                              candidate_slot_id: result.data.candidateSlotId,
                              responded_at: result.data.respondedAt,
                              response: result.data.response,
                              user_id: result.data.userId,
                              version: result.data.version,
                            },
                          ])
                        } finally {
                          setSavingCoordinationKey(null)
                        }
                      }}
                      value={ownResponse?.response ?? ''}
                    >
                      <option disabled value="">
                        Choose availability
                      </option>
                      <option value="available">Available</option>
                      <option value="unavailable">Unavailable</option>
                      <option value="uncertain">Uncertain</option>
                    </select>
                  </label>
                ) : null}
                {view !== 'pending_invitee' ? (
                  <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {cast.map((castMember) => {
                      const response = availabilityResponses.find(
                        (item) =>
                          item.candidate_slot_id === slot.id &&
                          item.user_id === castMember.user_id,
                      )
                      return (
                        <div
                          className="rounded bg-[var(--sand)]/40 px-3 py-2"
                          key={castMember.user_id}
                        >
                          <dt className="text-xs font-bold">
                            {castMember.profiles.display_name}
                          </dt>
                          <dd className="text-sm capitalize">
                            {response?.response ?? 'No response'}
                          </dd>
                        </div>
                      )
                    })}
                  </dl>
                ) : null}
              </article>
            )
          })}
        </div>
        {view !== 'pending_invitee' ? (
          <div className="mt-7">
            <h3 className="text-xl font-extrabold">Occurrence Calls</h3>
            <div className="mt-3 grid gap-4">
              {event.show_occurrences.map((occurrence, occurrenceIndex) => (
                <article
                  className="rounded-md border border-[var(--line)] bg-white px-4 py-4"
                  key={occurrence.id}
                >
                  <h4 className="font-extrabold">
                    Occurrence {occurrenceIndex + 1} ·{' '}
                    <span className="capitalize">
                      {occurrence.occurrence_type}
                    </span>
                  </h4>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {acceptedCast.map((castMember) => {
                      const currentCall = occurrenceCalls.find(
                        (call) =>
                          call.occurrence_id === occurrence.id &&
                          call.user_id === castMember.user_id,
                      )
                      const coordinationKey = `call-${occurrence.id}-${castMember.user_id}`
                      return (
                        <label
                          className="grid gap-2 text-sm font-bold"
                          key={castMember.user_id}
                        >
                          Call for {castMember.profiles.display_name},
                          Occurrence {occurrenceIndex + 1}
                          <select
                            className="rounded-md border border-[var(--line)] bg-white px-3 py-2 capitalize"
                            disabled={
                              !allowedActions.assignOccurrenceCalls ||
                              savingCoordinationKey === coordinationKey
                            }
                            onChange={async (change) => {
                              const call = change.target.value as
                                'required' | 'optional' | 'not_called'
                              setCoordinationError(null)
                              setSavingCoordinationKey(coordinationKey)
                              try {
                                const result = await setOccurrenceCallFn({
                                  data: {
                                    call,
                                    castMemberUserId: castMember.user_id,
                                    commandId: crypto.randomUUID(),
                                    expectedVersion:
                                      currentCall?.version ?? null,
                                    occurrenceId: occurrence.id,
                                  },
                                })
                                if (!result.ok) {
                                  setCoordinationError(result.error.message)
                                  return
                                }
                                setOccurrenceCalls((current) => [
                                  ...current.filter(
                                    (item) =>
                                      !(
                                        item.occurrence_id === occurrence.id &&
                                        item.user_id === castMember.user_id
                                      ),
                                  ),
                                  {
                                    actor_user_id: result.data.actorUserId,
                                    assigned_at: result.data.assignedAt,
                                    call: result.data.call,
                                    occurrence_id: result.data.occurrenceId,
                                    user_id: result.data.userId,
                                    version: result.data.version,
                                  },
                                ])
                              } finally {
                                setSavingCoordinationKey(null)
                              }
                            }}
                            value={currentCall?.call ?? ''}
                          >
                            <option disabled value="">
                              Choose call
                            </option>
                            <option value="required">Required</option>
                            <option value="optional">Optional</option>
                            <option value="not_called">Not called</option>
                          </select>
                        </label>
                      )
                    })}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
        {coordinationError ? (
          <p className="mt-3 font-bold text-red-700">{coordinationError}</p>
        ) : null}
      </section>
      {proposalPreparation ? <ProposalPreparation.PlanSection /> : null}
    </main>
  )

  if (proposalPreparation) {
    return (
      <ProposalPreparation.Root initial={proposalPreparation}>
        {content}
      </ProposalPreparation.Root>
    )
  }

  return content
}

function NumberField({
  disabled,
  label,
  max = 500,
  min = 1,
  onChange,
  value,
}: {
  disabled: boolean
  label: string
  max?: number
  min?: number
  onChange: (value: number) => void
  value: number
}) {
  return (
    <label className="grid gap-2 text-sm font-bold">
      {label}
      <input
        className="rounded-md border border-[var(--line)] bg-white px-3 py-2"
        disabled={disabled}
        max={max}
        min={min}
        onChange={(event) => onChange(event.target.valueAsNumber)}
        type="number"
        value={value}
      />
    </label>
  )
}

function ProposalCounterofferForm({
  occurrences,
  revision,
  theater,
}: {
  occurrences: Array<{
    id: string
    occurrence_type: 'rehearsal' | 'performance'
  }>
  revision: { decision_version: number; id: string }
  theater: {
    primary_venue_name: string | null
    timezone: string | null
  }
}) {
  const [occurrenceId, setOccurrenceId] = useState(occurrences[0]?.id ?? '')
  const [localStartsAt, setLocalStartsAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [locationKind, setLocationKind] = useState<
    'primary_venue' | 'off_site'
  >('primary_venue')
  const [locationName, setLocationName] = useState(
    theater.primary_venue_name?.trim() || 'Primary Venue',
  )
  const [responseDeadline, setResponseDeadline] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  return (
    <div className="mt-4 grid gap-3 rounded-md border border-[var(--line)] bg-[var(--sand)]/30 px-4 py-4">
      <p className="font-extrabold">Scheduling Counteroffer</p>
      <label className="grid gap-2 text-sm font-bold">
        Target Occurrence
        <select
          className="rounded-md border border-[var(--line)] bg-white px-3 py-2"
          onChange={(change) => setOccurrenceId(change.target.value)}
          value={occurrenceId}
        >
          {occurrences.map((occurrence, index) => (
            <option key={occurrence.id} value={occurrence.id}>
              Occurrence {index + 1} · {occurrence.occurrence_type}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold">
          Offered local date and time
          <input
            className="rounded-md border border-[var(--line)] bg-white px-3 py-2"
            onChange={(change) => setLocalStartsAt(change.target.value)}
            type="datetime-local"
            value={localStartsAt}
          />
        </label>
        <NumberField
          disabled={isSaving}
          label="Offered duration (minutes)"
          max={1440}
          min={15}
          onChange={setDurationMinutes}
          value={durationMinutes}
        />
      </div>
      <label className="grid gap-2 text-sm font-bold">
        Offered location
        <select
          className="rounded-md border border-[var(--line)] bg-white px-3 py-2"
          onChange={(change) => {
            const next = change.target.value as 'primary_venue' | 'off_site'
            setLocationKind(next)
            if (next === 'primary_venue') {
              setLocationName(
                theater.primary_venue_name?.trim() || 'Primary Venue',
              )
            }
          }}
          value={locationKind}
        >
          <option value="primary_venue">Primary Venue</option>
          <option value="off_site">Approved off-site location</option>
        </select>
      </label>
      {locationKind === 'off_site' ? (
        <label className="grid gap-2 text-sm font-bold">
          Off-site location name
          <input
            className="rounded-md border border-[var(--line)] bg-white px-3 py-2"
            onChange={(change) => setLocationName(change.target.value)}
            value={locationName}
          />
        </label>
      ) : null}
      <label className="grid gap-2 text-sm font-bold">
        Response deadline override (optional)
        <input
          className="rounded-md border border-[var(--line)] bg-white px-3 py-2"
          onChange={(change) => setResponseDeadline(change.target.value)}
          type="datetime-local"
          value={responseDeadline}
        />
      </label>
      <p className="text-sm text-[var(--sea-ink-soft)]">
        Blank uses the Theater response window. Times display in{' '}
        {theater.timezone ?? 'the Theater timezone'}.
      </p>
      {error ? <p className="font-semibold text-red-800">{error}</p> : null}
      <button
        className="w-fit rounded-md bg-[var(--sea-ink)] px-4 py-2 font-extrabold text-white disabled:opacity-50"
        disabled={
          isSaving || !occurrenceId || !localStartsAt || !locationName.trim()
        }
        onClick={async () => {
          setError(null)
          setIsSaving(true)
          try {
            const result = await issueProposalCounterofferFn({
              data: {
                commandId: crypto.randomUUID(),
                durationMinutes,
                expectedVersion: revision.decision_version,
                localStartsAt,
                locationKind,
                locationName:
                  locationName.trim() ||
                  theater.primary_venue_name?.trim() ||
                  'Primary Venue',
                occurrenceId: occurrenceId || occurrences[0]?.id || '',
                proposalRevisionId: revision.id,
                ...(responseDeadline
                  ? {
                      responseDeadline: new Date(
                        responseDeadline,
                      ).toISOString(),
                    }
                  : {}),
                timezoneName: theater.timezone ?? 'UTC',
              },
            })
            if (!result.ok) {
              setError(result.error.message)
              return
            }
            window.location.reload()
          } finally {
            setIsSaving(false)
          }
        }}
        type="button"
      >
        {isSaving ? 'Issuing…' : 'Issue Counteroffer'}
      </button>
    </div>
  )
}

function ProposalCounterofferCard({
  canRespond,
  counteroffer,
  slot,
}: {
  canRespond: boolean
  counteroffer: {
    id: string
    response_deadline: string
    state: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'
  }
  slot?: {
    duration_minutes: number
    local_starts_at: string
    location_name: string
  }
}) {
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  return (
    <div className="mt-3 rounded-md bg-amber-50 px-3 py-3 text-sm text-amber-950">
      <p className="font-extrabold capitalize">
        Counteroffer · {counteroffer.state}
      </p>
      {slot ? (
        <p className="mt-1">
          {slot.local_starts_at.slice(0, 16).replace('T', ' ')} ·{' '}
          {slot.duration_minutes} minutes · {slot.location_name}
        </p>
      ) : null}
      <p className="mt-1">
        Respond by {new Date(counteroffer.response_deadline).toLocaleString()}.
      </p>
      {error ? (
        <p className="mt-2 font-semibold text-red-800">{error}</p>
      ) : null}
      {canRespond && counteroffer.state === 'pending' ? (
        <div className="mt-3 flex gap-2">
          {(['accept', 'decline'] as const).map((response) => (
            <button
              className="rounded-md border border-amber-950 bg-white px-3 py-2 font-extrabold capitalize disabled:opacity-50"
              disabled={isSaving}
              key={response}
              onClick={async () => {
                setError(null)
                setIsSaving(true)
                try {
                  const result = await respondToProposalCounterofferFn({
                    data: {
                      commandId: crypto.randomUUID(),
                      counterofferId: counteroffer.id,
                      response,
                    },
                  })
                  if (!result.ok) {
                    setError(result.error.message)
                    return
                  }
                  window.location.reload()
                } finally {
                  setIsSaving(false)
                }
              }}
              type="button"
            >
              {response} Counteroffer
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ProposalDecisionControls({
  actorUserId,
  canUseOwnerOverride,
  onDecided,
  revision,
}: {
  actorUserId: string
  canUseOwnerOverride: boolean
  onDecided: (decision: {
    action: 'approve' | 'request_edits' | 'deny'
    actorUserId: string
    commandId: string
    createdAt: string
    id: string
    ownerOverride: boolean
    proposalRevisionId: string
    reason: string | null
    revisionVersion: number
  }) => void
  revision: {
    decision_version: number
    id: string
    revision_number: number
    submitted_by: string
  }
}) {
  const isAuthor = revision.submitted_by === actorUserId
  const [action, setAction] = useState<'approve' | 'request_edits' | 'deny'>(
    'approve',
  )
  const [reason, setReason] = useState('')
  const [ownerOverride, setOwnerOverride] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  if (isAuthor && !canUseOwnerOverride) {
    return (
      <p className="mt-3 text-sm font-semibold text-[var(--sea-ink-soft)]">
        Separation from authorship prevents you from deciding this revision.
      </p>
    )
  }

  return (
    <div className="mt-4 grid gap-3 rounded-md border border-[var(--line)] bg-[var(--sand)]/30 px-4 py-4">
      <p className="font-extrabold">Record review decision</p>
      {isAuthor ? (
        <label className="flex items-start gap-3 text-sm font-semibold">
          <input
            checked={ownerOverride}
            onChange={(change) => setOwnerOverride(change.target.checked)}
            type="checkbox"
          />
          Explicitly invoke the audited Owner self-approval override
        </label>
      ) : (
        <label className="grid gap-2 text-sm font-bold">
          Decision
          <select
            className="rounded-md border border-[var(--line)] bg-white px-3 py-2"
            onChange={(change) =>
              setAction(
                change.target.value as 'approve' | 'request_edits' | 'deny',
              )
            }
            value={action}
          >
            <option value="approve">Approve</option>
            <option value="request_edits">Request edits</option>
            <option value="deny">Deny</option>
          </select>
        </label>
      )}
      <label className="grid gap-2 text-sm font-bold">
        {action === 'approve' && !isAuthor
          ? 'Reason (optional)'
          : 'Reason (required)'}
        <textarea
          className="min-h-24 rounded-md border border-[var(--line)] bg-white px-3 py-2"
          maxLength={2000}
          onChange={(change) => setReason(change.target.value)}
          value={reason}
        />
      </label>
      {error ? <p className="font-semibold text-red-800">{error}</p> : null}
      <button
        className="w-fit rounded-md bg-[var(--sea-ink)] px-4 py-2 font-extrabold text-white disabled:opacity-50"
        disabled={
          isSaving ||
          (isAuthor && (!ownerOverride || !reason.trim())) ||
          (action !== 'approve' && !reason.trim())
        }
        onClick={async () => {
          setError(null)
          setIsSaving(true)
          try {
            const result = await reviewProposalRevisionFn({
              data: {
                action,
                commandId: crypto.randomUUID(),
                expectedVersion: revision.decision_version,
                ownerOverride: isAuthor && ownerOverride,
                proposalRevisionId: revision.id,
                reason: reason.trim() || null,
              },
            })
            if (!result.ok) {
              setError(result.error.message)
              return
            }
            onDecided(result.data)
          } finally {
            setIsSaving(false)
          }
        }}
        type="button"
      >
        {isSaving
          ? 'Saving…'
          : isAuthor
            ? 'Approve with Owner override'
            : `Record ${action.replace('_', ' ')}`}
      </button>
    </div>
  )
}

function DeniedProposalReplacementForm({
  revisionId,
  theaterSlug,
}: {
  revisionId: string
  theaterSlug: string
}) {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  return (
    <div className="mt-4 grid gap-3 rounded-md border border-[var(--line)] bg-[var(--sand)]/30 px-4 py-4">
      <p className="font-extrabold">Seed a linked replacement Event</p>
      <p className="text-sm text-[var(--sea-ink-soft)]">
        This copies the denied operational plan into a new draft. Cast
        participation is intentionally not carried into the new Event.
      </p>
      <label className="grid gap-2 text-sm font-bold">
        Replacement title
        <input
          className="rounded-md border border-[var(--line)] bg-white px-3 py-2"
          onChange={(change) => {
            setTitle(change.target.value)
            if (!slug) setSlug(toSlug(change.target.value))
          }}
          value={title}
        />
      </label>
      <label className="grid gap-2 text-sm font-bold">
        Replacement slug
        <input
          className="rounded-md border border-[var(--line)] bg-white px-3 py-2"
          onChange={(change) => setSlug(change.target.value)}
          value={slug}
        />
      </label>
      {error ? <p className="font-semibold text-red-800">{error}</p> : null}
      <button
        className="w-fit rounded-md border border-[var(--line)] bg-white px-4 py-2 font-extrabold disabled:opacity-50"
        disabled={isSaving || !title.trim() || !slug}
        onClick={async () => {
          setError(null)
          setIsSaving(true)
          try {
            const result = await seedDeniedProposalReplacementFn({
              data: {
                commandId: crypto.randomUUID(),
                proposalRevisionId: revisionId,
                slug,
                title,
              },
            })
            if (!result.ok) {
              setError(result.error.message)
              return
            }
            window.location.assign(
              `/app/${theaterSlug}/events/${result.data.slug}`,
            )
          } finally {
            setIsSaving(false)
          }
        }}
        type="button"
      >
        {isSaving ? 'Creating…' : 'Create linked replacement'}
      </button>
    </div>
  )
}

function StateCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="island-shell rounded-lg px-5 py-5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--kicker)]">
        {label}
      </p>
      <p className="mt-2 text-xl font-extrabold">{value}</p>
    </div>
  )
}

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
