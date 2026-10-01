import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
import {
  closePollFn,
  getPollsFn,
  openPollFn,
  saveAnswersFn,
} from './server-functions'
import { answerSchema } from './schemas'
import type { Poll } from './schemas'

type Occurrence = {
  id: string
  occurrence_type: string
  show_candidate_slots: Array<{
    id: string
    starts_at: string
    location_name: string
    timezone_name: string
  }>
}
type Cast = {
  user_id: string
  status: string
  profiles: { display_name: string }
}

export function AvailabilityPolls({
  eventId,
  occurrences,
  cast,
}: {
  eventId: string
  occurrences: Occurrence[]
  cast: Cast[]
}) {
  const [data, setData] = useState<{ canLead: boolean; polls: Poll[] } | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  async function refresh() {
    try {
      const result = await getPollsFn({ data: { eventId } })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setData(result.data)
      setError(null)
    } catch {
      setError('Polls could not be loaded. Retry when connected.')
    }
  }
  useEffect(() => {
    void refresh()
  }, [eventId])
  return (
    <Card
      className="mt-5 p-6 gap-4"
      id="availability-polls"
      aria-label="Availability polls"
      role="region"
    >
      <h2 className="text-2xl font-semibold">Availability polls</h2>
      <p className="text-sm text-muted-foreground">
        Compare Cast availability. Poll answers do not confirm Calls, book a
        venue or approve a plan.
      </p>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <Button variant="outline" onClick={() => void refresh()}>
            Retry loading polls
          </Button>
        </div>
      ) : null}
      {!data ? (
        <p role="status">Loading polls…</p>
      ) : (
        <>
          {data.canLead ? (
            <OpenPollForm
              occurrences={occurrences}
              cast={cast}
              polls={data.polls}
              refresh={refresh}
            />
          ) : null}
          {data.polls.length === 0 ? (
            <p>No availability polls for you yet.</p>
          ) : (
            data.polls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                canLead={data.canLead}
                refresh={refresh}
              />
            ))
          )}
        </>
      )}
    </Card>
  )
}

function OpenPollForm({
  occurrences,
  cast,
  polls,
  refresh,
}: {
  occurrences: Occurrence[]
  cast: Cast[]
  polls: Poll[]
  refresh: () => Promise<void>
}) {
  const [occurrenceId, setOccurrenceId] = useState(occurrences[0]?.id ?? '')
  const [slotIds, setSlotIds] = useState<string[]>([])
  const [userIds, setUserIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pending = useRef<{ signature: string; commandId: string } | null>(null)
  const occurrence = occurrences.find((item) => item.id === occurrenceId)
  const open = polls.find(
    (poll) => poll.occurrenceId === occurrenceId && poll.state === 'open',
  )
  function toggle(values: string[], id: string) {
    return values.includes(id)
      ? values.filter((value) => value !== id)
      : [...values, id]
  }
  return (
    <form
      className="grid gap-4 rounded-md border p-4"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!slotIds.length || !userIds.length) {
          setError('Select at least one option and respondent.')
          return
        }
        const payload = {
          occurrenceId,
          slotIds,
          userIds,
          ...(open ? { replacePollId: open.id } : {}),
        }
        const signature = JSON.stringify(payload)
        if (pending.current?.signature !== signature)
          pending.current = { signature, commandId: crypto.randomUUID() }
        setBusy(true)
        setError(null)
        try {
          const result = await openPollFn({
            data: { ...payload, commandId: pending.current.commandId },
          })
          if (!result.ok) {
            setError(result.error.message)
            return
          }
          pending.current = null
          setSlotIds([])
          setUserIds([])
          await refresh()
        } catch {
          setError(
            'Poll could not be opened. Your selections are preserved; retry when connected.',
          )
        } finally {
          setBusy(false)
        }
      }}
    >
      <h3 className="font-semibold">
        {open ? 'Replace the open poll' : 'Open a poll'}
      </h3>
      <label>
        Occurrence
        <NativeSelect
          value={occurrenceId}
          disabled={busy}
          onChange={(event) => {
            setOccurrenceId(event.target.value)
            setSlotIds([])
          }}
        >
          {occurrences.map((item, index) => (
            <option key={item.id} value={item.id}>
              Occurrence {index + 1} · {item.occurrence_type}
            </option>
          ))}
        </NativeSelect>
      </label>
      <fieldset disabled={busy} className="grid gap-2">
        <legend className="font-medium">Fixed options</legend>
        {occurrence?.show_candidate_slots.length ? (
          occurrence.show_candidate_slots.map((slot, index) => (
            <label key={slot.id} className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={slotIds.includes(slot.id)}
                onChange={() => setSlotIds(toggle(slotIds, slot.id))}
              />
              Option {index + 1} ·{' '}
              {formatTime(slot.starts_at, slot.timezone_name)} ·{' '}
              {slot.location_name}
            </label>
          ))
        ) : (
          <p>Add Candidate Slots in Schedule &amp; Plan first.</p>
        )}
      </fieldset>
      <fieldset disabled={busy} className="grid gap-2">
        <legend className="font-medium">Accepted Cast respondents</legend>
        {cast
          .filter((member) => member.status === 'accepted')
          .map((member) => (
            <label
              key={member.user_id}
              className="flex min-h-11 items-center gap-2"
            >
              <input
                type="checkbox"
                checked={userIds.includes(member.user_id)}
                onChange={() => setUserIds(toggle(userIds, member.user_id))}
              />
              {member.profiles.display_name}
            </label>
          ))}
      </fieldset>
      {open ? (
        <p>
          Replacing cancels the current poll and keeps its submitted history.
          New responses are required.
        </p>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <Button disabled={busy || !occurrence} type="submit">
        {busy
          ? 'Saving…'
          : open
            ? 'Cancel and replace poll'
            : 'Open availability poll'}
      </Button>
    </form>
  )
}

function PollCard({
  poll,
  canLead,
  refresh,
}: {
  poll: Poll
  canLead: boolean
  refresh: () => Promise<void>
}) {
  const [answers, setAnswers] = useState(
    poll.own?.draft ?? poll.own?.submitted ?? {},
  )
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pending = useRef<{ signature: string; commandId: string } | null>(null)
  async function save(submit: boolean) {
    const payload = {
      pollId: poll.id,
      answers,
      submit,
      expectedVersion: poll.own?.version ?? 0,
    }
    const signature = JSON.stringify(payload)
    if (pending.current?.signature !== signature)
      pending.current = { signature, commandId: crypto.randomUUID() }
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const result = await saveAnswersFn({
        data: { ...payload, commandId: pending.current.commandId },
      })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      pending.current = null
      setNotice(
        submit
          ? 'Answers submitted.'
          : 'Private draft saved. Submitted answers are unchanged.',
      )
      await refresh()
    } catch {
      setError(
        'Answers could not be saved. Your input is preserved; retry when connected.',
      )
    } finally {
      setBusy(false)
    }
  }
  const endCommand = useRef<{ cancel: boolean; id: string } | null>(null)
  async function end(cancel: boolean) {
    if (endCommand.current?.cancel !== cancel)
      endCommand.current = { cancel, id: crypto.randomUUID() }
    setBusy(true)
    setError(null)
    try {
      const result = await closePollFn({
        data: { pollId: poll.id, commandId: endCommand.current.id, cancel },
      })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      endCommand.current = null
      await refresh()
    } catch {
      setError('Poll could not be ended. Retry when connected.')
    } finally {
      setBusy(false)
    }
  }
  const eligible = poll.respondents.filter((member) => member.eligible)
  return (
    <section
      aria-label={`${poll.state} availability poll`}
      className="grid min-w-0 gap-4 rounded-md border p-4"
    >
      <h3 className="font-semibold capitalize">{poll.state} poll</h3>
      <p className="text-sm">
        {eligible.filter((member) => member.submitted !== null).length} of{' '}
        {eligible.length} eligible respondents submitted · {poll.timezoneName}
      </p>
      {poll.options.map((option, index) => (
        <div key={option.id} className="grid gap-2 border-t pt-3">
          <h4 className="font-medium">
            Option {index + 1} ·{' '}
            {formatTime(option.startsAt, poll.timezoneName)} ·{' '}
            {option.durationMinutes} minutes · {option.locationName}
          </h4>
          <p className="text-sm">
            {(['available', 'unavailable', 'uncertain'] as const)
              .map(
                (answer) =>
                  `${answer}: ${eligible.filter((member) => member.submitted?.[option.id] === answer).length}`,
              )
              .join(' · ')}
          </p>
          <ul className="grid gap-1 text-sm">
            {poll.respondents.map((member) => (
              <li key={member.userId}>
                {member.displayName} ·{' '}
                {member.submitted?.[option.id] ?? 'Not submitted'}
                {!member.eligible ? ' · Ineligible; excluded from totals' : ''}
              </li>
            ))}
          </ul>
          {poll.canRespond ? (
            <label>
              Your answer for option {index + 1}
              <NativeSelect
                disabled={busy || poll.state !== 'open'}
                value={answers[option.id] ?? ''}
                onChange={(event) => {
                  const selected = answerSchema.safeParse(event.target.value)
                  if (selected.success)
                    setAnswers({ ...answers, [option.id]: selected.data })
                  else {
                    const next = { ...answers }
                    delete next[option.id]
                    setAnswers(next)
                  }
                }}
              >
                <option value="">Choose an answer</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
                <option value="uncertain">Uncertain</option>
              </NativeSelect>
            </label>
          ) : null}
        </div>
      ))}
      {poll.canRespond && poll.state === 'open' ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void save(false)}
          >
            Save private draft
          </Button>
          <Button disabled={busy} onClick={() => void save(true)}>
            {poll.own?.submitted ? 'Resubmit answers' : 'Submit all answers'}
          </Button>
        </div>
      ) : null}
      {poll.state !== 'open' ? (
        <p>
          This poll has ended. Answers are read-only; it cannot be reopened.
        </p>
      ) : null}
      {canLead && poll.state === 'open' ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void end(false)}
          >
            Close poll
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void end(true)}
          >
            Cancel poll
          </Button>
        </div>
      ) : null}
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await refresh()
              } finally {
                setBusy(false)
              }
            }}
          >
            Refresh poll; keep editing input
          </Button>
        </div>
      ) : null}
      {notice ? <p role="status">{notice}</p> : null}
    </section>
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
