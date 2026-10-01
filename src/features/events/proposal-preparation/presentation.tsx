import { NativeSelect } from '@/components/ui/native-select'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
  function ProposedCastSection() {
    const preparation = usePreparation()
    const { state } = preparation
    const castDirty = !setsEqual(
      state.draftProposedCastUserIds,
      state.recordedProposedCastUserIds,
    )
    const castFrozen = isPartitionFrozen(state.phase, 'proposedCast')

    return (
      <div className="mt-7">
        <h3 className="text-xl font-semibold">Proposed Cast</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Select accepted Cast Members deliberately for the Event's next
          Proposal Revision. This does not change Cast membership.
        </p>

        <fieldset className="mt-4 grid gap-2">
          <legend className="sr-only">Proposed Cast Members</legend>
          {state.model.acceptedCastMembers.map((castMember) => (
            <Label
              className="flex items-center gap-3 rounded-md border border-border bg-white px-4 py-3"
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
            </Label>
          ))}
          {state.model.acceptedCastMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No accepted Cast Members are available for selection. Pending and
              declined invitations do not block draft editing.
            </p>
          ) : null}
        </fieldset>

        {state.model.capabilities.selectProposedCast ? (
          <Button
            variant="outline"
            className="mt-4"
            disabled={
              !castDirty || castFrozen || isRemoteTransition(state.phase)
            }
            onClick={preparation.saveProposedCast}
            type="button"
          >
            {isPartitionBusy(state.phase, 'proposedCast')
              ? 'Saving…'
              : 'Save Proposed Cast'}
          </Button>
        ) : null}
        {state.castNotice ? (
          <p className="mt-2 font-semibold text-foreground">
            {state.castNotice}
          </p>
        ) : null}
        {state.castProblem ? (
          <p className="mt-3 font-medium text-foreground">
            {state.castProblem.message}
          </p>
        ) : null}
      </div>
    )
  }

  function RevisionSection() {
    const preparation = usePreparation()
    const { state } = preparation
    const plan = state.draftOperationalPlan
    const submitted = state.phase.kind === 'submitted' ? state.phase : null

    return (
      <Card className="mt-5  px-6 py-6 gap-0">
        <h2 className="text-2xl font-semibold">Proposal Revision</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Compare Candidate Slot evidence, save the preferred Confirmed Slots in
          the operational plan, then submit one immutable snapshot for review.
        </p>

        <div className="mt-7 grid gap-4">
          <h3 className="text-xl font-semibold">
            Candidate Slot recommendations
          </h3>
          {plan.occurrences.map((occurrence, occurrenceIndex) => (
            <article
              className="rounded-md border border-border bg-white px-4 py-4"
              key={occurrence.id}
            >
              <h4 className="font-semibold">
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
                      <Label
                        className="grid gap-2 rounded-md bg-muted/40 px-4 py-3"
                        key={recommendation.slotId}
                      >
                        <span className="flex items-center gap-3 font-medium">
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
                        <ul className="list-disc pl-5 text-sm text-muted-foreground">
                          {recommendation.evidence.map((evidence) => (
                            <li key={evidence.code}>{evidence.message}</li>
                          ))}
                        </ul>
                      </Label>
                    )
                  })}
              </div>
            </article>
          ))}
        </div>

        {state.phase.kind === 'stale' ? (
          <div className="mt-5 rounded-md border border-border bg-muted px-4 py-3 text-foreground">
            <p className="font-medium">
              Your save succeeded, but readiness could not be refreshed.
            </p>
            <p className="mt-1 text-sm">{state.phase.problem.message}</p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={preparation.retryRefresh}
              type="button"
            >
              Retry refresh
            </Button>
          </div>
        ) : null}
        {state.submissionBlockers.length > 0 ? (
          <div className="mt-5 rounded-md border border-border bg-muted px-4 py-3">
            <p className="font-medium text-foreground">Submission blockers</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-foreground">
              {state.submissionBlockers.map((blocker, index) => (
                <li key={`${blocker.code}-${index}`}>{blocker.message}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {state.submissionProblem ? (
          <p className="mt-3 font-medium text-foreground">
            {state.submissionProblem.message}
          </p>
        ) : null}
        {submitted ? (
          <p className="mt-3 font-medium text-foreground">
            Proposal Revision {submitted.revisionNumber} submitted for review.
          </p>
        ) : null}
        {state.model.capabilities.submitProposalRevision && !submitted ? (
          <Button
            className="mt-5"
            disabled={!canSubmit(state)}
            onClick={preparation.submitProposalRevision}
            type="button"
          >
            {state.phase.kind === 'submitting'
              ? 'Submitting…'
              : 'Submit Proposal Revision'}
          </Button>
        ) : null}
      </Card>
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
      <Card className="mt-5  px-6 py-6 gap-0" id="schedule-plan">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Schedule &amp; Plan</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Plan Occurrences, Candidate Slots, confirmed choices, visibility,
              resources, and viability. Candidate Slots use{' '}
              {state.model.theater.timezoneName} and preserve the exact instant
              plus its local-time provenance.
            </p>
          </div>
          {!editable ? (
            <p className="rounded-md bg-muted px-3 py-2 text-sm font-semibold text-foreground">
              You can inspect this Event plan, but only an eligible Producer can
              edit it.
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
              className="rounded-lg border border-border bg-white px-5 py-5"
              key={occurrence.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-semibold">
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
                    className="grid gap-4 rounded-md bg-muted/40 px-4 py-4 sm:grid-cols-2"
                    key={slot.id}
                  >
                    <legend className="px-1 text-sm font-semibold">
                      Candidate Slot {slotIndex + 1}
                    </legend>
                    <Label className="grid gap-2 text-sm font-medium">
                      Local date and time
                      <Input
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
                    </Label>
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
                    <Label className="grid gap-2 text-sm font-medium">
                      Location
                      <Input
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
                    </Label>
                    <Label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
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
                    </Label>
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
                <Button
                  className="mt-4"
                  disabled={disabled}
                  onClick={() => preparation.addCandidateSlot(occurrence.id)}
                  type="button"
                >
                  Add Candidate Slot
                </Button>
              ) : null}
            </article>
          ))}
        </div>
        {editable ? (
          <Button
            variant="outline"
            className="mt-5"
            disabled={disabled}
            onClick={preparation.addOccurrence}
            type="button"
          >
            Add Occurrence
          </Button>
        ) : null}

        {state.model.capabilities.viewResourceRequests ? (
          <>
            <h3 className="mt-8 text-xl font-semibold">
              Requested staffing needs and resources
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Staffing quantities describe coverage needed. Named Event staff
              assignments and their accepted coverage appear in{' '}
              {plan.resourceRequests.some(
                (request) => request.type === 'staff',
              ) ? (
                <a
                  className="font-medium text-foreground underline"
                  href="#event-staff-assignment"
                >
                  Cast &amp; Team
                </a>
              ) : (
                'Cast & Team'
              )}
              ; equipment and other resources remain separate requests.
            </p>
            <div className="mt-4 grid gap-3">
              {plan.resourceRequests.map((request, requestIndex) => (
                <div
                  className="grid gap-3 rounded-md border border-border px-4 py-4 sm:grid-cols-[10rem_1fr_7rem_auto]"
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
                  <Label className="grid gap-2 text-sm font-medium">
                    Requested resource
                    <Input
                      disabled={disabled}
                      onChange={(change) =>
                        preparation.updateResourceRequest(request.id, {
                          label: change.target.value,
                        })
                      }
                      value={request.label}
                    />
                  </Label>
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
                <Button
                  variant="outline"

                  disabled={disabled}
                  onClick={preparation.addResourceRequest}
                  type="button"
                >
                  Add requested resource
                </Button>
                <Button
                  disabled={
                    disabled || !dirty || isRemoteTransition(state.phase)
                  }
                  onClick={preparation.saveOperationalPlan}
                  type="button"
                >
                  {isPartitionBusy(state.phase, 'operationalPlan')
                    ? 'Saving…'
                    : 'Save operational plan'}
                </Button>
                {state.planNotice ? (
                  <p className="font-medium text-foreground">
                    {state.planNotice}
                  </p>
                ) : null}
                {state.planProblem ? (
                  <p className="font-medium text-foreground">
                    {state.planProblem.message}
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </Card>
    )
  }

  return { PlanSection, ProposedCastSection, RevisionSection }
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
    <Label className="grid gap-2 text-sm font-medium">
      {label}
      <NativeSelect
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as T)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replace('_', ' ')}
          </option>
        ))}
      </NativeSelect>
    </Label>
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
    <Button
      variant="outline"

      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </Button>
  )
}
