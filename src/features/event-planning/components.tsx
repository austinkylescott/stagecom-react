import { useEffect, useRef, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
import { getPlanningFn, managePlanningFn } from './server-functions'
import type { Planning, PlanningOperation } from './schemas'

type Occurrence = {
  id: string
  occurrence_type: string
  show_candidate_slots: Array<{
    id: string
    starts_at: string
    location_name: string
  }>
}
export function EventPlanning({
  eventId,
  occurrences,
  timezone,
}: {
  eventId: string
  occurrences: Occurrence[]
  timezone: string
}) {
  const router = useRouter()
  const [data, setData] = useState<Planning | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [occurrenceId, setOccurrenceId] = useState(occurrences[0]?.id ?? '')
  const [slotId, setSlotId] = useState('')
  const [callDrafts, setCallDrafts] = useState<
    Partial<Record<string, 'required' | 'optional' | 'not_called'>>
  >({})
  const pending = useRef<{ signature: string; id: string } | null>(null)
  async function refresh() {
    try {
      const result = await getPlanningFn({ data: { eventId } })
      if (!result.ok) {
        setError(result.error.message)
        setData(null)
        return
      }
      setData(result.data)
      setError(null)
    } catch {
      setError('Planning could not be loaded. Retry when connected.')
    }
  }
  useEffect(() => {
    void refresh()
  }, [eventId])
  async function act(operation: PlanningOperation) {
    const signature = JSON.stringify(operation)
    if (pending.current?.signature !== signature)
      pending.current = { signature, id: crypto.randomUUID() }
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const result = await managePlanningFn({
        data: { eventId, operation, commandId: pending.current.id },
      })
      if (!result.ok) {
        const details = Array.isArray(result.error.details)
          ? result.error.details
          : []
        const messages = details.flatMap((item) =>
          typeof item === 'object' &&
          item !== null &&
          'message' in item &&
          typeof item.message === 'string'
            ? [item.message]
            : [],
        )
        setError([result.error.message, ...messages].join(' '))
        return
      }
      pending.current = null
      await refresh()
      await router.invalidate({ sync: true })
      setNotice(
        operation.action === 'submit'
          ? 'Exact Proposal Revision submitted for Review. Publication is unchanged.'
          : 'Planning saved. Current commitments change only on approval.',
      )
    } catch {
      setError(
        'Planning could not be saved. Your input is preserved; retry when connected.',
      )
    } finally {
      setBusy(false)
    }
  }
  const occurrence = occurrences.find((item) => item.id === occurrenceId)
  const current = data?.targets.find(
    (item) =>
      item.occurrenceId === occurrenceId &&
      ['planning', 'submitted'].includes(item.state),
  )
  return (
    <Card
      className="mt-5 min-w-0 gap-4 p-6"
      role="region"
      aria-label="Planning and confirmations"
      id="planning-confirmations"
    >
      <h2 className="text-2xl font-semibold">Planning and confirmations</h2>
      <p className="text-sm text-muted-foreground">
        Producer selects a target; Director manages Calls. Availability is
        separate from explicit selected-time confirmation. Selecting creates no
        booking and changes no current Calls. A move retains its old commitment
        until approval.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      <Button
        disabled={busy}
        variant="outline"
        className="w-fit"
        onClick={() => void refresh()}
      >
        Refresh planning; keep input
      </Button>
      {!data && !error ? <p role="status">Loading planning…</p> : null}
      {data?.canSelect ? (
        <form
          className="grid gap-3 rounded-md border p-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!slotId) {
              setError('Choose a planning target.')
              return
            }
            void act({
              action: 'select',
              input: {
                occurrenceId,
                slotId,
                expectedVersion: current?.version ?? 0,
              },
            })
          }}
        >
          <label>
            Planning Occurrence
            <NativeSelect
              disabled={busy}
              aria-label="Planning Occurrence"
              value={occurrenceId}
              onChange={(event) => {
                setOccurrenceId(event.target.value)
                setSlotId('')
              }}
            >
              {occurrences.map((item, index) => (
                <option key={item.id} value={item.id}>
                  Occurrence {index + 1} · {item.occurrence_type}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label>
            Planning target
            <NativeSelect
              disabled={busy}
              aria-label="Planning target"
              value={slotId}
              onChange={(event) => setSlotId(event.target.value)}
            >
              <option value="">Choose a Candidate Slot</option>
              {occurrence?.show_candidate_slots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {formatTime(slot.starts_at, timezone)} · {slot.location_name}
                </option>
              ))}
            </NativeSelect>
          </label>
          <Button
            disabled={busy || current?.state === 'submitted'}
            type="submit"
            className="w-fit"
          >
            Select planning target
          </Button>
        </form>
      ) : null}
      {data?.targets.length === 0 ? (
        <p>No selected planning targets yet.</p>
      ) : null}
      {data?.targets.map((target) => {
        const active =
          target.state === 'planning' || target.state === 'submitted'
        const input = { targetId: target.id, expectedVersion: target.version }
        return (
          <section
            key={target.id}
            aria-label={`${target.state} planning target`}
            className="grid gap-3 rounded-md border p-4"
          >
            <h3 className="font-semibold">
              {target.replacement ? 'Replacement target' : 'Selected target'} ·{' '}
              {target.state.replace('_', ' ')}
            </h3>
            <p>
              {formatTime(target.slot.startsAt, timezone)} ·{' '}
              {target.slot.durationMinutes} minutes · {target.slot.locationName}
            </p>
            {target.replacement && active ? (
              <p>The original approval, booking and Calls remain current.</p>
            ) : null}
            {target.holdUntil ? (
              <p>
                {Date.parse(target.holdUntil) > Date.now() && active
                  ? 'Exclusive hold until'
                  : 'Hold expired or released; Review rechecks conflicts.'}{' '}
                {formatTime(target.holdUntil, timezone)}
              </p>
            ) : (
              <p>
                No exclusive hold. Availability and target selection do not
                reserve the venue.
              </p>
            )}
            {target.blockers.length && active ? (
              <div>
                <h4 className="font-medium">Approval blockers</h4>
                <ul className="list-disc pl-5 text-sm">
                  {target.blockers.map((blocker, index) => (
                    <li key={`${blocker.code}-${index}`}>
                      {blocker.message}
                      {blocker.members
                        ? ` Missing: ${blocker.members.map((member) => member.displayName).join(', ')}.`
                        : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {target.calls.map((call) => (
              <div key={call.userId} className="grid gap-2 border-t pt-3">
                <p>
                  {call.displayName} · {call.call.replace('_', ' ')} ·{' '}
                  {call.confirmed
                    ? 'Selected time confirmed'
                    : 'Selected time not confirmed'}
                  {!call.eligible ? ' · Ineligible' : ''}
                </p>
                {call.own &&
                call.eligible &&
                call.call !== 'not_called' &&
                (active || target.currentCommitment) ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void act({
                          action: 'confirm',
                          input: {
                            ...input,
                            callVersion: call.version,
                            confirmationVersion: call.confirmationVersion,
                            confirmed: true,
                          },
                        })
                      }
                    >
                      Confirm selected time
                    </Button>
                    <Button
                      disabled={busy}
                      variant="outline"
                      onClick={() =>
                        void act({
                          action: 'confirm',
                          input: {
                            ...input,
                            callVersion: call.version,
                            confirmationVersion: call.confirmationVersion,
                            confirmed: false,
                          },
                        })
                      }
                    >
                      Cannot confirm selected time
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
            {data.canCall && target.state === 'planning' ? (
              <fieldset disabled={busy} className="grid gap-3">
                <legend className="font-medium">Director planning Calls</legend>
                {data.participants.map((participant) => {
                  const call = target.calls.find(
                    (item) => item.userId === participant.userId,
                  )
                  const key = `${target.id}:${participant.userId}`
                  return (
                    <div
                      key={key}
                      className="grid gap-2 sm:grid-cols-[1fr_auto]"
                    >
                      <label>
                        Planning Call for {participant.displayName}
                        <NativeSelect
                          aria-label={`Planning Call for ${participant.displayName}`}
                          value={callDrafts[key] ?? call?.call ?? 'not_called'}
                          onChange={(event) => {
                            const value = event.target.value
                            if (
                              value === 'required' ||
                              value === 'optional' ||
                              value === 'not_called'
                            )
                              setCallDrafts({ ...callDrafts, [key]: value })
                          }}
                        >
                          <option value="required">Required</option>
                          <option value="optional">Optional</option>
                          <option value="not_called">Not called</option>
                        </NativeSelect>
                      </label>
                      <Button
                        variant="outline"
                        onClick={() =>
                          void act({
                            action: 'call',
                            input: {
                              ...input,
                              userId: participant.userId,
                              call:
                                callDrafts[key] ?? call?.call ?? 'not_called',
                              callVersion: call?.version ?? 0,
                            },
                          })
                        }
                      >
                        Save Call for {participant.displayName}
                      </Button>
                    </div>
                  )
                })}
              </fieldset>
            ) : null}
            {active ? (
              <div className="flex flex-wrap gap-2">
                {data.canHold &&
                target.slot.locationKind === 'primary_venue' ? (
                  <Button
                    disabled={busy}
                    variant="outline"
                    onClick={() => void act({ action: 'hold', input })}
                  >
                    Grant planning hold
                  </Button>
                ) : null}
                {data.canSelect ? (
                  <>
                    <Button
                      disabled={busy}
                      variant="outline"
                      onClick={() => void act({ action: 'withdraw', input })}
                    >
                      Withdraw planning target
                    </Button>
                    {target.state === 'planning' ? (
                      <Button
                        disabled={busy}
                        onClick={() => void act({ action: 'submit', input })}
                      >
                        Submit selected plan
                      </Button>
                    ) : (
                      <a className="text-sm underline" href="#review">
                        Review exact Proposal Revision
                      </a>
                    )}
                  </>
                ) : null}
              </div>
            ) : null}
          </section>
        )
      })}
      {notice ? <p role="status">{notice}</p> : null}
    </Card>
  )
}
function formatTime(time: string, timezone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(time))
}
