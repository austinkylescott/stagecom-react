import {
  canSubmit,
  isPartitionBusy,
  isPartitionFrozen,
  isRemoteTransition,
  plansEqual,
  setsEqual,
} from './state'

import type { ReactNode } from 'react'
import type { PreparationContextValue } from './module'

export function createProposalPreparationSections(
  usePreparation: () => PreparationContextValue,
) {
  function RevisionSection() {
    const preparation = usePreparation()
    const { state } = preparation
    const plan = state.draftOperationalPlan
    const castDirty = !setsEqual(
      state.draftProposedCastUserIds,
      state.recordedProposedCastUserIds,
    )
    const castFrozen = isPartitionFrozen(state.phase, 'proposedCast')
    const submitted = state.phase.kind === 'submitted' ? state.phase : null

    return (
      <section className="island-shell mt-5 rounded-lg px-6 py-6">
        <h2 className="text-2xl font-extrabold">Proposal Revision</h2>
        <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
          Select accepted Cast Members deliberately, compare the evidence, save
          the preferred Confirmed Slots in the operational plan, then submit one
          immutable snapshot for review.
        </p>

        <fieldset className="mt-5 grid gap-2">
          <legend className="font-extrabold">Proposed Cast</legend>
          {state.model.acceptedCastMembers.map((castMember) => (
            <label
              className="flex items-center gap-3 rounded-md border border-[var(--line)] bg-white px-4 py-3"
              key={castMember.userId}
            >
              <input
                checked={state.draftProposedCastUserIds.includes(
                  castMember.userId,
                )}
                disabled={
                  !state.model.capabilities.selectProposedCast || castFrozen
                }
                onChange={(change) =>
                  preparation.setProposedCastMember(
                    castMember.userId,
                    change.target.checked,
                  )
                }
                type="checkbox"
              />
              {castMember.displayName}
            </label>
          ))}
          {state.model.acceptedCastMembers.length === 0 ? (
            <p className="text-sm text-[var(--sea-ink-soft)]">
              No accepted Cast Members are available for selection. Pending and
              declined invitations do not block draft editing.
            </p>
          ) : null}
        </fieldset>

        {state.model.capabilities.selectProposedCast ? (
          <button
            className="mt-4 rounded-md border border-[var(--line)] bg-white px-4 py-2 font-extrabold disabled:opacity-60"
            disabled={
              !castDirty || castFrozen || isRemoteTransition(state.phase)
            }
            onClick={preparation.saveProposedCast}
            type="button"
          >
            {isPartitionBusy(state.phase, 'proposedCast')
              ? 'Saving…'
              : 'Save Proposed Cast'}
          </button>
        ) : null}
        {state.castNotice ? (
          <p className="mt-2 font-semibold text-emerald-800">
            {state.castNotice}
          </p>
        ) : null}
        {state.castProblem ? (
          <p className="mt-3 font-bold text-red-700">
            {state.castProblem.message}
          </p>
        ) : null}

        <div className="mt-7 grid gap-4">
          <h3 className="text-xl font-extrabold">
            Candidate Slot recommendations
          </h3>
          {plan.occurrences.map((occurrence, occurrenceIndex) => (
            <article
              className="rounded-md border border-[var(--line)] bg-white px-4 py-4"
              key={occurrence.id}
            >
              <h4 className="font-extrabold">
                Occurrence {occurrenceIndex + 1} ·{' '}
                <span className="capitalize">{occurrence.type}</span>
              </h4>
              <div className="mt-3 grid gap-3">
                {state.model.recommendations
                  .filter(
                    (recommendation) =>
                      recommendation.occurrenceId === occurrence.id,
                  )
                  .map((recommendation) => {
                    const slot = occurrence.candidateSlots.find(
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
                              occurrence.confirmedCandidateSlotId ===
                              recommendation.slotId
                            }
                            disabled={
                              !state.model.capabilities.editOperationalPlan ||
                              isPartitionFrozen(state.phase, 'operationalPlan')
                            }
                            name={`recommended-${occurrence.id}`}
                            onChange={() =>
                              preparation.updateOccurrence(occurrence.id, {
                                confirmedCandidateSlotId: recommendation.slotId,
                              })
                            }
                            type="radio"
                          />
                          Rank {recommendation.rank}: {slot.locationName} ·{' '}
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

        {state.phase.kind === 'stale' ? (
          <div className="mt-5 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950">
            <p className="font-bold">
              Your save succeeded, but readiness could not be refreshed.
            </p>
            <p className="mt-1 text-sm">{state.phase.problem.message}</p>
            <button
              className="mt-3 rounded-md border border-amber-400 bg-white px-3 py-2 text-sm font-extrabold"
              onClick={preparation.retryRefresh}
              type="button"
            >
              Retry refresh
            </button>
          </div>
        ) : null}
        {state.submissionBlockers.length > 0 ? (
          <div className="mt-5 rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
            <p className="font-bold text-amber-950">Submission blockers</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-amber-950">
              {state.submissionBlockers.map((blocker, index) => (
                <li key={`${blocker.code}-${index}`}>{blocker.message}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {state.submissionProblem ? (
          <p className="mt-3 font-bold text-red-700">
            {state.submissionProblem.message}
          </p>
        ) : null}
        {submitted ? (
          <p className="mt-3 font-bold text-emerald-800">
            Proposal Revision {submitted.revisionNumber} submitted for review.
          </p>
        ) : null}
        {state.model.capabilities.submitProposalRevision && !submitted ? (
          <button
            className="mt-5 rounded-md bg-[var(--sea-ink)] px-5 py-3 font-extrabold text-white disabled:opacity-60"
            disabled={!canSubmit(state)}
            onClick={preparation.submitProposalRevision}
            type="button"
          >
            {state.phase.kind === 'submitting'
              ? 'Submitting…'
              : 'Submit Proposal Revision'}
          </button>
        ) : null}
      </section>
    )
  }

  function PlanSection() {
    const preparation = usePreparation()
    const { state } = preparation
    const plan = state.draftOperationalPlan
    const editable = state.model.capabilities.editOperationalPlan
    const frozen = isPartitionFrozen(state.phase, 'operationalPlan')
    const disabled = !editable || frozen
    const dirty = !plansEqual(plan, state.recordedOperationalPlan)

    return (
      <section className="island-shell mt-5 rounded-lg px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold">Operational plan</h2>
            <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
              Candidate Slots use {state.model.theater.timezoneName} and
              preserve the exact instant plus its local-time provenance.
            </p>
          </div>
          {!editable ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950">
              Only an eligible Producer can edit a draft or approved plan.
            </p>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <NumberField
            disabled={disabled}
            label="Target cast size"
            onChange={(targetCastSize) =>
              preparation.setOperationalPlan((current) => ({
                ...current,
                targetCastSize,
              }))
            }
            value={plan.targetCastSize}
          />
          <NumberField
            disabled={disabled}
            label="Minimum Viable Cast"
            onChange={(minimumViableCast) =>
              preparation.setOperationalPlan((current) => ({
                ...current,
                minimumViableCast,
              }))
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
                {editable ? (
                  <div className="flex flex-wrap gap-2">
                    <SmallButton
                      disabled={disabled || occurrenceIndex === 0}
                      onClick={() =>
                        preparation.moveOccurrence(
                          occurrenceIndex,
                          occurrenceIndex - 1,
                        )
                      }
                    >
                      Move up
                    </SmallButton>
                    <SmallButton
                      disabled={
                        disabled ||
                        occurrenceIndex === plan.occurrences.length - 1
                      }
                      onClick={() =>
                        preparation.moveOccurrence(
                          occurrenceIndex,
                          occurrenceIndex + 1,
                        )
                      }
                    >
                      Move down
                    </SmallButton>
                    <SmallButton
                      disabled={disabled}
                      onClick={() =>
                        preparation.removeOccurrence(occurrence.id)
                      }
                    >
                      Remove
                    </SmallButton>
                  </div>
                ) : null}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <SelectField
                  disabled={disabled}
                  label={`Occurrence ${occurrenceIndex + 1} type`}
                  onChange={(type) =>
                    preparation.updateOccurrence(occurrence.id, { type })
                  }
                  options={['rehearsal', 'performance']}
                  value={occurrence.type}
                />
                <SelectField
                  disabled={disabled}
                  label={`Occurrence ${occurrenceIndex + 1} visibility`}
                  onChange={(visibility) =>
                    preparation.updateOccurrence(occurrence.id, { visibility })
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
                        disabled={disabled}
                        onChange={(change) =>
                          preparation.updateCandidateSlot(
                            occurrence.id,
                            slot.id,
                            { localStartsAt: change.target.value },
                          )
                        }
                        type="datetime-local"
                        value={slot.localStartsAt}
                      />
                    </label>
                    <NumberField
                      disabled={disabled}
                      label="Duration (minutes)"
                      max={1440}
                      min={15}
                      onChange={(durationMinutes) =>
                        preparation.updateCandidateSlot(
                          occurrence.id,
                          slot.id,
                          { durationMinutes },
                        )
                      }
                      value={slot.durationMinutes}
                    />
                    <SelectField
                      disabled={disabled}
                      label="Location type"
                      onChange={(locationKind) =>
                        preparation.updateCandidateSlot(
                          occurrence.id,
                          slot.id,
                          {
                            locationKind,
                            locationName:
                              locationKind === 'primary_venue'
                                ? state.model.theater.primaryVenueName
                                : '',
                            offSiteApproved: locationKind === 'off_site',
                            ...(locationKind === 'primary_venue'
                              ? {
                                  resourceId:
                                    state.model.theater.primaryVenueId,
                                }
                              : { resourceId: undefined }),
                          },
                        )
                      }
                      options={['primary_venue', 'off_site']}
                      value={slot.locationKind}
                    />
                    <label className="grid gap-2 text-sm font-bold">
                      Location
                      <input
                        className="rounded-md border border-[var(--line)] bg-white px-3 py-2"
                        disabled={
                          disabled || slot.locationKind === 'primary_venue'
                        }
                        onChange={(change) =>
                          preparation.updateCandidateSlot(
                            occurrence.id,
                            slot.id,
                            { locationName: change.target.value },
                          )
                        }
                        value={slot.locationName}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2">
                      <input
                        checked={
                          occurrence.confirmedCandidateSlotId === slot.id
                        }
                        disabled={disabled}
                        name={`confirmed-${occurrence.id}`}
                        onChange={() =>
                          preparation.updateOccurrence(occurrence.id, {
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
                    {editable ? (
                      <SmallButton
                        disabled={disabled}
                        onClick={() =>
                          preparation.removeCandidateSlot(
                            occurrence.id,
                            slot.id,
                          )
                        }
                      >
                        Remove Candidate Slot
                      </SmallButton>
                    ) : null}
                  </fieldset>
                ))}
              </div>
              {editable ? (
                <button
                  className="mt-4 text-sm font-extrabold text-[var(--coral-deep)]"
                  disabled={disabled}
                  onClick={() => preparation.addCandidateSlot(occurrence.id)}
                  type="button"
                >
                  Add Candidate Slot
                </button>
              ) : null}
            </article>
          ))}
        </div>
        {editable ? (
          <button
            className="mt-5 rounded-md border border-[var(--line)] bg-white px-4 py-2 font-extrabold"
            disabled={disabled}
            onClick={preparation.addOccurrence}
            type="button"
          >
            Add Occurrence
          </button>
        ) : null}

        {state.model.capabilities.viewResourceRequests ? (
          <>
            <h3 className="mt-8 text-xl font-extrabold">Requested resources</h3>
            <div className="mt-4 grid gap-3">
              {plan.resourceRequests.map((request, requestIndex) => (
                <div
                  className="grid gap-3 rounded-md border border-[var(--line)] px-4 py-4 sm:grid-cols-[10rem_1fr_7rem_auto]"
                  key={request.id}
                >
                  <SelectField
                    disabled={disabled}
                    label={`Resource ${requestIndex + 1} type`}
                    onChange={(type) =>
                      preparation.updateResourceRequest(request.id, { type })
                    }
                    options={['staff', 'equipment', 'other']}
                    value={request.type}
                  />
                  <label className="grid gap-2 text-sm font-bold">
                    Requested resource
                    <input
                      className="rounded-md border border-[var(--line)] bg-white px-3 py-2"
                      disabled={disabled}
                      onChange={(change) =>
                        preparation.updateResourceRequest(request.id, {
                          label: change.target.value,
                        })
                      }
                      value={request.label}
                    />
                  </label>
                  <NumberField
                    disabled={disabled}
                    label="Quantity"
                    onChange={(quantity) =>
                      preparation.updateResourceRequest(request.id, {
                        quantity,
                      })
                    }
                    value={request.quantity}
                  />
                  {editable ? (
                    <SmallButton
                      disabled={disabled}
                      onClick={() =>
                        preparation.removeResourceRequest(request.id)
                      }
                    >
                      Remove
                    </SmallButton>
                  ) : null}
                </div>
              ))}
            </div>
            {editable ? (
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <button
                  className="rounded-md border border-[var(--line)] bg-white px-4 py-2 font-extrabold"
                  disabled={disabled}
                  onClick={preparation.addResourceRequest}
                  type="button"
                >
                  Add requested resource
                </button>
                <button
                  className="rounded-md bg-[var(--coral)] px-5 py-3 font-extrabold text-white disabled:opacity-60"
                  disabled={
                    disabled || !dirty || isRemoteTransition(state.phase)
                  }
                  onClick={preparation.saveOperationalPlan}
                  type="button"
                >
                  {isPartitionBusy(state.phase, 'operationalPlan')
                    ? 'Saving…'
                    : 'Save operational plan'}
                </button>
                {state.planNotice ? (
                  <p className="font-bold text-emerald-800">
                    {state.planNotice}
                  </p>
                ) : null}
                {state.planProblem ? (
                  <p className="font-bold text-red-700">
                    {state.planProblem.message}
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    )
  }

  return { PlanSection, RevisionSection }
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
        className="rounded-md border border-[var(--line)] bg-white px-3 py-2 capitalize"
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
  children: ReactNode
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-bold disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}
