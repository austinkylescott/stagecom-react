// THROWAWAY: which visual system supports Focus Theater work on phones and desktop?
import { useEffect, useState } from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Users,
  Home,
  ClipboardList,
  Menu,
  Bell,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  bookings,
  directions,
  events,
  initialState,
  people,
  scenarios,
  screens,
} from './fixtures'
import type { Booking } from './fixtures'
import { operationalConditions } from '@/features/operational-workspaces/scenario-contract'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  AvailabilityPoll,
  TeamDirectory,
  TeamCasting,
  initialWorkshop,
} from './workshop'
import './visual-playground.css'

const route = getRouteApi('/dev/visual-playground')
const labels = {
  portal: 'Theater',
  callsheet: 'Callsheet',
  calendar: 'Calendar',
  events: 'Events',
  event: 'Event',
  review: 'Review',
  people: 'People',
  conversation: 'Conversation',
  components: 'Components',
}
export function VisualPlayground() {
  const [workshopEpoch, setWorkshopEpoch] = useState(0)
  const [workshop, setWorkshop] = useState(initialWorkshop)
  const [navOpen, setNavOpen] = useState(false)
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const [state, setState] = useState(initialState)
  const [reason, setReason] = useState('')
  const [reply, setReply] = useState('')
  const [target, setTarget] = useState('conflict')
  const [preview, setPreview] = useState(false)
  const [stale, setStale] = useState(false)
  const [notice, setNotice] = useState('')
  const [sampleError, setSampleError] = useState(true)
  const [block, setBlock] = useState<Booking | null>(null)
  const change = (patch: Partial<typeof search>, replace = false) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace })
  const cycle = (delta: number) => {
    const keys = ['A', 'B', 'C'] as const
    void change(
      { variant: keys[(keys.indexOf(search.variant) + delta + 3) % 3] },
      true,
    )
  }
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const el = event.target
      if (
        el instanceof HTMLElement &&
        el.closest(
          'input,textarea,select,button,a,[contenteditable],[role="dialog"]',
        )
      )
        return
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        cycle(event.key === 'ArrowLeft' ? -1 : 1)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })
  const reset = () => {
    setState(initialState)
    setWorkshop(initialWorkshop)
    setWorkshopEpoch((value) => value + 1)
    setReason('')
    setReply('')
    setTarget('conflict')
    setPreview(false)
    setStale(false)
    setNotice('')
    setBlock(null)
    setSampleError(true)
  }
  const isPublic = search.scenario === 'public'
  const isPending = search.scenario === 'pending' && state.invite !== 'accepted'
  const operator = [
    'operator-cast',
    'approved-unpublished',
    'published-at-risk',
    'draft',
  ].includes(search.scenario)
  const reviewer = search.scenario === 'reviewer' || operator
  const director = search.scenario === 'director'
  const producer = search.scenario === 'producer'
  const connected = !isPublic && !isPending
  const cast =
    ['member', 'operator-cast', 'multi', 'director'].includes(
      search.scenario,
    ) ||
    (search.scenario === 'pending' && state.invite === 'accepted')
  const chosen = events.find((event) => event.id === search.event) ?? events[0]
  const occurrence =
    chosen.id === 'afterlight'
      ? ['performance', 'rehearsal', 'offsite', 'candidate'].includes(
          search.occurrence,
        )
        ? search.occurrence
        : 'performance'
      : chosen.id === 'atlas'
        ? search.occurrence === 'hold'
          ? 'hold'
          : 'atlas-performance'
        : 'performance'
  const pendingEvent =
    (isPending && chosen.id === 'afterlight') ||
    (chosen.id === 'atlas' &&
      ['member', 'multi', 'operator-cast'].includes(search.scenario) &&
      !operator &&
      state.invite !== 'accepted')
  const unpublished =
    chosen.publication === 'Unpublished' ||
    search.scenario === 'approved-unpublished' ||
    search.scenario === 'draft'
  const eventAccess =
    connected &&
    (director ||
      operator ||
      reviewer ||
      producer ||
      (cast &&
        (chosen.id === 'afterlight' ||
          (chosen.id === 'atlas' && state.invite === 'accepted'))))
  const effectiveBookings = bookings
    .map((b) =>
      state.move === 'approved' && b.id === 'performance'
        ? { ...b, day: 16 }
        : b,
    )
    .sort((a, b) => a.day - b.day)
  const theater = search.theater === 'focus' ? 'Focus Theater' : 'Harbor Stage'
  const openEvent = (
    id: typeof search.event,
    selectedOccurrence = 'performance',
  ) =>
    change({
      event: id,
      screen: 'event',
      section: 'Overview',
      occurrence: selectedOccurrence,
    })
  const action = (
    text: string,
    run: () => void,
    secondary = false,
    disabled = false,
  ) => (
    <Button
      className={`vp-button ${secondary ? 'secondary' : ''}`}
      disabled={disabled}
      onClick={run}
    >
      {text}
    </Button>
  )
  const badge = (text: string, tone = '', description = text) => (
    <span
      className={`vp-badge ${tone}`}
      aria-label={description}
      title={description}
    >
      {text}
    </span>
  )
  const avatar = (i: number) => (
    <span
      className="vp-avatar"
      style={{ background: people[i].color }}
      aria-hidden="true"
    >
      {people[i].initials}
    </span>
  )
  const navItems = isPublic
    ? (['calendar', 'portal'] as const)
    : (['callsheet', 'calendar', 'portal', 'people'] as const)
  const nav = (
    <nav aria-label="Theater navigation">
      {navItems.map((screen) => {
        const Icon = {
          portal: Home,
          callsheet: ClipboardList,
          calendar: CalendarDays,
          people: Users,
        }[screen]
        return (
          <button
            key={screen}
            className={
              search.screen === screen ||
              (screen === 'calendar' && search.screen === 'events')
                ? 'active'
                : ''
            }
            onClick={() => {
              setNavOpen(false)
              void change({ screen })
            }}
          >
            <Icon size={18} />
            {labels[screen]}
          </button>
        )
      })}
    </nav>
  )
  const personName = isPublic
    ? 'Visitor'
    : operator
      ? 'Alex Rivera'
      : director
        ? 'Maya Chen'
        : producer
          ? 'June Okafor'
          : reviewer
            ? 'Sam Patel'
            : 'Noor Williams'
  const notificationControl = !isPublic && (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="vp-button secondary" aria-label="Open notifications">
          <Bell size={18} />
          <span className="vp-notification-label">
            Notifications {state.notification ? '· 1' : ''}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent className="vp-pane">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            Personal alerts. Clearing an alert does not resolve the underlying
            work.
          </SheetDescription>
        </SheetHeader>
        {state.notification ? (
          <>
            <p>
              {producer
                ? 'Your Proposal Revision was submitted · Oct 4'
                : reviewer && !cast
                  ? 'Atlas Proposal Revision is ready for review · Oct 4'
                  : 'Maya sent a Cast invitation · Oct 4'}
            </p>
            <Button onClick={() => setState({ ...state, notification: false })}>
              Dismiss Notification
            </Button>
          </>
        ) : (
          <p>You’re all caught up.</p>
        )}
      </SheetContent>
    </Sheet>
  )
  const accountControl = !isPublic && (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="vp-button secondary" aria-label="Open account">
          <span className="vp-avatar">
            {personName
              .split(' ')
              .map((v) => v[0])
              .join('')}
          </span>
          <span className="vp-account-label">{personName}</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="vp-pane">
        <SheetHeader>
          <SheetTitle>{personName}</SheetTitle>
          <SheetDescription>
            Your account · current Theater: {theater}
          </SheetDescription>
        </SheetHeader>
        <p>Authority comes from your Theater and Event relationships.</p>
      </SheetContent>
    </Sheet>
  )
  const mobileHeader = (
    <header className="vp-mobile-header">
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetTrigger asChild>
          <Button className="vp-button secondary" aria-label="Open navigation">
            <Menu size={18} />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="vp-pane">
          <SheetHeader>
            <SheetTitle>{theater}</SheetTitle>
            <SheetDescription>Navigate your Theater space</SheetDescription>
          </SheetHeader>
          {nav}
        </SheetContent>
      </Sheet>
      <strong>{theater}</strong>
      <div>
        {notificationControl}
        {accountControl}
      </div>
    </header>
  )
  const identity = (
    <div className="vp-identity">
      <span className="vp-mark">
        f<span>•</span>
      </span>
      <div>
        <strong>{theater}</strong>
        <small>A space for our people</small>
      </div>
    </div>
  )
  const title = (eyebrow: string, heading: string, description?: string) => (
    <header className="vp-page-title">
      <p className="vp-eyebrow">{eyebrow}</p>
      <h1>{heading}</h1>
      {description && <p>{description}</p>}
    </header>
  )
  const panel = (
    heading: string,
    children: React.ReactNode,
    className = '',
  ) => (
    <section className={`vp-panel ${className}`}>
      <h2>{heading}</h2>
      {children}
    </section>
  )
  const publicCards =
    search.theater === 'harbor' ? (
      panel(
        'Harbor Stage programming',
        <p>
          Oct 11 · 2 pm · your confirmed Call. Focus Theater programming is
          available in its own portal.
        </p>,
      )
    ) : (
      <div className="vp-event-grid">
        {events
          .filter((e) => e.publication === 'Published')
          .map((e) => (
            <button
              className="vp-event-card"
              key={e.id}
              onClick={() => void openEvent(e.id)}
            >
              {e.image ? (
                <img src={e.image} alt={`${e.title} illustrated poster`} />
              ) : (
                <div className="vp-missing">
                  Focus Theater
                  <br />
                  <strong>{e.title}</strong>
                  <small>Poster coming soon</small>
                </div>
              )}
              <div>
                <small>{e.date}</small>
                <h3>{e.title}</h3>
                <p>{e.subtitle}</p>
                <span>
                  Explore Event <ArrowRight size={16} />
                </span>
              </div>
            </button>
          ))}
      </div>
    )
  const invitation =
    state.invite !== 'pending' && search.screen !== 'components'
      ? null
      : panel(
          'Your response needed',
          <>
            <div className="vp-row">
              {avatar(0)}
              <div>
                <small>Personal commitment · Cast invitation</small>
                <h3>
                  Join the{' '}
                  {search.scenario === 'pending' ? 'Afterlight' : 'Atlas'}{' '}
                  ensemble
                </h3>
                <p>Maya Chen invited you as a Cast Member. Reply by Oct 6.</p>
              </div>
            </div>
            {state.invite === 'pending' ? (
              <div className="vp-actions">
                {action('Accept invitation', () => {
                  setState({ ...state, invite: 'accepted' })
                  setNotice(
                    `Invitation accepted. Cast access granted for ${search.scenario === 'pending' ? 'Afterlight' : 'Atlas'}.`,
                  )
                })}
                {action(
                  'Decline',
                  () => setState({ ...state, invite: 'declined' }),
                  true,
                )}
              </div>
            ) : (
              badge(`Invitation ${state.invite}`, 'success')
            )}
          </>,
          'vp-attention',
        )
  const pollRespondent = operator ? 'alex' : director ? 'maya' : 'noor'
  const availability =
    search.screen === 'callsheet' &&
    (workshop.closed || workshop.responses[pollRespondent]) ? null : (
      <AvailabilityPoll
        key={`${pollRespondent}-${workshopEpoch}`}
        state={workshop}
        onChange={setWorkshop}
        respondent={pollRespondent}
        canRespond={cast}
        canPlan={producer || director}
        onSubmit={() => {
          setState({ ...state, availability: 'submitted' })
          setNotice('Availability submitted. Confirmed schedule unchanged.')
        }}
      />
    )
  const commitments = panel(
    'Your confirmed schedule',
    <div className="vp-personal-timeline">
      {effectiveBookings
        .filter((b) => b.event === 'afterlight')
        .map((b) => (
          <button
            className="vp-timeline-item"
            key={b.id}
            onClick={() => void openEvent('afterlight', b.id)}
          >
            <span className="vp-date">
              <strong>{b.day}</strong>
              <small>OCT</small>
            </span>
            <span>
              <small>Required Call · Confirmed</small>
              <strong>{b.title}</strong>
              <span>
                {b.id === 'performance'
                  ? 'Call 6:45 pm · Performance 7:30 pm'
                  : b.time}
              </span>
              <small>{b.venue}</small>
            </span>
          </button>
        ))}
    </div>,
  )
  function bookButton(booking: Booking) {
    const detailed =
      operator ||
      (cast && booking.event === 'afterlight') ||
      (isPublic && booking.public)
    const opaque = !detailed && !booking.public
    return (
      <button
        className={`vp-booking ${booking.kind === 'Exclusive hold' ? 'held' : ''}`}
        key={booking.id}
        onClick={() => {
          if (opaque) {
            setBlock({
              ...booking,
              title: 'Primary Venue unavailable',
              kind: 'Occupied',
              contact: '',
              event: undefined,
            })
            return
          }
          if (booking.event)
            void openEvent(
              booking.event === 'atlas'
                ? 'atlas'
                : booking.event === 'room'
                  ? 'room'
                  : 'afterlight',
              booking.id,
            )
          else setBlock(booking)
        }}
      >
        <strong>{opaque ? 'Occupied' : booking.title}</strong>
        <span>
          {search.screen === 'calendar'
            ? booking.time
            : `Oct ${booking.day} · ${booking.time}`}
        </span>
        <small>
          {opaque
            ? 'Primary Venue · private booking'
            : `${booking.kind} · ${booking.venue}`}
        </small>
        {!opaque && <small>Contact: {booking.contact}</small>}
        <span className="vp-quick">
          {opaque
            ? 'No private details available'
            : 'Open details and permitted next action'}{' '}
          <ArrowRight size={13} />
        </span>
      </button>
    )
  }
  const occurrenceTimeline = eventAccess
    ? panel(
        'Occurrences',
        <div className="vp-occurrence-timeline">
          {effectiveBookings
            .filter((b) => b.event === chosen.id && b.kind !== 'Exclusive hold')
            .map((b) => (
              <button
                key={b.id}
                className={`vp-booking ${occurrence === b.id ? 'selected' : ''}`}
                onClick={() =>
                  void change({ occurrence: b.id, section: 'Schedule & Plan' })
                }
              >
                <strong>{b.title.replace(chosen.title + ' · ', '')}</strong>
                <span>
                  Oct {b.day} · {b.time}
                </span>
                <small>
                  {b.kind} · {b.venue}
                </small>
              </button>
            ))}
        </div>,
      )
    : !unpublished && !pendingEvent
      ? panel('Performances', <p>{chosen.date} · Primary Venue</p>)
      : null
  const statuses = (
    <div className="vp-states">
      {badge(chosen.lifecycle, '', `Lifecycle: ${chosen.lifecycle}`)}
      {badge(
        `${state.decision === 'approved' && chosen.id === 'atlas' ? 'Approved r3' : search.scenario === 'approved-unpublished' ? 'Approved r3' : chosen.decision}`,
      )}
      {badge(
        unpublished ? 'Unpublished' : 'Public',
        '',
        `Publication: ${unpublished ? 'Unpublished' : 'Published'}`,
      )}
      {badge(
        `${search.scenario === 'published-at-risk' ? 'At Risk' : chosen.health}`,
        chosen.health === 'At Risk' || search.scenario === 'published-at-risk'
          ? 'warning'
          : '',
      )}
    </div>
  )
  const schedule = panel(
    'Selected Occurrence',
    <>
      <label>
        Occurrence
        <select
          value={occurrence}
          onChange={(e) => void change({ occurrence: e.target.value })}
        >
          {chosen.id === 'afterlight' ? (
            <>
              <option value="performance">Performance · Oct 9</option>
              <option value="rehearsal">Rehearsal · Oct 7</option>
              <option value="candidate">
                Rehearsal · Oct 8 · Candidate Slot
              </option>
              <option value="offsite">Rehearsal · Oct 15 · offsite</option>
            </>
          ) : chosen.id === 'atlas' ? (
            <>
              <option value="atlas-performance">
                Atlas Performance · Oct 17
              </option>
              <option value="hold">Atlas exclusive hold · Oct 12</option>
            </>
          ) : (
            <option value="performance">
              {chosen.id === 'room'
                ? 'Performance · Oct 23'
                : 'No Occurrences planned'}
            </option>
          )}
        </select>
      </label>
      <h3>
        {chosen.id === 'draft'
          ? 'No Occurrences planned'
          : occurrence === 'candidate'
            ? 'Rehearsal · Candidate Slot'
            : occurrence === 'offsite'
              ? 'Rehearsal · Confirmed Slot'
              : occurrence === 'hold'
                ? 'Exclusive hold · expires Oct 6 at noon'
                : occurrence === 'rehearsal'
                  ? 'Rehearsal · Confirmed Slot'
                  : chosen.id === 'atlas'
                    ? 'Performance · Candidate Slot'
                    : 'Performance · Confirmed Slot'}
      </h3>
      <p>
        {chosen.id === 'room'
          ? 'Oct 23 · 7:30–9 pm · Primary Venue'
          : chosen.id === 'draft'
            ? 'No Confirmed Slot or Candidate Slot'
            : chosen.id === 'atlas'
              ? occurrence === 'hold'
                ? 'Oct 12 · 6–8 pm · Primary Venue'
                : 'Oct 17 · 7:30–9 pm'
              : occurrence === 'candidate'
                ? 'Oct 8 · 6–8 pm · Riverside Studio · Candidate Slot'
                : occurrence === 'offsite'
                  ? 'Oct 15 · 6–8 pm · Riverside Studio · does not consume Primary Venue'
                  : occurrence === 'rehearsal'
                    ? 'Oct 7 · 6–8 pm · Primary Venue'
                    : state.move === 'approved'
                      ? 'Oct 16 · 7:30–9 pm · Primary Venue'
                      : 'Oct 9 · 7:30–9 pm · Primary Venue'}
      </p>
      <p>
        Booking contact: {chosen.id === 'atlas' ? 'June Okafor' : 'Maya Chen'}
      </p>
      {(operator || producer) &&
        chosen.id === 'afterlight' &&
        occurrence === 'performance' && (
          <div className="vp-move">
            <h3>Preview a schedule adjustment</h3>
            <label>
              New Candidate Slot
              <select
                value={target}
                disabled={state.move === 'approved'}
                onChange={(e) => {
                  setTarget(e.target.value)
                  setPreview(false)
                  setState({ ...state, move: 'none' })
                }}
              >
                <option value="conflict">
                  Oct 14 · 7:30 pm · conflicts with Schedule Block
                </option>
                <option value="viable">
                  Oct 16 · 7:30 pm · available after buffers
                </option>
              </select>
            </label>
            {action('Preview consequences', () => setPreview(true), true)}
            {preview && (
              <>
                <div
                  className={`vp-alert ${target === 'conflict' ? 'error' : ''}`}
                >
                  <strong>
                    {target === 'conflict'
                      ? 'Conflict: Primary Venue unavailable'
                      : 'Viable Candidate Slot'}
                  </strong>
                  <p>
                    {target === 'conflict'
                      ? 'The Schedule Block overlaps the proposed booking including 30-minute buffers. Choose another target.'
                      : 'Three Cast available, one uncertain; Minimum Viable Cast: three. Accepted staff coverage retained. Public time will need reconciliation. The original commitment stays in place until approval.'}
                  </p>
                </div>
                {target === 'viable' &&
                  state.move === 'none' &&
                  action('Submit exact move for review', () =>
                    setState({ ...state, move: 'submitted' }),
                  )}
                {state.move === 'submitted' && (
                  <>
                    <p>
                      Move revision m1 submitted. Original Oct 9 commitment
                      retained.
                    </p>
                    {operator ? (
                      action('Simulate eligible non-author approval', () =>
                        setState({ ...state, move: 'approved' }),
                      )
                    ) : (
                      <p>
                        An eligible Reviewer must approve. Producer cannot
                        approve this revision.
                      </p>
                    )}
                  </>
                )}
                {state.move === 'approved' &&
                  badge('Move m1 approved · commitment now Oct 16', 'success')}
                <small>
                  Scripted Performance fixture; 30-minute buffers and public
                  reconciliation are assumptions. No hold policy is established.
                </small>
              </>
            )}
          </div>
        )}
    </>,
  )
  const review =
    search.scenario === 'approved-unpublished'
      ? panel(
          'Operational Approval recorded',
          <>
            <p>
              Atlas Proposal Revision r3 is approved. There is no pending
              decision.
            </p>
            <p>
              Publication remains Unpublished. Public access is unavailable.
            </p>
          </>,
        )
      : !reviewer
        ? panel(
            'Review access',
            <p>
              {producer
                ? 'You authored this revision. Another eligible Reviewer is required.'
                : 'An eligible Reviewer can inspect and decide the exact Proposal Revision.'}
            </p>,
          )
        : panel(
            'Proposal Revision r3',
            <>
              <small>Submitted Oct 4, 2026 · 3:15 pm by June Okafor</small>
              <h3>An Atlas of All the Things We Almost Said</h3>
              <p>Performance · Oct 17 · 7:30–9 pm · Primary Venue</p>
              <ul>
                <li>Minimum Viable Cast: 3 · accepted and confirmed: 4</li>
                <li>Event staff: 2 accepted assignments · coverage complete</li>
                <li>30-minute buffers · no committed overlap</li>
                <li>Reviewer: Sam Patel · not an author</li>
              </ul>
              {badge('Eligible exact revision · no blockers', 'success')}
              <p>
                Decision applies only to r3. Operational Approval does not
                publish.
              </p>
              <label>
                Reason for requested edits
                <textarea
                  value={reason}
                  disabled={state.decision !== 'pending'}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain what needs to change…"
                />
              </label>
              {notice === 'reason-required' && (
                <p className="vp-error" role="alert">
                  Enter a reason before requesting edits.
                </p>
              )}
              <div className="vp-actions">
                {action(
                  'Request edits',
                  () => {
                    if (!reason.trim()) {
                      setNotice('reason-required')
                      return
                    }
                    if (!stale)
                      setState({ ...state, decision: 'edits requested' })
                  },
                  true,
                  state.decision !== 'pending',
                )}
                {action(
                  'Approve r3',
                  () => {
                    if (!stale) setState({ ...state, decision: 'approved' })
                  },
                  false,
                  state.decision !== 'pending',
                )}
              </div>
              {stale && (
                <div className="vp-alert error" role="alert">
                  The displayed revision changed. No decision saved.{' '}
                  {action(
                    'Reload exact revision',
                    () => {
                      setStale(false)
                      setNotice('Exact r3 reloaded in this scripted fixture.')
                    },
                    true,
                  )}
                </div>
              )}
              {state.decision !== 'pending' && (
                <div className="vp-alert" role="status">
                  <strong>r3: {state.decision}</strong>
                  <p>
                    Publication remains Unpublished.
                    {state.decision === 'edits requested' &&
                      ` Reason: ${reason}`}
                  </p>
                </div>
              )}
              {action('Simulate stale revision', () => setStale(true), true)}
            </>,
          )
  const conversation =
    !cast || chosen.id !== 'afterlight'
      ? panel(
          'Conversation unavailable',
          <p>
            This bounded sample is for accepted Afterlight participants. Pending
            invitations and Producer-only relationships do not grant access.
          </p>,
        )
      : panel(
          'Around the rehearsal table',
          <>
            <p>Afterlight · accepted participants · exploratory sample</p>
            {state.messages.map((message, i) => (
              <div className="vp-message" key={`${i}-${message}`}>
                {avatar(i % people.length)}
                <p>{message}</p>
              </div>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (reply.trim()) {
                  setState({
                    ...state,
                    messages: [...state.messages, `You: ${reply.trim()}`],
                  })
                  setReply('')
                }
              }}
            >
              <label>
                Reply
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Add a coordination note…"
                />
              </label>
              <Button
                className="vp-button"
                type="submit"
                disabled={!reply.trim()}
              >
                Add reply
              </Button>
            </form>
            <small>
              In memory only. No delivery, Notifications, or new messaging
              permission contract.
            </small>
          </>,
        )
  const componentGallery = (variant: keyof typeof directions) => (
    <>
      {title(
        'Prototype inventory',
        directions[variant],
        'Initial light tokens and representative states · all values are experiments.',
      )}
      <div className="vp-work-grid">
        {panel(
          'Typography & tokens',
          <>
            <h1>Make room for a story.</h1>
            <h2>Keep the work legible.</h2>
            <p>Body / 15px / 1.6 · caption / 12px · weights 400, 600, 700</p>
            <div className="vp-swatches">
              {['surface', 'ink', 'accent', 'soft', 'line'].map((token) => (
                <div key={token}>
                  <span style={{ background: `var(--vp-${token})` }} />
                  <small>{token}</small>
                </div>
              ))}
            </div>
            <dl>
              <dt>Fonts</dt>
              <dd>
                {variant === 'B'
                  ? 'Georgia headings / system-ui body'
                  : variant === 'C'
                    ? 'Trebuchet MS / system sans-serif'
                    : 'system-ui / sans-serif'}
              </dd>
              <dt>Scale</dt>
              <dd>12 / 15 / 18 / 24 / {variant === 'B' ? '48' : '36'} px</dd>
              <dt>Space</dt>
              <dd>4 / 8 / 12 / 16 / 24 / 32 px</dd>
              <dt>Radius / shadow</dt>
              <dd>
                {variant === 'A'
                  ? '6px / none'
                  : variant === 'B'
                    ? '0px / none'
                    : '20px / soft 0 8px 32px'}
              </dd>
              <dt>Width / controls</dt>
              <dd>1200px content / 44px minimum controls</dd>
            </dl>
          </>,
        )}
        {panel(
          'Controls & state',
          <>
            <div className="vp-actions">
              {action('Primary', () => setNotice('Primary control activated'))}
              {action(
                'Secondary',
                () => setNotice('Secondary control activated'),
                true,
              )}
              <Button
                className="vp-button destructive"
                onClick={() => setNotice('Destructive sample activated')}
              >
                Destructive
              </Button>
              {action('Disabled', () => {}, false, true)}
            </div>
            <label>
              Text input
              <input placeholder="Event name" />
            </label>
            <label>
              Event type
              <select>
                <option>Performance</option>
                <option>Rehearsal</option>
              </select>
            </label>
            <label>
              <input type="checkbox" /> Include offsite activities
            </label>
            <p className="vp-error">Validation: an Event name is required.</p>
            {badge('Confirmed', 'success')}
            {badge('Held', 'warning')}
            {badge('Error', 'error')}
            <div className="vp-alert" aria-busy="true">
              Loading programming…
            </div>
            <div className="vp-alert">
              <strong>No upcoming Calls</strong>
              <p>Your accepted Calls will appear here.</p>
            </div>
            {sampleError ? (
              <div className="vp-alert error" role="alert">
                Unable to load this sample. Try again.
              </div>
            ) : (
              <div className="vp-alert" role="status">
                Sample loaded after retry.
              </div>
            )}
            {action('Retry', () => setSampleError(false), true)}
            <Link
              to="/dev/visual-playground"
              search={{
                ...search,
                screen: 'event',
                scenario: 'public',
                event: 'afterlight',
              }}
            >
              Open published Event presentation
            </Link>
            <p>Tab through controls to inspect visible focus rings.</p>
            <Sheet>
              <SheetTrigger asChild>
                <Button className="vp-button secondary">
                  Open bounded sheet
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom">
                <SheetHeader>
                  <SheetTitle>Confirm a sample action</SheetTitle>
                  <SheetDescription>
                    Prototype component sample. Escape or Close returns focus to
                    the trigger.
                  </SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>
          </>,
        )}
      </div>
      {invitation}
      {panel(
        'Classified compositions',
        <>
          <p>Booking: Confirmed Slot · Oct 9 · Primary Venue</p>
          <p>Personal response: Availability Response</p>
          <p>Shared decision: Proposal Revision awaits review</p>
          <p>Watch-only Operational Exception: public-copy reconciliation</p>
          <p>
            Notification: invitation received · dismissal leaves invitation
            unresolved
          </p>
        </>,
      )}
    </>
  )
  let content: React.ReactNode
  switch (search.screen) {
    case 'portal':
      content = (
        <>
          {title(
            isPublic ? 'Welcome to' : 'Your Theater space',
            theater,
            'Make something worth coming back for.',
          )}
          <div className="vp-portal-lead">
            <div>
              <h2>On stage. In good company.</h2>
              <p>
                A small stage for bold ideas, unexpected stories, and the people
                who make them possible.
              </p>
              {action(
                'Explore Calendar',
                () => void change({ screen: 'calendar' }),
              )}
            </div>
            <img
              src="/visual-playground/afterlight.svg"
              alt="Afterlight poster"
            />
          </div>
          {!isPublic && (
            <div className="vp-work-grid">
              {panel(
                'Your next step',
                <>
                  <h3>
                    {isPending
                      ? 'An invitation from Maya'
                      : operator
                        ? 'Programming needs your attention'
                        : 'Your part in what comes next'}
                  </h3>
                  <p>
                    {isPending
                      ? 'Answer your Cast invitation before Oct 6.'
                      : operator
                        ? 'Review one Proposal Revision. Check staffing risk separately.'
                        : 'Respond to availability and check your next confirmed Call.'}
                  </p>
                  {action(
                    'Open Callsheet',
                    () => void change({ screen: 'callsheet' }),
                    true,
                  )}
                </>,
              )}
              {operator &&
                panel(
                  'Theater Operations',
                  <>
                    <small>Shared Work Queue</small>
                    <h3>One Proposal awaits review</h3>
                    {action(
                      'Review r3',
                      () => void change({ screen: 'review', event: 'atlas' }),
                      true,
                    )}
                    <p>
                      Operational Exception: public copy reconciliation is being
                      handled by the Producer. Watch only.
                    </p>
                  </>,
                )}
            </div>
          )}
          <h2 className="vp-section-heading">Coming to our stage</h2>
          {publicCards}
          <p className="vp-footnote">
            124 Cedar Street · New York, NY · Step-free side entrance · Contact
            the Theater: hello@focus.example
          </p>
          {isPublic &&
            action(
              'Simulate sign-in · return to this Theater',
              () => void change({ scenario: 'member' }),
              true,
            )}
        </>
      )
      break
    case 'callsheet':
      content = (
        <>
          {title('Personal · across your Theaters', 'Your Callsheet')}
          {isPublic ? (
            panel(
              'Sign in',
              <p>Your personal Callsheet is available after sign-in.</p>,
            )
          ) : (
            <>
              <div className="vp-callsheet-columns">
                <div className="vp-action-list">
                  {['member', 'multi', 'operator-cast', 'pending'].includes(
                    search.scenario,
                  ) && invitation}
                  {cast && !isPending && availability}
                  {state.invite !== 'pending' &&
                    (workshop.closed || workshop.responses[pollRespondent]) &&
                    !operator &&
                    !producer &&
                    !reviewer &&
                    panel(
                      'No responses needed',
                      <p>
                        You’re all caught up. Your confirmed schedule stays
                        alongside.
                      </p>,
                    )}
                  {producer &&
                    panel(
                      'Personal commitment',
                      <>
                        <h3>Complete Atlas public presentation</h3>
                        {action(
                          'Open working Event',
                          () => void openEvent('atlas'),
                          true,
                        )}
                      </>,
                    )}
                  {reviewer &&
                    state.decision === 'pending' &&
                    panel(
                      'Shared Work Queue',
                      <>
                        <h3>
                          {
                            operationalConditions['proposal-awaits-review']
                              .label
                          }
                        </h3>
                        <p>Atlas r3 · eligible Reviewer</p>
                        {action(
                          'Review exact revision',
                          () =>
                            void change({ screen: 'review', event: 'atlas' }),
                        )}
                      </>,
                    )}
                  {operator &&
                    panel(
                      'Operational Exceptions · watch only',
                      <p>
                        Producer is reconciling public copy. This is separate
                        from your decisions.
                      </p>,
                    )}
                </div>
                <aside>
                  {cast && !isPending
                    ? commitments
                    : panel(
                        'Your confirmed schedule',
                        <p>
                          {producer
                            ? 'Producer does not imply Cast membership. No Cast Call is inferred.'
                            : 'No confirmed Calls yet.'}
                        </p>,
                      )}
                  {search.scenario === 'multi' &&
                    panel(
                      'Harbor Stage',
                      <>
                        <p>Oct 11 · 2 pm · Confirmed Call</p>
                        {action(
                          'Enter Harbor Stage',
                          () =>
                            void change({
                              theater: 'harbor',
                              screen: 'portal',
                            }),
                          true,
                        )}
                      </>,
                    )}
                </aside>
              </div>
              <h2 className="vp-section-heading">Discover published Events</h2>
              {publicCards}
            </>
          )}
        </>
      )
      break
    case 'calendar':
      content = (
        <>
          {title(
            theater + ' · programming',
            new Date(search.year, search.month - 1, 1).toLocaleDateString(
              'en-US',
              { month: 'long', year: 'numeric' },
            ),
          )}
          <div className="vp-period-controls">
            {action(
              'Previous month',
              () => {
                const d = new Date(search.year, search.month - 2, 1)
                void change({ month: d.getMonth() + 1, year: d.getFullYear() })
              },
              true,
            )}
            <label>
              Month
              <select
                value={search.month}
                onChange={(e) => void change({ month: Number(e.target.value) })}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i + 1}>
                    {new Date(2026, i, 1).toLocaleDateString('en-US', {
                      month: 'long',
                    })}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Year
              <select
                value={search.year}
                onChange={(e) => void change({ year: Number(e.target.value) })}
              >
                {[2025, 2026, 2027, 2028].map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </label>
            {action(
              'Next month',
              () => {
                const d = new Date(search.year, search.month, 1)
                void change({ month: d.getMonth() + 1, year: d.getFullYear() })
              },
              true,
            )}
          </div>
          <div className="vp-actions">
            {action(
              'Daybook',
              () => void change({ calendar: 'daybook' }),
              search.calendar !== 'daybook',
            )}
            {action(
              'Dense month',
              () => void change({ calendar: 'month' }),
              search.calendar !== 'month',
            )}
          </div>
          {!isPublic && (
            <div className="vp-actions">
              {action(
                'Event records · including unscheduled',
                () => void change({ screen: 'events' }),
                true,
              )}
            </div>
          )}
          {search.month !== 10 || search.year !== 2026 ? (
            <p>No fixture bookings in this period.</p>
          ) : null}
          <p className="vp-legend">
            Confirmed Slot / Exclusive hold / Occupied / Offsite · Candidate
            Slots are planning only and do not reserve the venue.
          </p>
          {search.calendar === 'month' && (
            <div className="vp-weekdays">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
          )}
          <div
            className={search.calendar === 'month' ? 'vp-month' : 'vp-daybook'}
          >
            {search.calendar === 'month' &&
              Array.from(
                {
                  length:
                    (new Date(search.year, search.month - 1, 1).getDay() + 6) %
                    7,
                },
                (_, i) => i,
              ).map((i) => (
                <div
                  key={`blank-${i}`}
                  className="vp-month-blank"
                  aria-hidden="true"
                />
              ))}
            {Array.from(
              { length: new Date(search.year, search.month, 0).getDate() },
              (_, i) => i + 1,
            )
              .filter(
                (day) =>
                  search.calendar === 'month' ||
                  effectiveBookings.some(
                    (b) =>
                      search.month === 10 &&
                      search.year === 2026 &&
                      b.day === day &&
                      b.kind !== 'Candidate Slot',
                  ),
              )
              .map((day) => (
                <section className="vp-day" key={day}>
                  <h3>
                    <span>{day.toString().padStart(2, '0')}</span>{' '}
                    <small>
                      {new Date(
                        search.year,
                        search.month - 1,
                        day,
                      ).toLocaleDateString('en-US', {
                        weekday: 'short',
                      })}
                    </small>
                  </h3>
                  {effectiveBookings
                    .filter(
                      (b) =>
                        search.month === 10 &&
                        search.year === 2026 &&
                        b.day === day &&
                        b.kind !== 'Candidate Slot' &&
                        (!isPublic || b.public),
                    )
                    .map(bookButton)}
                </section>
              ))}
          </div>
          {block &&
            panel(
              block.title,
              <>
                <p>
                  Oct {block.day} · {block.time} · {block.venue}
                </p>
                <p>
                  {block.kind}
                  {block.contact && ` · Contact: ${block.contact}`}
                </p>
                <p>
                  {operator
                    ? 'Operator next action: contact the booking owner before a schedule adjustment.'
                    : 'No additional private details or actions available.'}
                </p>
                {action('Close booking details', () => setBlock(null), true)}
              </>,
            )}
        </>
      )
      break
    case 'events':
      content = (
        <>
          {title(
            theater + ' · Event records',
            'A season taking shape',
            'Published programming and relationship-authorized work.',
          )}
          <div className="vp-event-grid">
            {events
              .filter(
                (e) =>
                  e.publication === 'Published' ||
                  operator ||
                  producer ||
                  reviewer,
              )
              .map((e) => (
                <button
                  className="vp-event-card"
                  key={e.id}
                  onClick={() => void openEvent(e.id)}
                >
                  {e.image ? (
                    <img src={e.image} alt={`${e.title} poster`} />
                  ) : (
                    <div className="vp-missing">
                      <strong>{e.title}</strong>
                      <small>Poster coming soon</small>
                    </div>
                  )}
                  <div>
                    <h3>{e.title}</h3>
                    <p>{e.date}</p>
                    {badge(e.publication)}
                    {(operator || producer || reviewer) && badge(e.decision)}
                  </div>
                </button>
              ))}
          </div>
        </>
      )
      break
    case 'event':
      content = (
        <>
          {action(
            'Back to Calendar',
            () => void change({ screen: 'calendar' }),
            true,
          )}
          {title(theater + ' · Event', chosen.title, chosen.subtitle)}
          {!eventAccess && !pendingEvent && unpublished ? (
            panel(
              'Not publicly available',
              <p>This Event has no published presentation.</p>,
            )
          ) : (
            <>
              {eventAccess && (
                <div className="vp-event-next">
                  <div>
                    <small>
                      Your next action ·{' '}
                      {operator
                        ? 'Theater Operator'
                        : reviewer
                          ? 'Reviewer'
                          : producer
                            ? 'Producer'
                            : 'Cast Member'}
                    </small>
                    <strong>
                      {reviewer && chosen.id === 'atlas'
                        ? 'Review exact revision r3'
                        : cast
                          ? 'Check your selected Occurrence and Call'
                          : 'Inspect the operational plan'}
                    </strong>
                  </div>
                  {action(
                    reviewer && chosen.id === 'atlas'
                      ? 'Inspect revision r3'
                      : 'Inspect selected Occurrence',
                    () =>
                      void change({
                        section:
                          reviewer && chosen.id === 'atlas'
                            ? 'Review'
                            : 'Schedule & Plan',
                      }),
                  )}
                </div>
              )}
              <div className="vp-event-hero">
                {chosen.image ? (
                  <img src={chosen.image} alt={`${chosen.title} poster`} />
                ) : (
                  <div className="vp-missing">Poster coming soon</div>
                )}
                <div>
                  {chosen.image && (
                    <a href={chosen.image} target="_blank" rel="noreferrer">
                      View full poster
                    </a>
                  )}
                  <details className="vp-about">
                    <summary>About this Event</summary>
                    <p>{chosen.description}</p>
                  </details>
                  <p>
                    {unpublished
                      ? 'Working presentation'
                      : 'Published presentation'}
                    : {chosen.date} · Primary Venue
                  </p>
                  {isPublic &&
                    action(
                      'Simulate sign-in · return to this Event',
                      () => void change({ scenario: 'member' }),
                      true,
                    )}
                </div>
              </div>
              {eventAccess && statuses}
              {occurrenceTimeline}
              {pendingEvent ? (
                <>
                  {invitation}
                  <p className="vp-footnote">
                    Invitation-only view: inviter, role, summary, and response.
                    Candidate Slots, Calls, team, and conversation withheld
                    until acceptance.
                  </p>
                </>
              ) : eventAccess ? (
                <>
                  <label className="vp-section-select">
                    Event section
                    <select
                      value={search.section}
                      onChange={(e) =>
                        void change({
                          section: e.target.value as typeof search.section,
                        })
                      }
                    >
                      {[
                        'Overview',
                        'Schedule & Plan',
                        'Cast & Team',
                        ...(reviewer || producer ? ['Review'] : []),
                        'Public Page',
                        'History',
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  {search.section === 'Overview' && (
                    <>
                      {cast &&
                        chosen.id === 'afterlight' &&
                        action(
                          'Join Event conversation',
                          () => void change({ screen: 'conversation' }),
                          true,
                        )}
                      {schedule}
                    </>
                  )}
                  {search.section === 'Schedule & Plan' && (
                    <>
                      {schedule}
                      {chosen.id === 'afterlight' &&
                        (cast || producer || director || operator) &&
                        availability}
                    </>
                  )}
                  {search.section === 'Review' && review}
                  {search.section === 'Cast & Team' &&
                    (chosen.id === 'afterlight' ? (
                      <TeamCasting
                        key={workshopEpoch}
                        state={workshop}
                        onChange={setWorkshop}
                        canInvite={producer || director}
                        eventName={chosen.title}
                      />
                    ) : (
                      panel(
                        'Cast & Team',
                        <p>
                          This workshop’s Team casting fixture belongs to
                          Afterlight. Other Events retain their own separate
                          participation.
                        </p>,
                      )
                    ))}
                  {search.section === 'Public Page' &&
                    panel(
                      unpublished
                        ? 'Working presentation · not public'
                        : 'Published presentation',
                      <>
                        <p>{chosen.description}</p>
                        <p>
                          Admission: no advance ticketing. Arrive 15 minutes
                          before the Performance.
                        </p>
                        <p>
                          Operational Approval and Publication remain
                          independent.
                        </p>
                      </>,
                    )}
                  {search.section === 'History' &&
                    panel(
                      'Event history',
                      <>
                        <p>Oct 4 · Proposal submitted by June</p>
                        <p>Oct 3 · Accepted staff coverage recorded</p>
                        <p>
                          Prototype decisions: {state.decision}; schedule move:{' '}
                          {state.move}
                        </p>
                      </>,
                    )}
                </>
              ) : (
                <>
                  {panel(
                    'Published presentation',
                    <>
                      <p>
                        Admission: no advance ticketing · arrive 15 minutes
                        early.
                      </p>
                      <p>
                        Step-free side entrance. Contact: hello@focus.example
                      </p>
                      <p>
                        Private planning and coordination require a current
                        authorized relationship.
                      </p>
                    </>,
                  )}
                </>
              )}
            </>
          )}
        </>
      )
      break
    case 'review':
      content = (
        <>
          {title(
            theater + ' · shared decision',
            'A plan, ready for review',
            'Exact revisions. Explicit decisions. Publication stays separate.',
          )}
          {isPublic || isPending
            ? panel(
                'Review unavailable',
                <p>You do not have an eligible review relationship.</p>,
              )
            : review}
        </>
      )
      break
    case 'people':
      content = (
        <>
          {title(theater + ' · directory', 'People & Teams')}
          {connected ? (
            <TeamDirectory
              key={`${search.scenario}-${workshopEpoch}`}
              state={workshop}
              onChange={setWorkshop}
              viewer={
                operator
                  ? 'alex'
                  : director
                    ? 'maya'
                    : producer
                      ? 'june'
                      : reviewer
                        ? 'sam'
                        : 'noor'
              }
            />
          ) : (
            panel(
              'Members only',
              <p>The directory requires active Theater membership.</p>,
            )
          )}
        </>
      )
      break
    case 'conversation':
      content = (
        <>
          {title(
            theater + ' · ' + chosen.title,
            'Keep the conversation close',
            'A bounded exploration of Event coordination.',
          )}
          {conversation}
        </>
      )
      break
    case 'components':
      content = componentGallery(search.variant)
      break
  }
  if (
    search.theater === 'harbor' &&
    !['callsheet', 'components'].includes(search.screen)
  )
    content = (
      <>
        {title(
          'Secondary membership · scope check',
          'Harbor Stage',
          'A separate Theater, with its own programming.',
        )}{' '}
        {panel(
          'Your confirmed Call',
          <>
            <h3>Harbor ensemble · Rehearsal</h3>
            <p>Oct 11 · 2–4 pm · Harbor Studio · confirmed required Call</p>
            <p>
              This small secondary case verifies Theater switching without
              mixing Focus Theater’s schedule or people into Harbor.
            </p>
            {action(
              'Return to Focus Theater',
              () => void change({ theater: 'focus', screen: 'portal' }),
              true,
            )}
          </>,
        )}
      </>
    )
  const canvas = (variant: keyof typeof directions) => (
    <div className={`vp-canvas vp-${variant}`}>
      {variant === 'A' ? (
        <>
          <aside className="vp-sidebar">
            {identity}
            {nav}
            <div className="vp-sidebar-bottom">
              {notificationControl}
              {accountControl}
              <small>Powered by Stagecom</small>
              <strong>
                {isPublic
                  ? 'Visitor'
                  : isPending
                    ? 'Pending invitee'
                    : operator
                      ? 'Alex Rivera'
                      : producer
                        ? 'June Okafor'
                        : reviewer
                          ? 'Sam Patel'
                          : 'Noor Williams'}
              </strong>
            </div>
          </aside>
          <div className="vp-workspace">
            {mobileHeader}
            <main>
              {search.screen === 'components'
                ? componentGallery(variant)
                : content}
            </main>
          </div>
        </>
      ) : variant === 'B' ? (
        <>
          <header className="vp-playbill-header">
            {identity}
            <span>EST. 2018 / NEW YORK</span>
            {nav}
          </header>
          <main>
            {search.screen === 'components'
              ? componentGallery(variant)
              : content}
          </main>
          <footer>Focus Theater / A stage for what comes next.</footer>
        </>
      ) : (
        <>
          <header className="vp-studio-header">
            {identity}
            <div className="vp-faces">
              {[0, 1, 4].map((i) => (
                <span key={i}>{avatar(i)}</span>
              ))}
              <small>Made together</small>
            </div>
          </header>
          <div className="vp-studio-body">
            <aside>
              {nav}
              <p>
                Our space.
                <br />
                Your next chapter.
              </p>
            </aside>
            <main>
              {search.screen === 'components'
                ? componentGallery(variant)
                : content}
            </main>
          </div>
        </>
      )}
    </div>
  )
  if (!import.meta.env.DEV)
    return <p>This throwaway playground is available in development only.</p>
  return (
    <div className="vp-review" data-ready={ready}>
      <div className="vp-review-controls">
        <strong>
          VISUAL LAB <small>Throwaway · fictional · in memory</small>
        </strong>
        <label>
          Screen
          <select
            value={search.screen}
            onChange={(e) =>
              void change({ screen: e.target.value as typeof search.screen })
            }
          >
            {screens.map((s) => (
              <option value={s} key={s}>
                {labels[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Viewer / scenario
          <select
            value={search.scenario}
            onChange={(e) => {
              const scenario = e.target.value as typeof search.scenario
              void change({
                scenario,
                event: ['reviewer', 'approved-unpublished'].includes(scenario)
                  ? 'atlas'
                  : scenario === 'draft'
                    ? 'draft'
                    : scenario === 'published-at-risk'
                      ? 'room'
                      : 'afterlight',
              })
            }}
          >
            {scenarios.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Viewport
          <select
            value={search.viewport}
            onChange={(e) =>
              void change({
                viewport: e.target.value as typeof search.viewport,
              })
            }
          >
            <option value="full">Full width</option>
            <option value="phone">390px phone</option>
            <option value="compare">Three directions</option>
          </select>
        </label>
        <label>
          Event
          <select
            value={search.event}
            onChange={(e) =>
              void change({ event: e.target.value as typeof search.event })
            }
          >
            {events.map((e) => (
              <option value={e.id} key={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </label>
        <button onClick={reset}>Reset actions</button>
        {search.scenario === 'multi' && (
          <label>
            Theater context
            <select
              value={search.theater}
              onChange={(e) =>
                void change({
                  theater: e.target.value as typeof search.theater,
                })
              }
            >
              <option value="focus">Focus Theater</option>
              <option value="harbor">Harbor Stage</option>
            </select>
          </label>
        )}
      </div>
      <div className={`vp-stage ${search.viewport}`}>
        {search.viewport === 'compare'
          ? (['A', 'B', 'C'] as const).map((v) => (
              <div className="vp-comparison" key={v}>
                <h2>
                  {v} / {directions[v]}
                </h2>
                {canvas(v)}
              </div>
            ))
          : canvas(search.variant)}
      </div>
      <details className="vp-state">
        <summary>
          Comparison state · {search.variant} / {search.scenario} /{' '}
          {search.screen}
        </summary>
        <pre>
          {JSON.stringify(
            { ...search, ...state, workshop, target, preview, stale },
            null,
            2,
          )}
        </pre>
      </details>
      {notice && notice !== 'reason-required' && (
        <div className="vp-toast" role="status">
          {notice}
          <button onClick={() => setNotice('')} aria-label="Dismiss feedback">
            ×
          </button>
        </div>
      )}
      <div className="vp-switcher" aria-label="Prototype direction switcher">
        <button onClick={() => cycle(-1)} aria-label="Previous direction">
          <ArrowLeft size={18} />
        </button>
        <span>
          {search.variant} — {directions[search.variant]}
        </span>
        <button onClick={() => cycle(1)} aria-label="Next direction">
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}
