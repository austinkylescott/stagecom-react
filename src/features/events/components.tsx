import { useState } from 'react'

import {
  createManagedEventFn,
  inviteEventCastMemberFn,
  respondToEventCastInvitationFn,
  saveEventOperationalPlanFn,
} from './server-functions'

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
  theater,
  view,
}: {
  activeMembers: Array<{ displayName: string; userId: string }>
  actorUserId: string
  allowedActions: {
    editOperationalPlan: boolean
    inviteCast: boolean
    respondToInvitation: boolean
  }
  event: {
    id: string
    lifecycle_status: EventLifecycle
    minimum_viable_cast: number | null
    operational_health: EventHealth
    publication_status: EventPublication
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
      show_candidate_slots: Array<{
        duration_minutes: number
        id: string
        local_starts_at: string
        location_kind: 'primary_venue' | 'off_site'
        location_name: string
        off_site_approved: boolean
        position: number
        resource_id: string | null
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
    target_cast_size: number | null
    title: string
  }
  theater: {
    primary_venue_id: string
    primary_venue_name: string | null
    timezone: string | null
    timezone_source: 'unknown' | 'inferred' | 'manual'
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
  const timezoneName = theater.timezone ?? 'UTC'
  const venueName = theater.primary_venue_name ?? 'Primary Venue'
  const ownInvitation = cast.find(
    (castMember) => castMember.user_id === actorUserId,
  )

  return (
    <main className="page-wrap py-8 sm:py-12">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
        Event workspace
      </p>
      <h1 className="display-title mt-3 text-4xl font-bold text-[var(--sea-ink)]">
        {event.title}
      </h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StateCard label="Lifecycle" value={event.lifecycle_status} />
        <StateCard label="Publication" value={event.publication_status} />
        <StateCard
          label="Operational health"
          value={event.operational_health}
        />
      </div>
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
              Only an eligible Producer can edit a draft plan.
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
