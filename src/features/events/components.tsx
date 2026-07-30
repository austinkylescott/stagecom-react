import { useState } from 'react'

import {
  createManagedEventFn,
  inviteEventCastMemberFn,
  issueProposalCounterofferFn,
  publishEventFn,
  recordCandidateSlotAvailabilityFn,
  reviewProposalRevisionFn,
  respondToEventCastInvitationFn,
  respondToProposalCounterofferFn,
  saveEventPublicContentFn,
  saveEventOperationalPlanFn,
  saveEventProposedCastFn,
  setOccurrenceCallFn,
  seedDeniedProposalReplacementFn,
  submitEventProposalRevisionFn,
} from './server-functions'
import { rankCandidateSlots } from './proposal-recommendations'

import type { Database } from '@/server/db/database.types'

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
          <p className="mt-6 text-lg font-extrabold">
            {formatAdmissionPrice(content.admissionPriceCents)}
          </p>
          {content.admissionCallToAction.href ? (
            <a
              className="mt-3 inline-flex rounded-md bg-[var(--coral)] px-5 py-3 font-extrabold text-white"
              href={content.admissionCallToAction.href}
              rel="noreferrer"
            >
              {content.admissionCallToAction.label}
            </a>
          ) : (
            <p className="mt-3 font-semibold">
              {content.admissionCallToAction.label}
            </p>
          )}
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
  publicContent,
  primaryVenueCommitments,
  recommendations,
  theater,
  view,
}: {
  activeMembers: Array<{ displayName: string; userId: string }>
  actorUserId: string
  allowedActions: {
    assignOccurrenceCalls: boolean
    editOperationalPlan: boolean
    inviteCast: boolean
    issueCounteroffer: boolean
    respondToAvailability: boolean
    respondToInvitation: boolean
    respondToCounteroffer: boolean
    reviewProposalRevisions: boolean
    seedDeniedReplacement: boolean
    selectProposedCast: boolean
    submitProposalRevision: boolean
    useOwnerSelfApproval: boolean
  }
  event: {
    id: string
    approved_proposal_revision_id: string | null
    lifecycle_status: EventLifecycle
    minimum_viable_cast: number | null
    operational_health: EventHealth
    publication_status: EventPublication
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
        state: 'pending' | 'accepted' | 'declined' | 'expired'
      }>
    }>
    show_proposed_cast: Array<{ user_id: string }>
    target_cast_size: number | null
    title: string
  }
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
  primaryVenueCommitments: Array<{
    durationMinutes: number
    startsAt: string
  }>
  recommendations: Array<{
    availableCalledCastCount: number
    evidence: Array<{ code: string; message: string }>
    hasPrimaryVenueConflict: boolean
    isViable: boolean
    minimumViableCast: number
    occurrenceId: string
    rank: number
    requiredAvailableCount: number
    requiredCount: number
    requiredUnconfirmedCount: number
    slotId: string
  }>
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
  const [plan, setPlan] = useState(() => ({
    minimumViableCast: event.minimum_viable_cast ?? 1,
    occurrences: event.show_occurrences.map((occurrence) => ({
      candidateSlots: occurrence.show_candidate_slots.map((slot) => ({
        durationMinutes: slot.duration_minutes,
        id: slot.id,
        localStartsAt: slot.local_starts_at.slice(0, 16),
        locationKind: slot.location_kind,
        locationName: slot.location_name,
        offSiteApproved: slot.off_site_approved,
        position: slot.position,
        ...(slot.resource_id ? { resourceId: slot.resource_id } : {}),
        timezoneName: slot.timezone_name,
        timezoneSource: slot.timezone_source,
      })),
      confirmedCandidateSlotId: occurrence.confirmed_candidate_slot_id,
      id: occurrence.id,
      position: occurrence.position,
      type: occurrence.occurrence_type,
      visibility: occurrence.visibility,
    })),
    resourceRequests: event.show_resource_requests.map((request) => ({
      id: request.id,
      label: request.label,
      position: request.position,
      quantity: request.quantity,
      type: request.resource_type,
    })),
    targetCastSize: event.target_cast_size ?? 1,
  }))
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
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
  const [allowAtRisk, setAllowAtRisk] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [proposedCastUserIds, setProposedCastUserIds] = useState(
    event.show_proposed_cast.map(({ user_id }) => user_id),
  )
  const [proposalError, setProposalError] = useState<string | null>(null)
  const [proposalBlockers, setProposalBlockers] = useState<
    Array<{ code: string; message: string }>
  >([])
  const [proposedCastSaved, setProposedCastSaved] = useState(false)
  const [submittedRevision, setSubmittedRevision] = useState<number | null>(
    null,
  )
  const [lifecycleStatus, setLifecycleStatus] = useState(event.lifecycle_status)
  const [proposalRevisions, setProposalRevisions] = useState(
    event.show_proposal_revisions,
  )
  const [isSavingProposal, setIsSavingProposal] = useState(false)
  const [candidateRecommendations, setCandidateRecommendations] =
    useState(recommendations)
  const timezoneName = theater.timezone ?? 'UTC'
  const venueName = theater.primary_venue_name ?? 'Primary Venue'
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

  return (
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
        <StateCard
          label="Operational health"
          value={event.operational_health}
        />
      </div>
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
            <label className="mt-5 flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 font-semibold text-amber-950">
              <input
                checked={allowAtRisk}
                onChange={(change) => setAllowAtRisk(change.target.checked)}
                type="checkbox"
              />
              Explicitly allow this At Risk Event to continue to Publication.
            </label>
          ) : null}
          {publicContent.allowedActions.publishEvent &&
          publicDraft.id &&
          publicDraft.version ? (
            <button
              className="mt-5 rounded-md bg-[var(--coral)] px-5 py-3 font-extrabold text-white disabled:opacity-60"
              disabled={
                isPublishing ||
                (publicContent.atRiskContinuationRequired && !allowAtRisk)
              }
              onClick={async () => {
                setPublicContentError(null)
                setIsPublishing(true)
                try {
                  const result = await publishEventFn({
                    data: {
                      allowAtRisk,
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
        {castingError ? (
          <p className="mt-3 font-bold text-red-700">{castingError}</p>
        ) : null}
      </section>
      {view === 'operational' ? (
        <section className="island-shell mt-5 rounded-lg px-6 py-6">
          <h2 className="text-2xl font-extrabold">Proposal Revision</h2>
          <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
            Select accepted Cast Members deliberately, compare the evidence,
            save the preferred Confirmed Slots in the operational plan, then
            submit one immutable snapshot for review.
          </p>

          <fieldset className="mt-5 grid gap-2">
            <legend className="font-extrabold">Proposed Cast</legend>
            {acceptedCast.map((castMember) => (
              <label
                className="flex items-center gap-3 rounded-md border border-[var(--line)] bg-white px-4 py-3"
                key={castMember.user_id}
              >
                <input
                  checked={proposedCastUserIds.includes(castMember.user_id)}
                  disabled={!allowedActions.selectProposedCast}
                  onChange={(change) =>
                    setProposedCastUserIds((current) =>
                      change.target.checked
                        ? [...current, castMember.user_id]
                        : current.filter(
                            (userId) => userId !== castMember.user_id,
                          ),
                    )
                  }
                  type="checkbox"
                />
                {castMember.profiles.display_name}
              </label>
            ))}
            {acceptedCast.length === 0 ? (
              <p className="text-sm text-[var(--sea-ink-soft)]">
                No accepted Cast Members are available for selection. Pending
                and declined invitations do not block draft editing.
              </p>
            ) : null}
          </fieldset>

          {allowedActions.selectProposedCast ? (
            <button
              className="mt-4 rounded-md border border-[var(--line)] bg-white px-4 py-2 font-extrabold disabled:opacity-60"
              disabled={isSavingProposal}
              onClick={async () => {
                setProposalError(null)
                setProposedCastSaved(false)
                setIsSavingProposal(true)
                try {
                  const result = await saveEventProposedCastFn({
                    data: {
                      castMemberUserIds: proposedCastUserIds,
                      commandId: crypto.randomUUID(),
                      eventId: event.id,
                    },
                  })
                  if (!result.ok) {
                    setProposalError(result.error.message)
                    return
                  }
                  setProposedCastUserIds(result.data.castMemberUserIds)
                  setProposedCastSaved(true)
                  setCandidateRecommendations(
                    rankCandidateSlots({
                      availability: availabilityResponses.map((response) => ({
                        candidateSlotId: response.candidate_slot_id,
                        response: response.response,
                        userId: response.user_id,
                      })),
                      calls: occurrenceCalls.map((call) => ({
                        call: call.call,
                        occurrenceId: call.occurrence_id,
                        userId: call.user_id,
                      })),
                      commitments: primaryVenueCommitments,
                      occurrences: event.show_occurrences.map((occurrence) => ({
                        id: occurrence.id,
                        minimumViableCast: event.minimum_viable_cast ?? 1,
                        slots: occurrence.show_candidate_slots.map((slot) => ({
                          durationMinutes: slot.duration_minutes,
                          id: slot.id,
                          locationKind: slot.location_kind,
                          startsAt: slot.starts_at,
                        })),
                        type: occurrence.occurrence_type,
                      })),
                      proposedCastUserIds: result.data.castMemberUserIds,
                      setupBufferMinutes: theater.setup_buffer_minutes,
                      turnoverBufferMinutes: theater.turnover_buffer_minutes,
                    }),
                  )
                } finally {
                  setIsSavingProposal(false)
                }
              }}
              type="button"
            >
              Save Proposed Cast
            </button>
          ) : null}
          {proposedCastSaved ? (
            <p className="mt-2 font-semibold text-emerald-800">
              Proposed Cast saved.
            </p>
          ) : null}

          <div className="mt-7 grid gap-4">
            <h3 className="text-xl font-extrabold">
              Candidate Slot recommendations
            </h3>
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
                <div className="mt-3 grid gap-3">
                  {candidateRecommendations
                    .filter(
                      (recommendation) =>
                        recommendation.occurrenceId === occurrence.id,
                    )
                    .map((recommendation) => {
                      const slot = occurrence.show_candidate_slots.find(
                        ({ id }) => id === recommendation.slotId,
                      )
                      if (!slot) return null
                      return (
                        <label
                          className="grid gap-2 rounded-md bg-[var(--sand)]/40 px-4 py-3"
                          key={recommendation.slotId}
                        >
                          <span className="flex items-center gap-3 font-bold">
                            <input
                              checked={
                                plan.occurrences.find(
                                  ({ id }) => id === occurrence.id,
                                )?.confirmedCandidateSlotId ===
                                recommendation.slotId
                              }
                              disabled={!allowedActions.editOperationalPlan}
                              name={`recommended-${occurrence.id}`}
                              onChange={() =>
                                updateOccurrence(setPlan, occurrence.id, {
                                  confirmedCandidateSlotId:
                                    recommendation.slotId,
                                })
                              }
                              type="radio"
                            />
                            Rank {recommendation.rank}: {slot.location_name} ·{' '}
                            {recommendation.isViable ? 'Viable' : 'Blocked'}
                          </span>
                          <ul className="list-disc pl-5 text-sm text-[var(--sea-ink-soft)]">
                            {recommendation.evidence.map((evidence) => (
                              <li key={evidence.code}>{evidence.message}</li>
                            ))}
                          </ul>
                        </label>
                      )
                    })}
                </div>
              </article>
            ))}
          </div>

          {proposalBlockers.length > 0 ? (
            <div className="mt-5 rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
              <p className="font-bold text-amber-950">Submission blockers</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-amber-950">
                {proposalBlockers.map((blocker, index) => (
                  <li key={`${blocker.code}-${index}`}>{blocker.message}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {proposalError ? (
            <p className="mt-3 font-bold text-red-700">{proposalError}</p>
          ) : null}
          {submittedRevision ? (
            <p className="mt-3 font-bold text-emerald-800">
              Proposal Revision {submittedRevision} submitted for review.
            </p>
          ) : null}
          {allowedActions.submitProposalRevision ? (
            <button
              className="mt-5 rounded-md bg-[var(--sea-ink)] px-5 py-3 font-extrabold text-white disabled:opacity-60"
              disabled={isSavingProposal || submittedRevision !== null}
              onClick={async () => {
                setProposalError(null)
                setProposalBlockers([])
                setIsSavingProposal(true)
                try {
                  const result = await submitEventProposalRevisionFn({
                    data: { commandId: crypto.randomUUID(), eventId: event.id },
                  })
                  if (!result.ok) {
                    setProposalError(result.error.message)
                    if (Array.isArray(result.error.details)) {
                      setProposalBlockers(
                        result.error.details.filter(
                          (
                            detail,
                          ): detail is {
                            code: string
                            message: string
                          } =>
                            typeof detail === 'object' &&
                            detail !== null &&
                            'code' in detail &&
                            typeof detail.code === 'string' &&
                            'message' in detail &&
                            typeof detail.message === 'string',
                        ),
                      )
                    }
                    return
                  }
                  setSubmittedRevision(result.data.revisionNumber)
                } finally {
                  setIsSavingProposal(false)
                }
              }}
              type="button"
            >
              {isSavingProposal ? 'Submitting…' : 'Submit Proposal Revision'}
            </button>
          ) : null}

          {proposalRevisions.length > 0 ? (
            <div className="mt-7">
              <h3 className="text-xl font-extrabold">Submitted revisions</h3>
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
            </div>
          ) : null}
        </section>
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
      <section className="island-shell mt-5 rounded-lg px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold">Operational plan</h2>
            <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
              Candidate Slots use {timezoneName} and preserve the exact instant
              plus its local-time provenance.
            </p>
          </div>
          {!allowedActions.editOperationalPlan && view === 'operational' ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950">
              Only an eligible Producer can edit a draft or approved plan.
            </p>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <NumberField
            disabled={!allowedActions.editOperationalPlan}
            label="Target cast size"
            onChange={(targetCastSize) =>
              setPlan((current) => ({ ...current, targetCastSize }))
            }
            value={plan.targetCastSize}
          />
          <NumberField
            disabled={!allowedActions.editOperationalPlan}
            label="Minimum Viable Cast"
            onChange={(minimumViableCast) =>
              setPlan((current) => ({ ...current, minimumViableCast }))
            }
            value={plan.minimumViableCast}
          />
        </div>

        <div className="mt-7 grid gap-5">
          {plan.occurrences.map((occurrence, occurrenceIndex) => (
            <article
              className="rounded-lg border border-[var(--line)] bg-white px-5 py-5"
              key={occurrence.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-extrabold">
                  Occurrence {occurrenceIndex + 1}
                </h3>
                {allowedActions.editOperationalPlan ? (
                  <div className="flex flex-wrap gap-2">
                    <SmallButton
                      disabled={occurrenceIndex === 0}
                      onClick={() =>
                        setPlan((current) => ({
                          ...current,
                          occurrences: moveItem(
                            current.occurrences,
                            occurrenceIndex,
                            occurrenceIndex - 1,
                          ),
                        }))
                      }
                    >
                      Move up
                    </SmallButton>
                    <SmallButton
                      disabled={occurrenceIndex === plan.occurrences.length - 1}
                      onClick={() =>
                        setPlan((current) => ({
                          ...current,
                          occurrences: moveItem(
                            current.occurrences,
                            occurrenceIndex,
                            occurrenceIndex + 1,
                          ),
                        }))
                      }
                    >
                      Move down
                    </SmallButton>
                    <SmallButton
                      onClick={() =>
                        setPlan((current) => ({
                          ...current,
                          occurrences: current.occurrences.filter(
                            ({ id }) => id !== occurrence.id,
                          ),
                        }))
                      }
                    >
                      Remove
                    </SmallButton>
                  </div>
                ) : null}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <SelectField
                  disabled={!allowedActions.editOperationalPlan}
                  label={`Occurrence ${occurrenceIndex + 1} type`}
                  onChange={(type) =>
                    updateOccurrence(setPlan, occurrence.id, { type })
                  }
                  options={['rehearsal', 'performance']}
                  value={occurrence.type}
                />
                <SelectField
                  disabled={!allowedActions.editOperationalPlan}
                  label={`Occurrence ${occurrenceIndex + 1} visibility`}
                  onChange={(visibility) =>
                    updateOccurrence(setPlan, occurrence.id, { visibility })
                  }
                  options={['public', 'internal']}
                  value={occurrence.visibility}
                />
              </div>

              <div className="mt-5 grid gap-4">
                {occurrence.candidateSlots.map((slot, slotIndex) => (
                  <fieldset
                    className="grid gap-4 rounded-md bg-[var(--sand)]/40 px-4 py-4 sm:grid-cols-2"
                    key={slot.id}
                  >
                    <legend className="px-1 text-sm font-extrabold">
                      Candidate Slot {slotIndex + 1}
                    </legend>
                    <label className="grid gap-2 text-sm font-bold">
                      Local date and time
                      <input
                        className="rounded-md border border-[var(--line)] bg-white px-3 py-2"
                        disabled={!allowedActions.editOperationalPlan}
                        onChange={(change) =>
                          updateSlot(setPlan, occurrence.id, slot.id, {
                            localStartsAt: change.target.value,
                          })
                        }
                        type="datetime-local"
                        value={slot.localStartsAt}
                      />
                    </label>
                    <NumberField
                      disabled={!allowedActions.editOperationalPlan}
                      label="Duration (minutes)"
                      max={1440}
                      min={15}
                      onChange={(durationMinutes) =>
                        updateSlot(setPlan, occurrence.id, slot.id, {
                          durationMinutes,
                        })
                      }
                      value={slot.durationMinutes}
                    />
                    <SelectField
                      disabled={!allowedActions.editOperationalPlan}
                      label="Location type"
                      onChange={(locationKind) =>
                        updateSlot(setPlan, occurrence.id, slot.id, {
                          locationKind,
                          locationName:
                            locationKind === 'primary_venue' ? venueName : '',
                          offSiteApproved: locationKind === 'off_site',
                          ...(locationKind === 'primary_venue'
                            ? { resourceId: theater.primary_venue_id }
                            : { resourceId: undefined }),
                        })
                      }
                      options={['primary_venue', 'off_site']}
                      value={slot.locationKind}
                    />
                    <label className="grid gap-2 text-sm font-bold">
                      Location
                      <input
                        className="rounded-md border border-[var(--line)] bg-white px-3 py-2"
                        disabled={
                          !allowedActions.editOperationalPlan ||
                          slot.locationKind === 'primary_venue'
                        }
                        onChange={(change) =>
                          updateSlot(setPlan, occurrence.id, slot.id, {
                            locationName: change.target.value,
                          })
                        }
                        value={slot.locationName}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2">
                      <input
                        checked={
                          occurrence.confirmedCandidateSlotId === slot.id
                        }
                        disabled={!allowedActions.editOperationalPlan}
                        name={`confirmed-${occurrence.id}`}
                        onChange={() =>
                          updateOccurrence(setPlan, occurrence.id, {
                            confirmedCandidateSlotId:
                              occurrence.confirmedCandidateSlotId === slot.id
                                ? null
                                : slot.id,
                          })
                        }
                        type="checkbox"
                      />
                      Confirm this Slot
                    </label>
                    {allowedActions.editOperationalPlan ? (
                      <SmallButton
                        onClick={() =>
                          setPlan((current) => ({
                            ...current,
                            occurrences: current.occurrences.map((item) =>
                              item.id === occurrence.id
                                ? {
                                    ...item,
                                    candidateSlots: item.candidateSlots.filter(
                                      ({ id }) => id !== slot.id,
                                    ),
                                    confirmedCandidateSlotId:
                                      item.confirmedCandidateSlotId === slot.id
                                        ? null
                                        : item.confirmedCandidateSlotId,
                                  }
                                : item,
                            ),
                          }))
                        }
                      >
                        Remove Candidate Slot
                      </SmallButton>
                    ) : null}
                  </fieldset>
                ))}
              </div>
              {allowedActions.editOperationalPlan ? (
                <button
                  className="mt-4 text-sm font-extrabold text-[var(--coral-deep)]"
                  onClick={() =>
                    setPlan((current) => ({
                      ...current,
                      occurrences: current.occurrences.map((item) =>
                        item.id === occurrence.id
                          ? {
                              ...item,
                              candidateSlots: [
                                ...item.candidateSlots,
                                newCandidateSlot(
                                  item.candidateSlots.length,
                                  theater,
                                ),
                              ],
                            }
                          : item,
                      ),
                    }))
                  }
                  type="button"
                >
                  Add Candidate Slot
                </button>
              ) : null}
            </article>
          ))}
        </div>
        {allowedActions.editOperationalPlan ? (
          <button
            className="mt-5 rounded-md border border-[var(--line)] bg-white px-4 py-2 font-extrabold"
            onClick={() =>
              setPlan((current) => ({
                ...current,
                occurrences: [
                  ...current.occurrences,
                  {
                    candidateSlots: [],
                    confirmedCandidateSlotId: null,
                    id: crypto.randomUUID(),
                    position: current.occurrences.length,
                    type: 'rehearsal' as const,
                    visibility: 'internal' as const,
                  },
                ],
              }))
            }
            type="button"
          >
            Add Occurrence
          </button>
        ) : null}

        {view === 'operational' ? (
          <h3 className="mt-8 text-xl font-extrabold">Requested resources</h3>
        ) : null}
        <div className="mt-4 grid gap-3">
          {plan.resourceRequests.map((request, requestIndex) => (
            <div
              className="grid gap-3 rounded-md border border-[var(--line)] px-4 py-4 sm:grid-cols-[10rem_1fr_7rem_auto]"
              key={request.id}
            >
              <SelectField
                disabled={!allowedActions.editOperationalPlan}
                label={`Resource ${requestIndex + 1} type`}
                onChange={(type) =>
                  updateResource(setPlan, request.id, { type })
                }
                options={['staff', 'equipment', 'other']}
                value={request.type}
              />
              <label className="grid gap-2 text-sm font-bold">
                Requested resource
                <input
                  className="rounded-md border border-[var(--line)] bg-white px-3 py-2"
                  disabled={!allowedActions.editOperationalPlan}
                  onChange={(change) =>
                    updateResource(setPlan, request.id, {
                      label: change.target.value,
                    })
                  }
                  value={request.label}
                />
              </label>
              <NumberField
                disabled={!allowedActions.editOperationalPlan}
                label="Quantity"
                onChange={(quantity) =>
                  updateResource(setPlan, request.id, { quantity })
                }
                value={request.quantity}
              />
              {allowedActions.editOperationalPlan ? (
                <SmallButton
                  onClick={() =>
                    setPlan((current) => ({
                      ...current,
                      resourceRequests: current.resourceRequests.filter(
                        ({ id }) => id !== request.id,
                      ),
                    }))
                  }
                >
                  Remove
                </SmallButton>
              ) : null}
            </div>
          ))}
        </div>
        {allowedActions.editOperationalPlan ? (
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              className="rounded-md border border-[var(--line)] bg-white px-4 py-2 font-extrabold"
              onClick={() =>
                setPlan((current) => ({
                  ...current,
                  resourceRequests: [
                    ...current.resourceRequests,
                    {
                      id: crypto.randomUUID(),
                      label: '',
                      position: current.resourceRequests.length,
                      quantity: 1,
                      type: 'staff' as const,
                    },
                  ],
                }))
              }
              type="button"
            >
              Add requested resource
            </button>
            <button
              className="rounded-md bg-[var(--coral)] px-5 py-3 font-extrabold text-white disabled:opacity-60"
              disabled={isSaving}
              onClick={async () => {
                setSaveError(null)
                setSaved(false)
                setIsSaving(true)

                try {
                  const result = await saveEventOperationalPlanFn({
                    data: normalizePlan(event.id, plan),
                  })

                  if (!result.ok) {
                    setSaveError(result.error.message)
                    return
                  }

                  setPlan((current) => normalizePositions(current))
                  setSaved(true)
                } catch (error) {
                  setSaveError(
                    error instanceof Error
                      ? error.message
                      : 'Operational plan could not be saved.',
                  )
                } finally {
                  setIsSaving(false)
                }
              }}
              type="button"
            >
              {isSaving ? 'Saving…' : 'Save operational plan'}
            </button>
            {saved ? (
              <p className="font-bold text-emerald-800">Plan saved.</p>
            ) : null}
            {saveError ? (
              <p className="font-bold text-red-700">{saveError}</p>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  )
}

type OperationalPlan = Parameters<typeof normalizePositions>[0]

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

function SelectField<T extends string>({
  disabled,
  label,
  onChange,
  options,
  value,
}: {
  disabled: boolean
  label: string
  onChange: (value: T) => void
  options: T[]
  value: T
}) {
  return (
    <label className="grid gap-2 text-sm font-bold">
      {label}
      <select
        className="rounded-md border border-[var(--line)] bg-white px-3 py-2"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as T)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replace('_', ' ')}
          </option>
        ))}
      </select>
    </label>
  )
}

function SmallButton({
  children,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      className="self-end rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-extrabold disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
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
    state: 'pending' | 'accepted' | 'declined' | 'expired'
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

function newCandidateSlot(
  position: number,
  theater: {
    primary_venue_id: string
    primary_venue_name: string | null
    timezone: string | null
    timezone_source: 'unknown' | 'inferred' | 'manual'
  },
) {
  return {
    durationMinutes: 120,
    id: crypto.randomUUID(),
    localStartsAt: '',
    locationKind: 'primary_venue' as const,
    locationName: theater.primary_venue_name ?? 'Primary Venue',
    offSiteApproved: false,
    position,
    resourceId: theater.primary_venue_id,
    timezoneName: theater.timezone ?? 'UTC',
    timezoneSource: theater.timezone_source,
  }
}

function moveItem<T>(items: T[], from: number, to: number) {
  const next = [...items]
  const [item] = next.splice(from, 1)

  if (item !== undefined) next.splice(to, 0, item)
  return next
}

function updateOccurrence(
  setPlan: React.Dispatch<React.SetStateAction<OperationalPlan>>,
  occurrenceId: string,
  update: Partial<OperationalPlan['occurrences'][number]>,
) {
  setPlan((current) => ({
    ...current,
    occurrences: current.occurrences.map((occurrence) =>
      occurrence.id === occurrenceId
        ? { ...occurrence, ...update }
        : occurrence,
    ),
  }))
}

function updateSlot(
  setPlan: React.Dispatch<React.SetStateAction<OperationalPlan>>,
  occurrenceId: string,
  slotId: string,
  update: Partial<
    OperationalPlan['occurrences'][number]['candidateSlots'][number]
  >,
) {
  setPlan((current) => ({
    ...current,
    occurrences: current.occurrences.map((occurrence) =>
      occurrence.id === occurrenceId
        ? {
            ...occurrence,
            candidateSlots: occurrence.candidateSlots.map((slot) =>
              slot.id === slotId ? { ...slot, ...update } : slot,
            ),
          }
        : occurrence,
    ),
  }))
}

function updateResource(
  setPlan: React.Dispatch<React.SetStateAction<OperationalPlan>>,
  requestId: string,
  update: Partial<OperationalPlan['resourceRequests'][number]>,
) {
  setPlan((current) => ({
    ...current,
    resourceRequests: current.resourceRequests.map((request) =>
      request.id === requestId ? { ...request, ...update } : request,
    ),
  }))
}

function normalizePositions(plan: {
  minimumViableCast: number
  occurrences: Array<{
    candidateSlots: Array<{
      durationMinutes: number
      id: string
      localStartsAt: string
      locationKind: 'primary_venue' | 'off_site'
      locationName: string
      offSiteApproved: boolean
      position: number
      resourceId?: string
      timezoneName: string
      timezoneSource: 'unknown' | 'inferred' | 'manual'
    }>
    confirmedCandidateSlotId: string | null
    id: string
    position: number
    type: 'rehearsal' | 'performance'
    visibility: 'public' | 'internal'
  }>
  resourceRequests: Array<{
    id: string
    label: string
    position: number
    quantity: number
    type: 'staff' | 'equipment' | 'other'
  }>
  targetCastSize: number
}) {
  return {
    ...plan,
    occurrences: plan.occurrences.map((occurrence, position) => ({
      ...occurrence,
      candidateSlots: occurrence.candidateSlots.map((slot, slotPosition) => ({
        ...slot,
        position: slotPosition,
      })),
      position,
    })),
    resourceRequests: plan.resourceRequests.map((request, position) => ({
      ...request,
      position,
    })),
  }
}

function normalizePlan(eventId: string, plan: OperationalPlan) {
  return { eventId, ...normalizePositions(plan) }
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
