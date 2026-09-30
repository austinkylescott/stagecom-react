// THROWAWAY: poll and Team interactions for design review, not production rules.
import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

export const workshopPeople = [
  {
    id: 'austin',
    name: 'Austin',
    initials: 'AU',
    teams: ['ants', 'management'],
  },
  { id: 'eno', name: 'Eno', initials: 'EN', teams: ['ants', 'french'] },
  { id: 'elijah', name: 'Elijah', initials: 'EL', teams: ['ants'] },
  { id: 'dan', name: 'Dan French', initials: 'DF', teams: ['french'] },
  { id: 'alex', name: 'Alex Rivera', initials: 'AR', teams: ['management'] },
  { id: 'maya', name: 'Maya Chen', initials: 'MC', teams: [] },
  { id: 'noor', name: 'Noor Williams', initials: 'NW', teams: [] },
  { id: 'june', name: 'June Okafor', initials: 'JO', teams: [] },
  { id: 'sam', name: 'Sam Patel', initials: 'SP', teams: [] },
  { id: 'tessa', name: 'Tessa Brooks', initials: 'TB', teams: [] },
] as const
export const workshopTeams = [
  { id: 'ants', name: 'Ants 2 Gods' },
  { id: 'management', name: 'The Management' },
  { id: 'french', name: 'Eno & Dan French' },
] as const
export const pollOptions = [
  {
    id: 'thu',
    label: 'Thu Oct 8 · 6–8 pm',
    venue: 'Riverside Studio · offsite',
    conflict: false,
  },
  {
    id: 'sat',
    label: 'Sat Oct 10 · 10 am–noon',
    venue: 'Primary Venue',
    conflict: true,
  },
  {
    id: 'sun',
    label: 'Sun Oct 11 · 6–8 pm',
    venue: 'Riverside Studio · offsite',
    conflict: false,
  },
] as const
export type Answer = 'unanswered' | 'available' | 'uncertain' | 'unavailable'
export type Team = {
  id: string
  name: string
  owner: string
  members: string[]
  pending: string[]
}
export type WorkshopState = {
  teams: Team[]
  closed: boolean
  drafts: Partial<Record<string, Record<string, Answer>>>
  responses: Partial<Record<string, Record<string, Answer>>>
  selectedOption: string
  selectedPeople: string[]
  invitations: Partial<Record<string, 'pending' | 'accepted' | 'declined'>>
}
export const initialWorkshop: WorkshopState = {
  closed: false,
  teams: [
    {
      id: 'ants',
      name: 'Ants 2 Gods',
      owner: 'austin',
      members: ['austin', 'eno', 'elijah'],
      pending: [],
    },
    {
      id: 'management',
      name: 'The Management',
      owner: 'alex',
      members: ['austin', 'alex'],
      pending: [],
    },
    {
      id: 'french',
      name: 'Eno & Dan French',
      owner: 'eno',
      members: ['eno', 'dan'],
      pending: [],
    },
  ],
  drafts: {},
  responses: {
    maya: { thu: 'available', sat: 'available', sun: 'available' },
    alex: { thu: 'available', sat: 'unavailable', sun: 'uncertain' },
  },
  selectedOption: '',
  selectedPeople: [],
  invitations: {
    maya: 'accepted',
    alex: 'accepted',
    noor: 'accepted',
    tessa: 'accepted',
    eno: 'pending',
  },
}
const avatar = (person: (typeof workshopPeople)[number]) => (
  <span className="vp-avatar" aria-hidden="true">
    {person.initials}
  </span>
)
export function AvailabilityPoll({
  state,
  onChange,
  canPlan,
  onSubmit,
  respondent,
  canRespond,
}: {
  state: WorkshopState
  onChange: (value: WorkshopState) => void
  canPlan: boolean
  onSubmit: () => void
  respondent: string
  canRespond: boolean
}) {
  const [ownResponse, setOwnResponse] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState('')
  const empty: Record<string, Answer> = {
    thu: 'unanswered',
    sat: 'unanswered',
    sun: 'unanswered',
  }
  const drafts =
    state.drafts[respondent] ?? state.responses[respondent] ?? empty
  const saved = state.responses[respondent]
  const fixedResponses: Record<string, Record<string, Answer>> = {
    maya: { thu: 'available', sat: 'available', sun: 'available' },
    alex: { thu: 'available', sat: 'unavailable', sun: 'uncertain' },
    tessa: empty,
    noor: empty,
  }
  return (
    <section className="vp-panel vp-poll">
      <h2>Afterlight · Rehearsal planning</h2>
      <p>
        Respond to each option by Oct 6. These are Candidate Slots, not
        confirmed Calls.
      </p>
      {canPlan && canRespond && (
        <div className="vp-actions">
          <Button
            className="vp-button secondary"
            onClick={() => setOwnResponse(false)}
          >
            Compare responses
          </Button>
          <Button
            className="vp-button secondary"
            onClick={() => setOwnResponse(true)}
          >
            My Availability Response
          </Button>
        </div>
      )}
      {state.closed && (
        <div className="vp-alert" role="status">
          Poll closed · responses are read-only. No booking or Call changed.
        </div>
      )}
      {canPlan && !ownResponse ? (
        <>
          <p>
            Compare accepted Cast availability. Missing responses stay visible.
          </p>
          <div className="vp-poll-options">
            {pollOptions.map((option) => {
              const answers = ['maya', 'alex', 'tessa', 'noor'].map(
                (id) => (state.responses[id] ?? fixedResponses[id])[option.id],
              )
              return (
                <article key={option.id}>
                  <h3>{option.label}</h3>
                  <p>{option.venue}</p>
                  <div className="vp-states">
                    {(
                      [
                        'available',
                        'uncertain',
                        'unavailable',
                        'unanswered',
                      ] as const
                    ).map((answer) => (
                      <span className="vp-badge" key={answer}>
                        {answers.filter((a) => a === answer).length} {answer}
                      </span>
                    ))}
                  </div>
                  <details>
                    <summary>See individual responses</summary>
                    {[
                      'Maya Chen',
                      'Alex Rivera',
                      'Tessa Brooks',
                      'Noor Williams',
                    ].map((name, i) => (
                      <p key={name}>
                        {name}: {answers[i]}
                      </p>
                    ))}
                  </details>
                  <Button
                    className="vp-button secondary"
                    onClick={() => {
                      setPreview(option.id)
                      setError('')
                    }}
                  >
                    Preview {option.label}
                  </Button>
                </article>
              )
            })}
          </div>
          {preview && !state.closed && (
            <div className="vp-alert">
              <h3>{pollOptions.find((o) => o.id === preview)?.label}</h3>
              {pollOptions.find((o) => o.id === preview)?.conflict ? (
                <p role="alert">
                  Conflict: the Primary Venue has a committed Workshop,
                  including buffers. Responses do not override occupancy.
                </p>
              ) : (
                <>
                  <p>
                    Offsite candidate. Missing and uncertain responses still
                    need attention. Choosing this option keeps it in planning;
                    required confirmation and review have not occurred.
                  </p>
                  <Button
                    className="vp-button"
                    onClick={() =>
                      onChange({ ...state, selectedOption: preview })
                    }
                  >
                    Keep as planning candidate
                  </Button>
                </>
              )}
            </div>
          )}
          {state.selectedOption && (
            <div className="vp-alert" role="status">
              <strong>
                Planning candidate:{' '}
                {pollOptions.find((o) => o.id === state.selectedOption)?.label}
              </strong>
              <p>
                No booking or Call changed. Next: resolve missing responses,
                obtain required confirmations, and use the authorized
                review/commitment workflow.
              </p>
            </div>
          )}
          {!state.closed && (
            <Button
              className="vp-button secondary"
              onClick={() => onChange({ ...state, closed: true })}
            >
              Close poll
            </Button>
          )}
        </>
      ) : state.closed ? (
        <>
          <p>
            {saved
              ? 'Your submitted responses are retained.'
              : 'No response was recorded before this poll closed.'}
          </p>
          {saved &&
            pollOptions.map((option) => (
              <p key={option.id}>
                {option.label}: {saved[option.id]}
              </p>
            ))}
        </>
      ) : saved && !editing ? (
        <>
          <div className="vp-alert" role="status">
            Response submitted. No confirmed Call changed.
          </div>
          {pollOptions.map((option) => (
            <p key={option.id}>
              {option.label}: {saved[option.id]}
            </p>
          ))}
          <Button
            className="vp-button secondary"
            onClick={() => setEditing(true)}
          >
            Revise my responses
          </Button>
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (pollOptions.some((o) => drafts[o.id] === 'unanswered')) {
              setError('Respond to every option before submitting.')
              return
            }
            onChange({
              ...state,
              responses: { ...state.responses, [respondent]: { ...drafts } },
            })
            setEditing(false)
            setError('')
            onSubmit()
          }}
        >
          {pollOptions.map((option) => (
            <fieldset className="vp-poll-option" key={option.id}>
              <legend>{option.label}</legend>
              <p>{option.venue}</p>
              <label>
                Your availability
                <select
                  aria-label={`Availability for ${option.label}`}
                  value={drafts[option.id]}
                  onChange={(event) =>
                    onChange({
                      ...state,
                      drafts: {
                        ...state.drafts,
                        [respondent]: {
                          ...drafts,
                          [option.id]: event.target.value as Answer,
                        },
                      },
                    })
                  }
                >
                  <option value="unanswered">Choose a response</option>
                  <option value="available">Available</option>
                  <option value="uncertain">Uncertain</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </label>
            </fieldset>
          ))}
          {error && (
            <p role="alert" className="vp-error">
              {error}
            </p>
          )}
          <Button className="vp-button" type="submit">
            Submit all responses
          </Button>
        </form>
      )}
    </section>
  )
}

export function TeamDirectory({
  state,
  onChange,
  viewer,
}: {
  state: WorkshopState
  onChange: (value: WorkshopState) => void
  viewer: string
}) {
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [name, setName] = useState('')
  const [notice, setNotice] = useState('')
  const [invite, setInvite] = useState('')
  const [successor, setSuccessor] = useState('')
  const currentTeam = state.teams.find((t) => t.id === filter)
  const displayName = (id: string) =>
    workshopPeople.find((p) => p.id === id)?.name ?? id
  const editTeam = (team: Team) =>
    onChange({
      ...state,
      teams: state.teams.map((t) => (t.id === team.id ? team : t)),
    })
  const matches = workshopPeople.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) &&
      (filter === 'all' || currentTeam?.members.includes(p.id)),
  )
  const memberships = (id: string) =>
    state.teams.filter((t) => t.members.includes(id))
  return (
    <>
      <Sheet open={creating} onOpenChange={setCreating}>
        <SheetTrigger asChild>
          <Button className="vp-button secondary">Create a Team</Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="vp-pane">
          <SheetHeader>
            <SheetTitle>Create a Team</SheetTitle>
            <SheetDescription>
              Create your Team without Theater Operator approval.
            </SheetDescription>
          </SheetHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!name.trim()) {
                setNotice('Enter a Team name.')
                return
              }
              const id = `team-${state.teams.length}`
              onChange({
                ...state,
                teams: [
                  ...state.teams,
                  {
                    id,
                    name: name.trim(),
                    owner: viewer,
                    members: [viewer],
                    pending: [],
                  },
                ],
              })
              setName('')
              setCreating(false)
              setFilter(id)
              setNotice(
                'Team created. You are its first Member and Team Owner. No Operator approval required.',
              )
            }}
          >
            <label>
              Team name
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <Button className="vp-button" type="submit">
              Create Team
            </Button>
          </form>
        </SheetContent>
      </Sheet>
      <label>
        Search Members
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name…"
        />
      </label>
      <div className="vp-team-filter" aria-label="Team filters">
        <Button
          className={`vp-button ${filter === 'all' ? '' : 'secondary'}`}
          onClick={() => setFilter('all')}
        >
          All Members
        </Button>
        {state.teams.map((team) => (
          <Button
            key={team.id}
            className={`vp-button ${filter === team.id ? '' : 'secondary'}`}
            onClick={() => {
              setFilter(team.id)
              setSuccessor('')
            }}
          >
            {team.name}
          </Button>
        ))}
      </div>
      {currentTeam && (
        <section className="vp-panel">
          <h2>{currentTeam.name}</h2>
          <p>Team Owner: {displayName(currentTeam.owner)}</p>
          <p>
            {currentTeam.members.length} Members · {currentTeam.pending.length}{' '}
            pending Team invitations
          </p>
          {currentTeam.owner === viewer && (
            <>
              <label>
                Invite a Theater Member
                <select
                  value={invite}
                  onChange={(e) => setInvite(e.target.value)}
                >
                  <option value="">Choose a Member</option>
                  {workshopPeople
                    .filter(
                      (p) =>
                        !currentTeam.members.includes(p.id) &&
                        !currentTeam.pending.includes(p.id),
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
              <Button
                className="vp-button secondary"
                disabled={!invite}
                onClick={() => {
                  editTeam({
                    ...currentTeam,
                    pending: [...currentTeam.pending, invite],
                  })
                  setInvite('')
                  setNotice(
                    'Team invitation is pending; membership has not changed.',
                  )
                }}
              >
                Invite to Team
              </Button>
            </>
          )}
          {currentTeam.pending.includes(viewer) && (
            <Button
              className="vp-button"
              onClick={() =>
                editTeam({
                  ...currentTeam,
                  members: [...currentTeam.members, viewer],
                  pending: currentTeam.pending.filter((id) => id !== viewer),
                })
              }
            >
              Accept Team invitation
            </Button>
          )}
          {currentTeam.members.includes(viewer) &&
            currentTeam.members.length > 1 && (
              <>
                {currentTeam.owner === viewer &&
                  currentTeam.members.length > 2 && (
                    <label>
                      Successor before leaving
                      <select
                        value={successor}
                        onChange={(e) => setSuccessor(e.target.value)}
                      >
                        <option value="">Choose a remaining Member</option>
                        {currentTeam.members
                          .filter((id) => id !== viewer)
                          .map((id) => (
                            <option key={id} value={id}>
                              {displayName(id)}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                <Button
                  className="vp-button secondary"
                  onClick={() => {
                    const remaining = currentTeam.members.filter(
                      (id) => id !== viewer,
                    )
                    if (
                      currentTeam.owner === viewer &&
                      remaining.length > 1 &&
                      !remaining.includes(successor)
                    ) {
                      setNotice(
                        'Choose a remaining Member as successor before leaving.',
                      )
                      return
                    }
                    editTeam({
                      ...currentTeam,
                      members: remaining,
                      owner:
                        remaining.length === 1
                          ? remaining[0]
                          : currentTeam.owner === viewer
                            ? successor
                            : currentTeam.owner,
                    })
                    setSuccessor('')
                    setInvite('')
                    setNotice(
                      remaining.length === 1
                        ? `${displayName(remaining[0])} is the sole remaining Member and becomes Team Owner.`
                        : 'You left the Team; Event Cast participation is unchanged.',
                    )
                  }}
                >
                  Leave Team
                </Button>
              </>
            )}
          {currentTeam.members.length === 1 &&
            currentTeam.members[0] === viewer && (
              <p>
                You are the sole remaining Member and Team Owner. Empty-Team
                archival is not part of this workshop.
              </p>
            )}
        </section>
      )}
      <div className="vp-people">
        {matches.map((person) => (
          <article key={person.id}>
            {avatar(person)}
            <h3>{person.name}</h3>
            <small>
              {person.id === 'alex'
                ? 'Admin · Theater Member'
                : 'Theater Member'}
            </small>
            <div className="vp-team-tags">
              {memberships(person.id).length ? (
                memberships(person.id).map((team) => (
                  <button key={team.id} onClick={() => setFilter(team.id)}>
                    {team.name}
                  </button>
                ))
              ) : (
                <p>No Team listed</p>
              )}
            </div>
          </article>
        ))}
      </div>
      {!matches.length && (
        <div className="vp-alert">
          No Members match this search and Team filter.
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      <p className="vp-footnote">
        Self-service Teams. Prototype invitations require individual acceptance.
        Operator recovery and empty-Team lifecycle remain separate specification
        questions.
      </p>
    </>
  )
}

export function TeamCasting({
  state,
  onChange,
  canInvite,
  eventName,
}: {
  state: WorkshopState
  onChange: (value: WorkshopState) => void
  canInvite: boolean
  eventName: string
}) {
  const [filter, setFilter] = useState('all')
  const [confirm, setConfirm] = useState(false)
  const [notice, setNotice] = useState('')
  const candidates = workshopPeople.filter(
    (p) =>
      filter === 'all' ||
      state.teams.find((t) => t.id === filter)?.members.includes(p.id),
  )
  const eligible = (id: string) => !state.invitations[id]
  const selected = state.selectedPeople.filter(eligible)
  const toggle = (id: string) => {
    if (!eligible(id)) return
    onChange({
      ...state,
      selectedPeople: state.selectedPeople.includes(id)
        ? state.selectedPeople.filter((v) => v !== id)
        : [...state.selectedPeople, id],
    })
    setConfirm(false)
  }
  return (
    <section className="vp-panel">
      <h2>{eventName} · Cast & Team</h2>
      <p>
        Accepted Cast participation and pending invitations remain separate.
        Team membership does not make someone Cast.
      </p>
      <div className="vp-cast-roster">
        {workshopPeople
          .filter((p) => state.invitations[p.id])
          .map((person) => (
            <div className="vp-row" key={person.id}>
              {avatar(person)}
              <div>
                <strong>{person.name}</strong>
                <p>
                  {state.invitations[person.id] === 'accepted'
                    ? 'Accepted Cast Member'
                    : state.invitations[person.id] === 'pending'
                      ? 'Pending Cast invitation · not coverage'
                      : 'Invitation declined'}
                </p>
              </div>
            </div>
          ))}
      </div>
      {canInvite ? (
        <>
          <label>
            Browse Team
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value)
                setConfirm(false)
              }}
            >
              <option value="all">All Members</option>
              {state.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          {filter !== 'all' && (
            <Button
              className="vp-button secondary"
              onClick={() => {
                onChange({
                  ...state,
                  selectedPeople: [
                    ...new Set([
                      ...state.selectedPeople,
                      ...candidates
                        .filter((p) => eligible(p.id))
                        .map((p) => p.id),
                    ]),
                  ],
                })
                setConfirm(false)
              }}
            >
              Select eligible members of{' '}
              {state.teams.find((t) => t.id === filter)?.name}
            </Button>
          )}
          <div className="vp-casting-picker">
            {candidates.map((person) => (
              <label className="vp-casting-person" key={person.id}>
                <input
                  type="checkbox"
                  disabled={!eligible(person.id)}
                  checked={selected.includes(person.id)}
                  onChange={() => toggle(person.id)}
                />
                {avatar(person)}
                <span>
                  <strong>{person.name}</strong>
                  <small>
                    {state.teams
                      .filter((t) => t.members.includes(person.id))
                      .map((t) => t.name)
                      .join(' · ') || 'No Team listed'}
                  </small>
                  {!eligible(person.id) && (
                    <small>
                      {state.invitations[person.id] === 'accepted'
                        ? 'Already accepted'
                        : 'Already invited'}
                    </small>
                  )}
                </span>
              </label>
            ))}
          </div>
          <p>
            {selected.length} individual invitations selected. Overlapping Teams
            are deduplicated.
          </p>
          <Button
            className="vp-button"
            disabled={!selected.length}
            onClick={() => setConfirm(true)}
          >
            Review invitations
          </Button>
          {confirm && (
            <div className="vp-alert">
              <h3>Invite these people to {eventName}?</h3>
              <p>
                {selected
                  .map((id) => workshopPeople.find((p) => p.id === id)?.name)
                  .join(', ')}
              </p>
              <p>
                Each person receives a pending Cast invitation. Nobody becomes
                accepted Cast or contributes coverage until their individual
                acceptance.
              </p>
              <Button
                className="vp-button"
                onClick={() => {
                  onChange({
                    ...state,
                    invitations: {
                      ...state.invitations,
                      ...Object.fromEntries(
                        selected.map((id) => [id, 'pending' as const]),
                      ),
                    },
                    selectedPeople: [],
                  })
                  setConfirm(false)
                  setNotice(
                    `${selected.length} individual Cast invitations prepared in memory.`,
                  )
                }}
              >
                Confirm individual invitations
              </Button>
              <Button
                className="vp-button secondary"
                onClick={() => setConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          )}
          {notice && <p role="status">{notice}</p>}
        </>
      ) : (
        <p>
          Cast invitations require Event Producer or Director authority. Theater
          Operator visibility alone does not grant it.
        </p>
      )}
    </section>
  )
}
