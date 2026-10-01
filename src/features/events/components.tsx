import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEffect, useState } from 'react'

import {
  cancelEventFn,
  createManagedEventFn,
  inviteEventCastMemberFn,
  inviteEventStaffMemberFn,
  issueProposalCounterofferFn,
  manageAtRiskEventFn,
  publishEventFn,
  recordCandidateSlotAvailabilityFn,
  requestEventCancellationFn,
  reviewProposalRevisionFn,
  respondToEventCastInvitationFn,
  respondToEventStaffInvitationFn,
  respondToProposalCounterofferFn,
  saveEventPublicContentFn,
  setOccurrenceCallFn,
  seedDeniedProposalReplacementFn,
  withdrawFromEventCastFn,
} from './server-functions'
import { EventOccurrences } from './event-overview/occurrences'
import { ProposalPreparation } from './proposal-preparation/production'
import { partitionPublicReadinessBlockers } from './public-content-readiness'

import type { Database, Json } from '@/server/db/database.types'
import type { PublicReadinessBlocker } from './public-content-readiness'
import type { EventOverviewReadModel } from './event-overview/read-model'
import type { EventHistoryReadModel } from './event-history/read-model'
import type { ProposalPreparationReadModel } from './proposal-preparation/types'

type EventLeadershipRole = Database['public']['Enums']['event_leadership_role']
type EventLifecycle = Database['public']['Enums']['show_lifecycle_status']
type EventHealth = Database['public']['Enums']['show_operational_health']
type EventPublication = Database['public']['Enums']['show_publication_status']
type EventWorkspaceSection =
  | 'overview'
  | 'schedule-plan'
  | 'cast-team'
  | 'review'
  | 'public-page'
  | 'history'

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
    <main className="page-wrap py-6">
      <p className="text-xs font-medium tracking-normal text-muted-foreground">
        Events · {theater.name}
      </p>
      <h1 className="display-title mt-3 text-2xl font-medium text-foreground">
        Create a managed Event
      </h1>
      {!actorEligible ? (
        <p className="mt-5 rounded-md border border-border bg-muted px-4 py-3 font-semibold text-foreground">
          Current Theater policy does not allow you to use the Producer
          workflow.
        </p>
      ) : null}
      <form
        className="mt-6 grid gap-5 rounded-lg px-6 py-6"
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
        <Label className="grid gap-2 text-sm font-medium">
          Event title
          <Input
            onChange={(event) => {
              setTitle(event.target.value)
              if (!slug) {
                setSlug(toSlug(event.target.value))
              }
            }}
            value={title}
          />
        </Label>
        <Label className="grid gap-2 text-sm font-medium">
          Event slug
          <Input
            onChange={(event) => setSlug(event.target.value)}
            value={slug}
          />
        </Label>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Co-Producers</legend>
          {members
            .filter((member) => member.isEligibleProducer)
            .map((member) => (
              <Label className="flex items-center gap-3" key={member.userId}>
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
              </Label>
            ))}
        </fieldset>
        <Label className="grid gap-2 text-sm font-medium">
          Director
          <NativeSelect
            onChange={(event) => setDirectorUserId(event.target.value)}
            value={directorUserId}
          >
            <option value="">Assign later</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.displayName}
              </option>
            ))}
          </NativeSelect>
        </Label>
        {error ? (
          <p className="font-semibold text-foreground">{error}</p>
        ) : null}
        <Button
          disabled={!actorEligible || !title.trim() || !slug || isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Creating…' : 'Create Event draft'}
        </Button>
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
    <main className="page-wrap py-6">
      <p className="text-xs font-medium tracking-normal text-muted-foreground">
        {theater.name} · Event
      </p>
      <h1 className="display-title mt-3 text-2xl font-medium text-foreground sm:text-5xl">
        {content.title}
      </h1>
      {event.lifecycleStatus === 'cancelled' ? (
        <div className="mt-6 rounded-md border border-border bg-muted px-5 py-4 text-foreground">
          <p className="font-semibold">This Event has been cancelled.</p>
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
        <Card className=" px-6 py-6 gap-0">
          <p className="whitespace-pre-wrap text-lg">{content.description}</p>
          {content.castCredits.length > 0 ? (
            <div className="mt-6">
              <h2 className="text-xl font-semibold">Cast</h2>
              <ul className="mt-2 grid gap-1">
                {content.castCredits.map((credit) => (
                  <li key={`${credit.position}-${credit.displayName}`}>
                    {credit.displayName}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
        <aside className="rounded-lg px-6 py-6">
          <h2 className="text-xl font-semibold">Performances</h2>
          <ul className="mt-3 grid gap-4">
            {content.occurrences.map((occurrence) => (
              <li key={`${occurrence.startsAt}-${occurrence.locationName}`}>
                <p className="font-medium">{occurrence.localStartsAt}</p>
                <p className="text-sm text-muted-foreground">
                  {occurrence.locationName} · {occurrence.durationMinutes}{' '}
                  minutes · {occurrence.timezoneName}
                </p>
              </li>
            ))}
          </ul>
          {event.lifecycleStatus === 'cancelled' ? (
            <p className="mt-6 font-semibold text-foreground">
              Admission is closed because this Event was cancelled.
            </p>
          ) : (
            <p className="mt-6 text-lg font-semibold">
              {formatAdmissionPrice(content.admissionPriceCents)}
            </p>
          )}
          {event.lifecycleStatus !== 'cancelled' &&
          content.admissionCallToAction.href ? (
            <Button asChild variant="outline" className="mt-3">
              <a href={content.admissionCallToAction.href} rel="noreferrer">
                {content.admissionCallToAction.label}
              </a>
            </Button>
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

export function ManagedEventWorkspace({
  selectedOccurrenceId,
  activeMembers,
  actorUserId,
  allowedActions,
  event,
  history,
  overview,
  proposalPreparation,
  publicContent,
  theater,
  view,
}: {
  selectedOccurrenceId?: string
  activeMembers: Array<{ displayName: string; userId: string }>
  actorUserId: string
  allowedActions: {
    assignOccurrenceCalls: boolean
    cancelEvent: boolean
    editOperationalPlan: boolean
    inviteCast: boolean
    inviteStaff: boolean
    issueCounteroffer: boolean
    manageAtRisk: boolean
    respondToAvailability: boolean
    respondToInvitation: boolean
    respondToStaffInvitation: boolean
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
    show_staff_assignments: Array<{
      id: string
      resource_request_id: string | null
      responsibility: string | null
      status: string
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
  history: EventHistoryReadModel
  overview: EventOverviewReadModel
  proposalPreparation: ProposalPreparationReadModel | null
  publicContent: {
    allowedActions: {
      editPublicContent: boolean
      isTheaterOperator: boolean
      publishEvent: boolean
    }
    atRiskContinuationRequired: boolean
    blockers: PublicReadinessBlocker[]
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
    name?: string
    primary_venue_id: string
    primary_venue_name: string | null
    setup_buffer_minutes: number
    slug: string
    timezone: string | null
    timezone_source: 'unknown' | 'inferred' | 'manual'
    turnover_buffer_minutes: number
  }
  view: 'operational' | 'accepted_cast' | 'accepted_staff' | 'pending_invitee'
}) {
  const [activeSection, setActiveSection] =
    useState<EventWorkspaceSection>('overview')
  const [cast, setCast] = useState(event.show_cast)
  const [inviteeUserId, setInviteeUserId] = useState('')
  const [staffInviteeUserId, setStaffInviteeUserId] = useState('')
  const [staffRequestId, setStaffRequestId] = useState('')
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
  const [proposalRevisions, setProposalRevisions] = useState(
    event.show_proposal_revisions,
  )
  const publicReadiness = publicContent
    ? partitionPublicReadinessBlockers(publicContent.blockers)
    : null
  const canViewReview = overview.sections.some(
    ({ label }) => label === 'Review',
  )
  const ownInvitation = cast.find(
    (castMember) => castMember.user_id === actorUserId,
  )
  const acceptedCast = cast.filter(({ status }) => status === 'accepted')
  const calledParticipants = [
    ...acceptedCast.map((castMember) => ({
      displayName: castMember.profiles.display_name,
      userId: castMember.user_id,
    })),
    ...event.show_staff_assignments
      .filter(({ status }) => status === 'accepted')
      .flatMap((assignment) => {
        if (
          acceptedCast.some(({ user_id }) => user_id === assignment.user_id)
        ) {
          return []
        }
        const member = activeMembers.find(
          ({ userId }) => userId === assignment.user_id,
        )
        return member
          ? [{ displayName: member.displayName, userId: member.userId }]
          : []
      }),
  ]
  const visibleCalledParticipants =
    view === 'operational'
      ? calledParticipants
      : calledParticipants.filter(({ userId }) => userId === actorUserId)
  const candidateSlots = event.show_occurrences.flatMap((occurrence) =>
    occurrence.show_candidate_slots.map((slot) => ({
      occurrence,
      slot,
    })),
  )

  useEffect(() => {
    const setSectionFromHash = () => {
      const section = sectionForFragment(window.location.hash.slice(1))
      setActiveSection(
        overview.sections.some(({ target }) => target === `#${section}`)
          ? section
          : 'overview',
      )
    }

    setSectionFromHash()
    window.addEventListener('hashchange', setSectionFromHash)
    return () => window.removeEventListener('hashchange', setSectionFromHash)
  }, [overview.sections])

  useEffect(() => {
    const fragment = window.location.hash.slice(1)
    if (fragment) document.getElementById(fragment)?.scrollIntoView()
  }, [activeSection])

  const content = (
    <main className="page-wrap min-w-0 break-words py-6">
      <p className="text-xs font-medium tracking-normal text-muted-foreground">
        {theater.name ?? theater.slug} · Event
      </p>
      <h1 className="display-title mt-3 text-2xl font-medium text-foreground">
        {event.title}
      </h1>
      <a className="mt-3 inline-block text-sm underline" href={`/app/${theater.slug}/events`}>Back to Event portfolio</a>
      <EventWorkspaceNavigation
        activeSection={activeSection}
        onSectionSelect={setActiveSection}
        sections={overview.sections}
      />
      {activeSection === 'overview' ? (
        <EventOverview
          lifecycleStatus={lifecycleStatus}
          operationalHealth={operationalHealth}
          overview={overview}
        />
      ) : null}
      {activeSection === 'overview' && view !== 'pending_invitee' ? (
        <EventOccurrences occurrences={event.show_occurrences} selectedOccurrenceId={selectedOccurrenceId} />
      ) : null}
      {activeSection === 'schedule-plan' && proposalPreparation ? (
        <ProposalPreparation.PlanSection />
      ) : null}
      {activeSection === 'overview' && lifecycleStatus === 'cancelled' ? (
        <section className="mt-5 rounded-lg border border-border bg-muted px-6 py-5 text-foreground">
          <h2 className="text-xl font-semibold">Event cancelled</h2>
          <p className="mt-2 text-sm">
            Future Occurrences and schedule commitments have ended. The Event,
            Proposal Revisions, decisions, cast credits, and factual history are
            preserved.
          </p>
          {event.publication_status === 'published' ? (
            <p className="mt-2 text-sm font-medium">
              Its public route remains available with a cancellation notice.
            </p>
          ) : null}
        </section>
      ) : null}
      {activeSection === 'overview' &&
      (allowedActions.requestCancellation || allowedActions.cancelEvent) &&
      lifecycleStatus !== 'cancelled' ? (
        <Card className="mt-5  px-6 py-5 gap-0">
          <h2 className="text-xl font-semibold">Cancellation</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Producers may recommend cancellation. Only an active Owner or Admin
            can make the final decision.
          </p>
          <Label className="mt-4 grid gap-2 text-sm font-medium">
            Cancellation reason
            <Textarea
              onChange={(change) => setCancellationReason(change.target.value)}
              value={cancellationReason}
            />
          </Label>
          <div className="mt-4 flex flex-wrap gap-3">
            {allowedActions.requestCancellation ? (
              <Button
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
              </Button>
            ) : null}
            {allowedActions.cancelEvent ? (
              <Button
                variant="destructive"

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
              </Button>
            ) : null}
          </div>
          {cancellationResult ? (
            <p className="mt-4 font-medium">{cancellationResult}</p>
          ) : null}
          {cancellationError ? (
            <p className="mt-4 font-medium text-foreground">
              {cancellationError}
            </p>
          ) : null}
          {cancellationRequests.length > 0 ? (
            <div className="mt-5 border-t border-border pt-4">
              <h3 className="font-semibold">Cancellation requests</h3>
              <ul className="mt-2 grid gap-2 text-sm">
                {cancellationRequests.map((request) => (
                  <li key={request.id}>{request.reason}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      ) : null}
      {activeSection === 'overview' && operationalHealth === 'at_risk' ? (
        <section
          className="mt-5 rounded-lg border border-border bg-muted px-6 py-5 text-foreground"
          id="operational-health"
        >
          <h2 className="text-xl font-semibold">Event is At Risk</h2>
          <p className="mt-2 text-sm">
            Operational Approval and Publication remain unchanged. Management
            must explicitly revise, reschedule, allow, or cancel this Event.
          </p>
          {allowedActions.manageAtRisk ? (
            <div className="mt-5 grid gap-4">
              <Label className="grid gap-2 text-sm font-medium">
                At Risk management reason
                <Textarea
                  onChange={(change) =>
                    setRiskManagementReason(change.target.value)
                  }
                  value={riskManagementReason}
                />
              </Label>
              <div className="flex flex-wrap gap-3">
                {(
                  [
                    ['allow', 'Allow continuation'],
                    ['revise', 'Revise Event'],
                    ['reschedule', 'Reschedule Event'],
                  ] as const
                ).map(([action, label]) => (
                  <Button
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
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
          {riskManagementResult ? (
            <p className="mt-4 font-medium">{riskManagementResult}</p>
          ) : null}
          {riskManagementError ? (
            <p className="mt-4 font-medium text-foreground">
              {riskManagementError}
            </p>
          ) : null}
          {event.show_risk_management_decisions.length > 0 ? (
            <div className="mt-5 border-t border-border pt-4">
              <h3 className="font-semibold">Management history</h3>
              <ul className="mt-2 grid gap-2 text-sm">
                {event.show_risk_management_decisions.map((decision) => (
                  <li key={decision.id}>
                    <span className="font-medium capitalize">
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
      {activeSection === 'public-page' && publicContent && publicDraft ? (
        <Card className="mt-5  px-6 py-6 gap-0" id="public-page">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Public Page</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {publicDraft.revisionNumber
                  ? `Unpublished revision ${publicDraft.revisionNumber}, version ${publicDraft.version}.`
                  : 'No public-content revision has been saved yet.'}{' '}
                Producer edits never change the published anonymous snapshot.
              </p>
            </div>
            {publicContent.publishedRevisionId ? (
              <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-foreground">
                Published snapshot preserved
              </span>
            ) : null}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-white px-4 py-3">
              <p className="text-xs font-medium tracking-normal text-muted-foreground">
                Operational Approval
              </p>
              <p className="mt-1 font-semibold capitalize">
                {lifecycleStatus === 'approved' ? 'approved' : 'not approved'}
              </p>
            </div>
            <div className="rounded-md border border-border bg-white px-4 py-3">
              <p className="text-xs font-medium tracking-normal text-muted-foreground">
                Publication
              </p>
              <p className="mt-1 font-semibold capitalize">
                {event.publication_status === 'published'
                  ? 'Published'
                  : 'Unpublished'}
              </p>
            </div>
          </div>
          {publicReadiness?.producer.length ? (
            <div className="mt-4 rounded-md border border-border bg-muted px-4 py-3">
              <p className="font-medium text-foreground">
                Producer work needed
              </p>
              <ul className="mt-2 list-disc pl-5 text-sm text-foreground">
                {publicReadiness.producer.map((blocker) => (
                  <li key={blocker.code}>{blocker.message}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {publicReadiness?.theaterOperator.length ? (
            <div className="mt-4 rounded-md border border-border bg-muted px-4 py-3">
              <p className="font-medium text-foreground">
                Theater Operator conditions
              </p>
              <ul className="mt-2 list-disc pl-5 text-sm text-foreground">
                {publicReadiness.theaterOperator.map((blocker) => (
                  <li key={blocker.code}>{blocker.message}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {publicContent.preview ? (
            <article className="mt-5 rounded-lg border border-border bg-white px-5 py-5">
              <p className="text-xs font-medium tracking-normal text-muted-foreground">
                {publicContent.blockers.length === 0
                  ? 'Exact eligible anonymous snapshot'
                  : 'Draft anonymous preview'}
              </p>
              <h3 className="mt-2 text-2xl font-semibold">
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
              <p className="mt-4 font-medium">
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
                <Button asChild variant="default" className="mt-4">
                  <a href={publicContent.preview.admissionCallToAction.href}>
                    {publicContent.preview.admissionCallToAction.label}
                  </a>
                </Button>
              ) : (
                <p className="mt-4 font-semibold">
                  {publicContent.preview.admissionCallToAction.label}
                </p>
              )}
            </article>
          ) : null}
          {publicContent.atRiskContinuationRequired ? (
            <p className="mt-5 rounded-md border border-border bg-muted px-4 py-3 font-semibold text-foreground">
              Record an audited management reason above before continuing this
              At Risk Event to Publication.
            </p>
          ) : null}
          <section className="mt-5 border-t border-border pt-5">
            <h3 className="text-xl font-semibold">Publication</h3>
            {publicContent.allowedActions.publishEvent &&
            publicDraft.id &&
            publicDraft.version ? (
              <Button
                className="mt-4"
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
                {isPublishing
                  ? 'Publishing…'
                  : 'Publish exact anonymous snapshot'}
              </Button>
            ) : publicContent.allowedActions.isTheaterOperator ? (
              <p className="mt-2 text-sm font-semibold text-muted-foreground">
                {publicReadiness?.producer.length
                  ? 'Publication is unavailable while Producer work remains above.'
                  : 'Publication is unavailable until the Theater Operator conditions above are resolved.'}
              </p>
            ) : (
              <p className="mt-2 text-sm font-semibold text-muted-foreground">
                Publication remains a Theater Operator decision after this
                snapshot is eligible.
              </p>
            )}
          </section>
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
              <Label className="grid gap-2 text-sm font-medium">
                Public title
                <Input
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
              </Label>
              <Label className="grid gap-2 text-sm font-medium">
                Image URL
                <Input
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
              </Label>
            </div>
            <Label className="grid gap-2 text-sm font-medium">
              Public description
              <Textarea
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
            </Label>
            <div className="grid gap-4 md:grid-cols-2">
              <Label className="grid gap-2 text-sm font-medium">
                General-admission price (USD)
                <Input
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
              </Label>
              <Label className="grid gap-2 text-sm font-medium">
                Sales Channel
                <NativeSelect
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
                </NativeSelect>
              </Label>
            </div>
            {publicDraft.salesChannel === 'external' ? (
              <Label className="grid gap-2 text-sm font-medium">
                Ticket or reservation URL
                <Input
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
              </Label>
            ) : null}
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">
                Public Cast credits
              </legend>
              {publicDraft.castCredits.map((credit) => (
                <Label
                  className="flex items-center gap-3 rounded-md border border-border bg-white px-4 py-3"
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
                </Label>
              ))}
            </fieldset>
            {publicContentError ? (
              <p className="font-semibold text-foreground">
                {publicContentError}
              </p>
            ) : null}
            {publicContentSaved ? (
              <p className="font-semibold text-foreground">
                Unpublished public-content revision saved.
              </p>
            ) : null}
            {publicContent.allowedActions.editPublicContent ? (
              <Button
                className="w-fit"
                disabled={isSavingPublicContent || !publicDraft.title.trim()}
                type="submit"
              >
                {isSavingPublicContent
                  ? 'Saving…'
                  : 'Save unpublished revision'}
              </Button>
            ) : (
              <p className="text-sm font-semibold text-muted-foreground">
                Producer access is required to edit this revision.
              </p>
            )}
          </form>
        </Card>
      ) : null}
      {activeSection === 'cast-team' ? (
        <div aria-labelledby="cast-team-heading" id="cast-team">
          <Card className="mt-5  px-6 py-6 gap-0">
            <h2 className="text-2xl font-semibold" id="cast-team-heading">
              Cast &amp; Team
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Coordinate leadership, Cast participation, named Event staff,
              Availability Responses, Proposed Cast, and Occurrence Calls
              without treating Event staff assignments as Cast membership.
            </p>
          </Card>
          {event.show_leadership.length > 0 ? (
            <Card className="mt-5  px-6 py-6 gap-0">
              <h2 className="text-2xl font-semibold">Leadership</h2>
              <ul className="mt-3 grid gap-2">
                {event.show_leadership.map((leader) => (
                  <li key={`${leader.role}-${leader.user_id}`}>
                    {leader.profiles.display_name} · {leader.role}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm font-semibold text-muted-foreground">
                Accepted Cast Members:{' '}
                {cast.filter(({ status }) => status === 'accepted').length}.
                Leadership never creates Cast membership; casting begins with a
                separate invitation and acceptance.
              </p>
            </Card>
          ) : null}
          {allowedActions.respondToInvitation || (view !== 'accepted_staff' &&
            (view !== 'pending_invitee' ||
              allowedActions.respondToInvitation)) ||
          allowedActions.respondToAvailability ? (
            <>
              <Card className="mt-5  px-6 py-6 gap-0" id="cast-participation">
                <h2 className="text-2xl font-semibold">Cast participation</h2>
                {view === 'pending_invitee' ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your participation response is separate from every Candidate
                    Slot Availability Response.
                  </p>
                ) : null}
                <div className="mt-4 grid gap-2">
                  {cast.map((castMember) => (
                    <div
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-white px-4 py-3"
                      key={castMember.user_id}
                    >
                      <span className="font-medium">
                        {castMember.profiles.display_name}
                      </span>
                      <span className="text-sm font-semibold capitalize text-muted-foreground">
                        {castMember.status}
                      </span>
                    </div>
                  ))}
                  {cast.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No Cast invitations yet.
                    </p>
                  ) : null}
                </div>
                {allowedActions.inviteCast ? (
                  <div className="mt-5 flex flex-wrap items-end gap-3">
                    <Label className="grid min-w-64 gap-2 text-sm font-medium">
                      Active Theater Member
                      <NativeSelect
                        onChange={(change) =>
                          setInviteeUserId(change.target.value)
                        }
                        value={inviteeUserId}
                      >
                        <option value="">Choose a Member</option>
                        {activeMembers
                          .filter(
                            (member) =>
                              !cast.some(
                                (castMember) =>
                                  castMember.user_id === member.userId,
                              ),
                          )
                          .map((member) => (
                            <option key={member.userId} value={member.userId}>
                              {member.displayName}
                            </option>
                          ))}
                      </NativeSelect>
                    </Label>
                    <Button
                      disabled={!inviteeUserId || isCasting}
                      onClick={async () => {
                        setCastingError(null)
                        setIsCasting(true)
                        try {
                          const result = await inviteEventCastMemberFn({
                            data: {
                              eventId: event.id,
                              memberUserId: inviteeUserId,
                            },
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
                    </Button>
                  </div>
                ) : null}
                {allowedActions.respondToInvitation &&
                ownInvitation?.status === 'pending' ? (
                  <div className="mt-5 flex flex-wrap gap-3">
                    {(['accepted', 'declined'] as const).map((response) => (
                      <Button
                        variant="outline"

                        disabled={isCasting}
                        key={response}
                        onClick={async () => {
                          setCastingError(null)
                          setIsCasting(true)
                          try {
                            const result = await respondToEventCastInvitationFn(
                              {
                                data: { eventId: event.id, response },
                              },
                            )
                            if (!result.ok) {
                              setCastingError(result.error.message)
                              return
                            }
                            window.location.reload()
                          } finally {
                            setIsCasting(false)
                          }
                        }}
                        type="button"
                      >
                        {response === 'accepted'
                          ? 'Accept invitation'
                          : 'Decline invitation'}
                      </Button>
                    ))}
                  </div>
                ) : null}
                {allowedActions.withdrawFromCast &&
                ownInvitation?.status === 'accepted' ? (
                  <Button
                    variant="destructive"
                    className="mt-5"
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
                  </Button>
                ) : null}
                {castingError ? (
                  <p className="mt-3 font-medium text-foreground">
                    {castingError}
                  </p>
                ) : null}
              </Card>
            </>
          ) : null}
          {event.show_resource_requests.length > 0 ||
          event.show_staff_assignments.length > 0 ||
          allowedActions.inviteStaff ? (
            <Card className="mt-5  px-6 py-6 gap-0" id="event-staff-assignment">
              <h2 className="text-2xl font-semibold">
                Event staff assignments and coverage
              </h2>
              {event.show_resource_requests
                .filter((request) => request.resource_type === 'staff')
                .map((request) => {
                  const assignments = event.show_staff_assignments.filter(
                    (assignment) =>
                      assignment.resource_request_id === request.id,
                  )
                  const acceptedCoverage = assignments.filter(
                    (assignment) => assignment.status === 'accepted',
                  ).length

                  return (
                    <div
                      className="mt-4 rounded-md border border-border bg-muted/40 px-4 py-3"
                      key={request.id}
                    >
                      <h3 className="font-semibold">{request.label}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Accepted coverage: {acceptedCoverage} of{' '}
                        {request.quantity} requested
                      </p>
                    </div>
                  )
                })}
              {event.show_staff_assignments.map((assignment) => (
                <div
                  className="mt-3 rounded-md border border-border bg-white px-4 py-3"
                  key={assignment.id}
                >
                  <p className="font-medium">
                    {activeMembers.find(
                      (member) => member.userId === assignment.user_id,
                    )?.displayName ?? 'Theater Member'}{' '}
                    · {assignment.responsibility}
                  </p>
                  <p className="text-sm capitalize text-muted-foreground">
                    {assignment.status}
                  </p>
                  {allowedActions.respondToStaffInvitation &&
                  assignment.user_id === actorUserId &&
                  assignment.status === 'pending' ? (
                    <div className="mt-3 flex gap-3">
                      {(['accepted', 'declined'] as const).map((response) => (
                        <Button
                          variant="outline"

                          key={response}
                          onClick={async () => {
                            const result =
                              await respondToEventStaffInvitationFn({
                                data: { assignmentId: assignment.id, response },
                              })
                            if (result.ok) window.location.reload()
                            else setCastingError(result.error.message)
                          }}
                          type="button"
                        >
                          {response === 'accepted'
                            ? 'Accept assignment'
                            : 'Decline'}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </Card>
          ) : null}
          {allowedActions.inviteStaff ? (
            <Card className="mt-5  px-6 py-6 gap-0" id="event-staff-invitation">
              <h2 className="text-2xl font-semibold">Invite Event staff</h2>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <Label className="grid gap-2 text-sm font-medium">
                  Staffing need
                  <NativeSelect
                    onChange={(change) =>
                      setStaffRequestId(change.target.value)
                    }
                    value={staffRequestId}
                  >
                    <option value="">Choose a need</option>
                    {event.show_resource_requests
                      .filter((request) => request.resource_type === 'staff')
                      .map((request) => (
                        <option key={request.id} value={request.id}>
                          {request.label} · {request.quantity} required
                        </option>
                      ))}
                  </NativeSelect>
                </Label>
                <Label className="grid gap-2 text-sm font-medium">
                  Active Theater Member
                  <NativeSelect
                    onChange={(change) =>
                      setStaffInviteeUserId(change.target.value)
                    }
                    value={staffInviteeUserId}
                  >
                    <option value="">Choose a Member</option>
                    {activeMembers.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.displayName}
                      </option>
                    ))}
                  </NativeSelect>
                </Label>
                <Button
                  disabled={!staffInviteeUserId || !staffRequestId || isCasting}
                  onClick={async () => {
                    setCastingError(null)
                    setIsCasting(true)
                    try {
                      const result = await inviteEventStaffMemberFn({
                        data: {
                          eventId: event.id,
                          memberUserId: staffInviteeUserId,
                          resourceRequestId: staffRequestId,
                        },
                      })
                      if (!result.ok) {
                        setCastingError(result.error.message)
                        return
                      }
                      window.location.reload()
                    } finally {
                      setIsCasting(false)
                    }
                  }}
                  type="button"
                >
                  Invite staff
                </Button>
              </div>
            </Card>
          ) : null}
          {view === 'operational' && proposalPreparation ? (
            <ProposalPreparation.ProposedCastSection />
          ) : null}
          {overview.invitation ? null : view === 'accepted_staff' &&
          !allowedActions.respondToAvailability ? (
            <Card className="mt-5  px-6 py-6 gap-0" id="assigned-occurrences">
              <h2 className="text-2xl font-semibold">
                Your assigned Occurrences and Calls
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Only Occurrences selected for your Event staff responsibility
                appear here.
              </p>
              <div className="mt-4 grid gap-3">
                {event.show_occurrences.map((occurrence, occurrenceIndex) => {
                  const call = occurrence.show_occurrence_calls.find(
                    (item) => item.user_id === actorUserId,
                  )
                  const slot = occurrence.show_candidate_slots.find(
                    (item) =>
                      item.id === occurrence.confirmed_candidate_slot_id,
                  )
                  return (
                    <article
                      className="rounded-md border border-border bg-white px-4 py-3"
                      id={`occurrence-call-${occurrence.id}`}
                      key={occurrence.id}
                    >
                      <p className="font-medium">
                        Occurrence {occurrenceIndex + 1} ·{' '}
                        <span className="capitalize">
                          {occurrence.occurrence_type}
                        </span>
                      </p>
                      <p className="mt-1 text-sm capitalize">
                        {call?.call.replace('_', ' ')}
                      </p>
                      {slot ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {slot.local_starts_at.slice(0, 16).replace('T', ' ')}{' '}
                          · {slot.location_name}
                        </p>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            </Card>
          ) : (
            <>
              <Card className="mt-5  px-6 py-6 gap-0" id="availability">
                <h2 className="text-2xl font-semibold">
                  {view === 'pending_invitee'
                    ? 'Your Availability Responses'
                    : 'Collaborative availability matrix'}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Availability is recorded per Candidate Slot and never changes
                  Event participation.
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
                        className="rounded-md border border-border bg-white px-4 py-4"
                        id={coordinationKey}
                        key={slot.id}
                      >
                        <h3 className="font-semibold">
                          Candidate Slot {slotIndex + 1}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {slot.local_starts_at.slice(0, 16).replace('T', ' ')}{' '}
                          · {slot.location_name}
                        </p>
                        {allowedActions.respondToAvailability ? (
                          <Label className="mt-3 grid max-w-sm gap-2 text-sm font-medium">
                            Availability for Candidate Slot {slotIndex + 1}
                            <NativeSelect
                              disabled={
                                savingCoordinationKey === coordinationKey
                              }
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
                                        expectedVersion:
                                          ownResponse?.version ?? null,
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
                                      candidate_slot_id:
                                        result.data.candidateSlotId,
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
                            </NativeSelect>
                          </Label>
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
                                  className="rounded bg-muted/40 px-3 py-2"
                                  key={castMember.user_id}
                                >
                                  <dt className="text-xs font-medium">
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
                    <h3 className="text-xl font-semibold" id="occurrence-calls">
                      Occurrence Calls
                    </h3>
                    <div className="mt-3 grid gap-4">
                      {event.show_occurrences.map(
                        (occurrence, occurrenceIndex) => (
                          <article
                            className="rounded-md border border-border bg-white px-4 py-4"
                            id={`occurrence-call-${occurrence.id}`}
                            key={occurrence.id}
                          >
                            <h4 className="font-semibold">
                              Occurrence {occurrenceIndex + 1} ·{' '}
                              <span className="capitalize">
                                {occurrence.occurrence_type}
                              </span>
                            </h4>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              {visibleCalledParticipants.map((participant) => {
                                const currentCall = occurrenceCalls.find(
                                  (call) =>
                                    call.occurrence_id === occurrence.id &&
                                    call.user_id === participant.userId,
                                )
                                const coordinationKey = `call-${occurrence.id}-${participant.userId}`
                                return (
                                  <Label
                                    className="grid gap-2 text-sm font-medium"
                                    key={participant.userId}
                                  >
                                    Call for {participant.displayName},
                                    Occurrence {occurrenceIndex + 1}
                                    <NativeSelect
                                      disabled={
                                        !allowedActions.assignOccurrenceCalls ||
                                        savingCoordinationKey ===
                                          coordinationKey
                                      }
                                      onChange={async (change) => {
                                        const call = change.target.value as
                                          'required' | 'optional' | 'not_called'
                                        setCoordinationError(null)
                                        setSavingCoordinationKey(
                                          coordinationKey,
                                        )
                                        try {
                                          const result =
                                            await setOccurrenceCallFn({
                                              data: {
                                                call,
                                                participantUserId:
                                                  participant.userId,
                                                commandId: crypto.randomUUID(),
                                                expectedVersion:
                                                  currentCall?.version ?? null,
                                                occurrenceId: occurrence.id,
                                              },
                                            })
                                          if (!result.ok) {
                                            setCoordinationError(
                                              result.error.message,
                                            )
                                            return
                                          }
                                          setOccurrenceCalls((current) => [
                                            ...current.filter(
                                              (item) =>
                                                !(
                                                  item.occurrence_id ===
                                                    occurrence.id &&
                                                  item.user_id ===
                                                    participant.userId
                                                ),
                                            ),
                                            {
                                              actor_user_id:
                                                result.data.actorUserId,
                                              assigned_at:
                                                result.data.assignedAt,
                                              call: result.data.call,
                                              occurrence_id:
                                                result.data.occurrenceId,
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
                                      <option value="not_called">
                                        Not called
                                      </option>
                                    </NativeSelect>
                                  </Label>
                                )
                              })}
                            </div>
                          </article>
                        ),
                      )}
                    </div>
                  </div>
                ) : null}
                {coordinationError ? (
                  <p className="mt-3 font-medium text-foreground">
                    {coordinationError}
                  </p>
                ) : null}
              </Card>
            </>
          )}
        </div>
      ) : null}
      {activeSection === 'review' &&
      canViewReview &&
      (proposalRevisions.length > 0 || proposalPreparation) ? (
        <Card className="mt-5 scroll-mt-6  px-6 py-6 gap-0" id="review">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Review</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Each Proposal Revision below is the immutable snapshot that was
                submitted for review. Decisions and Counteroffers stay attached
                to that exact revision.
              </p>
            </div>
            <a
              className="text-sm font-medium underline"
              href="#proposal-revisions"
            >
              Link to submitted revisions
            </a>
          </div>
          <span className="block scroll-mt-6" id="proposal-revisions" />
          {proposalPreparation ? <ProposalPreparation.RevisionSection /> : null}
          <ul className="mt-5 grid gap-4">
            {proposalRevisions.map((revision) => (
              <li
                className="rounded-md border border-border bg-white px-4 py-4"
                id={`proposal-revision-${revision.id}`}
                key={revision.id}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold">
                    Proposal Revision {revision.revision_number}
                  </h3>
                  <span className="text-sm font-medium capitalize text-muted-foreground">
                    Current decision:{' '}
                    {revision.decision_state.replace('_', ' ')}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Submitted {new Date(revision.submitted_at).toLocaleString()}.
                </p>
                <ProposalRevisionSnapshot snapshot={revision.snapshot} />
                <div className="mt-4 border-t border-border pt-4">
                  <h4 className="font-medium">Decision history</h4>
                  {revision.show_proposal_decisions ? (
                    <div className="mt-2 rounded-md bg-muted/50 px-3 py-3 text-sm">
                      <p className="font-medium capitalize">
                        {revision.show_proposal_decisions.action.replace(
                          '_',
                          ' ',
                        )}
                        {revision.show_proposal_decisions.owner_override
                          ? ' · Owner override'
                          : ''}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        Recorded{' '}
                        {new Date(
                          revision.show_proposal_decisions.created_at,
                        ).toLocaleString()}
                        .
                      </p>
                      {revision.show_proposal_decisions.reason ? (
                        <p className="mt-1">
                          Reason: {revision.show_proposal_decisions.reason}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No final review decision has been recorded.
                    </p>
                  )}
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
                </div>
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
                                    revision_version: decision.revisionVersion,
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
        </Card>
      ) : null}
      {activeSection === 'history' &&
      overview.sections.some(({ label }) => label === 'History') ? (
        <Card className="mt-5  px-6 py-6 gap-0" id="history">
          <h2 className="text-2xl font-semibold">History</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Recorded Event facts and preserved decisions. Notifications and
            work-queue projections are intentionally not included here.
          </p>
          <ol className="mt-5 grid gap-3">
            {history.entries.map((entry) => (
              <li
                className="rounded-md border border-border bg-white px-4 py-3"
                key={entry.id}
              >
                <p className="font-semibold">{entry.action}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {entry.actor} · {new Date(entry.createdAt).toLocaleString()}
                </p>
                {entry.detail ? (
                  <p className="mt-2 text-sm">{entry.detail}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </Card>
      ) : null}
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

function ProposalRevisionSnapshot({ snapshot }: { snapshot: Json }) {
  const revision = asJsonRecord(snapshot)
  const occurrences = asJsonRecords(revision?.occurrences)
  const leadership = asJsonRecords(revision?.leadership)
  const resourceRequests = asJsonRecords(revision?.resourceRequests)
  const proposedCast = asJsonArray(revision?.proposedCastUserIds)

  if (!revision) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        This historical Proposal Revision has no readable snapshot payload.
      </p>
    )
  }

  return (
    <details className="mt-4 rounded-md bg-muted/35 px-4 py-3">
      <summary className="cursor-pointer font-medium">
        Immutable submitted snapshot
      </summary>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium">Minimum viable Cast</dt>
          <dd>{displaySnapshotValue(revision.minimumViableCast)}</dd>
        </div>
        <div>
          <dt className="font-medium">Target Cast size</dt>
          <dd>{displaySnapshotValue(revision.targetCastSize)}</dd>
        </div>
        <div>
          <dt className="font-medium">Proposed Cast</dt>
          <dd>{proposedCast.length} selected</dd>
        </div>
        <div>
          <dt className="font-medium">Leadership</dt>
          <dd>{leadership.length} recorded</dd>
        </div>
      </dl>
      <div className="mt-4 grid gap-3">
        <div>
          <h4 className="font-medium">Occurrences</h4>
          {occurrences.length > 0 ? (
            <ul className="mt-2 grid gap-2 text-sm">
              {occurrences.map((occurrence, index) => {
                const slot = asJsonRecord(occurrence.confirmedSlot)
                return (
                  <li
                    className="rounded bg-white/70 px-3 py-2"
                    key={asSnapshotString(occurrence.id) ?? index}
                  >
                    Occurrence{' '}
                    {asSnapshotString(occurrence.position) ?? index + 1} ·{' '}
                    {asSnapshotString(occurrence.type) ?? 'scheduled'}
                    {slot ? (
                      <span>
                        {' '}
                        ·{' '}
                        {asSnapshotString(slot.localStartsAt) ??
                          'time not recorded'}
                        {' · '}
                        {asSnapshotString(slot.durationMinutes) ??
                          'duration not recorded'}
                        {' minutes · '}
                        {asSnapshotString(slot.locationName) ??
                          'location not recorded'}
                      </span>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              No Occurrences were captured in this snapshot.
            </p>
          )}
        </div>
        <div>
          <h4 className="font-medium">Requested resources</h4>
          {resourceRequests.length > 0 ? (
            <ul className="mt-2 grid gap-2 text-sm">
              {resourceRequests.map((request, index) => (
                <li
                  className="rounded bg-white/70 px-3 py-2"
                  key={asSnapshotString(request.id) ?? index}
                >
                  {asSnapshotString(request.label) ?? 'Requested resource'} ·{' '}
                  {asSnapshotString(request.quantity) ?? '0'} ·{' '}
                  {asSnapshotString(request.type) ?? 'other'}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              No resource requests were captured in this snapshot.
            </p>
          )}
        </div>
      </div>
      <details className="mt-4 rounded bg-white/70 px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium">
          Exact immutable record
        </summary>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
          {JSON.stringify(snapshot, null, 2)}
        </pre>
      </details>
    </details>
  )
}

function asJsonArray(value: Json | undefined) {
  return Array.isArray(value) ? value : []
}

function asJsonRecord(value: Json | undefined) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : null
}

function asJsonRecords(value: Json | undefined) {
  return asJsonArray(value).flatMap((item) => {
    const record = asJsonRecord(item)
    return record ? [record] : []
  })
}

function asSnapshotString(value: Json | undefined) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : null
}

function displaySnapshotValue(value: Json | undefined) {
  return asSnapshotString(value) ?? 'Not set'
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
    <Label className="grid gap-2 text-sm font-medium">
      {label}
      <Input
        disabled={disabled}
        max={max}
        min={min}
        onChange={(event) => onChange(event.target.valueAsNumber)}
        type="number"
        value={value}
      />
    </Label>
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
    <div className="mt-4 grid gap-3 rounded-md border border-border bg-muted/30 px-4 py-4">
      <p className="font-semibold">Scheduling Counteroffer</p>
      <Label className="grid gap-2 text-sm font-medium">
        Target Occurrence
        <NativeSelect
          onChange={(change) => setOccurrenceId(change.target.value)}
          value={occurrenceId}
        >
          {occurrences.map((occurrence, index) => (
            <option key={occurrence.id} value={occurrence.id}>
              Occurrence {index + 1} · {occurrence.occurrence_type}
            </option>
          ))}
        </NativeSelect>
      </Label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Label className="grid gap-2 text-sm font-medium">
          Offered local date and time
          <Input
            onChange={(change) => setLocalStartsAt(change.target.value)}
            type="datetime-local"
            value={localStartsAt}
          />
        </Label>
        <NumberField
          disabled={isSaving}
          label="Offered duration (minutes)"
          max={1440}
          min={15}
          onChange={setDurationMinutes}
          value={durationMinutes}
        />
      </div>
      <Label className="grid gap-2 text-sm font-medium">
        Offered location
        <NativeSelect
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
        </NativeSelect>
      </Label>
      {locationKind === 'off_site' ? (
        <Label className="grid gap-2 text-sm font-medium">
          Off-site location name
          <Input
            onChange={(change) => setLocationName(change.target.value)}
            value={locationName}
          />
        </Label>
      ) : null}
      <Label className="grid gap-2 text-sm font-medium">
        Response deadline override (optional)
        <Input
          onChange={(change) => setResponseDeadline(change.target.value)}
          type="datetime-local"
          value={responseDeadline}
        />
      </Label>
      <p className="text-sm text-muted-foreground">
        Blank uses the Theater response window. Times display in{' '}
        {theater.timezone ?? 'the Theater timezone'}.
      </p>
      {error ? <p className="font-semibold text-foreground">{error}</p> : null}
      <Button
        className="w-fit"
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
      </Button>
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
    <div
      className="mt-3 rounded-md bg-muted px-3 py-3 text-sm text-foreground"
      id={`counteroffer-${counteroffer.id}`}
    >
      <p className="font-semibold capitalize">
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
        <p className="mt-2 font-semibold text-foreground">{error}</p>
      ) : null}
      {canRespond && counteroffer.state === 'pending' ? (
        <div className="mt-3 flex gap-2">
          {(['accept', 'decline'] as const).map((response) => (
            <Button
              variant="outline"

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
            </Button>
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
      <p className="mt-3 text-sm font-semibold text-muted-foreground">
        Separation from authorship prevents you from deciding this revision.
      </p>
    )
  }

  return (
    <div
      className={
        isAuthor
          ? 'mt-4 grid gap-3 rounded-md border-2 border-border bg-muted px-4 py-4 text-foreground'
          : 'mt-4 grid gap-3 rounded-md border border-border bg-muted/30 px-4 py-4'
      }
    >
      <p className="font-semibold">
        {isAuthor
          ? 'Exceptional Owner self-approval override'
          : 'Record review decision'}
      </p>
      {isAuthor ? (
        <>
          <p className="text-sm">
            Theater policy permits the current Owner to approve their own
            revision only as this separately reasoned and audited exception.
          </p>
          <Label className="flex items-start gap-3 text-sm font-semibold">
            <input
              checked={ownerOverride}
              onChange={(change) => setOwnerOverride(change.target.checked)}
              type="checkbox"
            />
            Explicitly invoke the audited Owner self-approval override
          </Label>
        </>
      ) : (
        <Label className="grid gap-2 text-sm font-medium">
          Decision
          <NativeSelect
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
          </NativeSelect>
        </Label>
      )}
      <Label className="grid gap-2 text-sm font-medium">
        {action === 'approve' && !isAuthor
          ? 'Reason (optional)'
          : 'Reason (required)'}
        <Textarea
          maxLength={2000}
          onChange={(change) => setReason(change.target.value)}
          value={reason}
        />
      </Label>
      {error ? <p className="font-semibold text-foreground">{error}</p> : null}
      <Button
        className="w-fit"
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
      </Button>
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
    <div className="mt-4 grid gap-3 rounded-md border border-border bg-muted/30 px-4 py-4">
      <p className="font-semibold">Seed a linked replacement Event</p>
      <p className="text-sm text-muted-foreground">
        This copies the denied operational plan into a new draft. Cast
        participation is intentionally not carried into the new Event.
      </p>
      <Label className="grid gap-2 text-sm font-medium">
        Replacement title
        <Input
          onChange={(change) => {
            setTitle(change.target.value)
            if (!slug) setSlug(toSlug(change.target.value))
          }}
          value={title}
        />
      </Label>
      <Label className="grid gap-2 text-sm font-medium">
        Replacement slug
        <Input
          onChange={(change) => setSlug(change.target.value)}
          value={slug}
        />
      </Label>
      {error ? <p className="font-semibold text-foreground">{error}</p> : null}
      <Button
        variant="outline"
        className="w-fit"
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
      </Button>
    </div>
  )
}

export function EventWorkspaceNavigation({
  activeSection,
  onSectionSelect,
  sections,
}: {
  activeSection: EventWorkspaceSection
  onSectionSelect: (section: EventWorkspaceSection) => void
  sections: Array<{ label: string; target: string }>
}) {
  return (
    <nav
      aria-label="Event workspace sections"
      className="mt-6 flex flex-wrap gap-2"
    >
      {sections.map((section) => {
        const sectionId = section.target.slice(1) as EventWorkspaceSection
        const isActive = activeSection === sectionId
        return (
          <a
            aria-current={isActive ? 'page' : undefined}
            className={`rounded-full border px-3 py-2 text-sm font-medium ${
              isActive
                ? 'border-foreground bg-foreground text-white'
                : 'border-border bg-white hover:bg-muted'
            }`}
            href={section.target}
            key={section.target}
            onClick={() => onSectionSelect(sectionId)}
          >
            {section.label}
          </a>
        )
      })}
    </nav>
  )
}

function sectionForFragment(fragment: string): EventWorkspaceSection {
  if (
    fragment === 'cast-participation' ||
    fragment === 'event-staff-assignment' ||
    fragment === 'availability' ||
    fragment.startsWith('availability-') ||
    fragment.startsWith('occurrence-call-')
  ) {
    return 'cast-team'
  }
  if (
    fragment === 'proposal-revisions' ||
    fragment.startsWith('proposal-revision-') ||
    fragment.startsWith('counteroffer-')
  ) {
    return 'review'
  }
  if (fragment.startsWith('occurrence-')) return 'overview'
  if (fragment === 'operational-health') return 'overview'
  return fragment as EventWorkspaceSection
}

function EventOverview({
  lifecycleStatus,
  operationalHealth,
  overview,
}: {
  lifecycleStatus: string
  operationalHealth: string
  overview: EventOverviewReadModel
}) {
  const currentStates = overview.states.map((state) => ({
    ...state,
    value:
      state.label === 'Lifecycle'
        ? lifecycleStatus
        : state.label === 'Operational health'
          ? operationalHealth
          : state.value,
  }))

  return (
    <section className="mt-5 scroll-mt-6" id="overview">
      <div className="grid gap-4 md:grid-cols-4">
        {currentStates.map((state) => (
          <StateCard
            key={state.label}
            label={state.label}
            value={state.value}
          />
        ))}
      </div>
      <Card className="mt-5 grid gap-5  px-6 py-6 lg:grid-cols-[1fr_1fr] gap-0">
        <div>
          <h2 className="text-2xl font-semibold">Overview</h2>
          {overview.primaryAction ? (
            <Button asChild variant="outline" className="mt-4 h-auto max-w-full whitespace-normal text-left">
              <a href={overview.primaryAction.target}>
                {overview.primaryAction.label} ·{' '}
                {overview.primaryAction.relationship}
              </a>
            </Button>
          ) : (
            <p className="mt-3 text-sm font-semibold text-muted-foreground">
              No action is currently assigned to your Event relationships.
            </p>
          )}
          {overview.secondaryActions.length > 0 ? (
            <ul className="mt-4 grid gap-2 text-sm">
              {overview.secondaryActions.map((action) => (
                <li key={`${action.label}-${action.relationship}`}>
                  <a className="font-medium underline" href={action.target}>
                    {action.label}
                  </a>{' '}
                  <span className="text-muted-foreground">
                    · {action.relationship}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {overview.blockedActions.map((action) => (
            <p
              className="mt-4 rounded-md border border-border bg-muted px-4 py-3 text-sm text-foreground"
              key={action.label}
            >
              <span className="font-medium">{action.label}</span> ·{' '}
              {action.relationship}. {action.explanation}
            </p>
          ))}
          <div className="mt-4">
            <h3 className="font-medium">Your Event relationships</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {overview.relationships.length > 0
                ? overview.relationships.join(' · ')
                : 'Authorized Event collaborator'}
            </p>
          </div>
        </div>
        {overview.invitation ? (
          <div>
            <dl className="grid content-start gap-3 text-sm">
              <div>
                <dt className="font-medium">Theater</dt>
                <dd>{overview.invitation.theaterName}</dd>
              </div>
              <div>
                <dt className="font-medium">Invited by</dt>
                <dd>{overview.invitation.inviterName}</dd>
              </div>
              <div>
                <dt className="font-medium">Your role</dt>
                <dd>{overview.invitation.role}</dd>
              </div>
              <div>
                <dt className="font-medium">Invitation status</dt>
                <dd>{overview.invitation.status}</dd>
              </div>
              <div>
                <dt className="font-medium">Planned participation</dt>
                <dd>{overview.invitation.planSummary}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-muted-foreground">
              Accept to see the details needed for your Event responsibility.
            </p>
          </div>
        ) : (
          <dl className="grid content-start gap-3 text-sm">
            <div>
              <dt className="font-medium">Next Occurrence</dt>
              <dd>
                {overview.summary.nextOccurrence
                  ? `${overview.summary.nextOccurrence.localStartsAt.replace('T', ' ')} · ${overview.summary.nextOccurrence.locationName}`
                  : 'No Confirmed Occurrence'}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Who leads this Event</dt>
              <dd>
                {overview.summary.leadership.length > 0
                  ? overview.summary.leadership.join(', ')
                  : 'No leadership assigned'}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Participation</dt>
              <dd>
                {overview.summary.participation.accepted} accepted ·{' '}
                {overview.summary.participation.pending} pending
              </dd>
            </div>
            <div>
              <dt className="font-medium">Staffing coverage</dt>
              <dd>
                {overview.summary.staffing.unfilled > 0
                  ? `${overview.summary.staffing.unfilled} requested position${overview.summary.staffing.unfilled === 1 ? '' : 's'} remain unfilled.`
                  : 'No staffing needs are unfilled'}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Viability risk</dt>
              <dd>
                {overview.summary.viability
                  ? overview.summary.viability.shortfall > 0
                    ? `${overview.summary.viability.shortfall} Cast Member${overview.summary.viability.shortfall === 1 ? '' : 's'} below minimum`
                    : 'Minimum Viable Cast is covered'
                  : 'No Minimum Viable Cast set'}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Public status</dt>
              <dd className="capitalize">
                {overview.summary.publicStatus} Public Page
              </dd>
            </div>
          </dl>
        )}
      </Card>
    </section>
  )
}

function StateCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className=" px-5 py-5 gap-0">
      <p className="text-xs font-medium tracking-normal text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold capitalize">{value.replaceAll('_', ' ')}</p>
    </Card>
  )
}

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
