// STA-64 THROWAWAY PROTOTYPE: three layouts for the Member home and Theater journey.
// All content is fictional, in memory, and intentionally separate from production routes.
import { useEffect, useState } from 'react'
import {
  CalendarDays,
  Users,
  Drama,
  ArrowUpRight,
  Building2,
} from 'lucide-react'

import './member-journey-prototype.css'

type Variant = 'A' | 'B' | 'C'
type Persona = 'member' | 'multi' | 'operator' | 'leader' | 'pending' | 'former'
type Screen =
  | 'home'
  | 'theater'
  | 'calendar'
  | 'events'
  | 'event'
  | 'conversation'
  | 'people'
  | 'profile'
  | 'operations'
  | 'public-theater'
  | 'public-event'
  | 'public-profile'

const variants: { id: Variant; name: string; note: string }[] = [
  {
    id: 'A',
    name: 'Priorities then discovery',
    note: 'Selected direction · personal priorities, discovery below.',
  },
  {
    id: 'B',
    name: 'Daybook',
    note: 'Rejected · timeline direction did not resolve the design.',
  },
  {
    id: 'C',
    name: 'Theater portal',
    note: 'Rejected · more cramped than A.',
  },
]

const personas: { id: Persona; name: string; relationship: string }[] = [
  {
    id: 'member',
    name: 'One Theater · accepted Cast',
    relationship: 'Cast Member',
  },
  {
    id: 'multi',
    name: 'Two Theaters · accepted Cast',
    relationship: 'Cast Member',
  },
  {
    id: 'operator',
    name: 'Operator + accepted Cast',
    relationship: 'Theater Operator and Cast Member',
  },
  { id: 'leader', name: 'Event leader', relationship: 'Director' },
  {
    id: 'pending',
    name: 'Pending Cast invitee',
    relationship: 'Invited Member',
  },
  {
    id: 'former',
    name: 'Former Event participant',
    relationship: 'Former Cast Member',
  },
]

const labels: Record<Screen, string> = {
  home: 'Home',
  theater: 'Lantern Theater',
  calendar: 'Theater Calendar',
  events: 'Events',
  event: 'Event workspace',
  conversation: 'Conversation',
  people: 'People',
  profile: 'Member profile',
  operations: 'Operations',
  'public-theater': 'Public Theater',
  'public-event': 'Public Event',
  'public-profile': 'Public profile',
}

const eventFixtures = [
  {
    id: 'tempest',
    title: 'The Tempest',
    theater: 'Lantern Theater',
    dates: 'Oct 2–4',
    subtitle: 'A storm. An island. A second chance.',
    color: '#164b50',
  },
  {
    id: 'hours',
    title: 'Small Hours',
    theater: 'Lantern Theater',
    dates: 'Oct 17',
    subtitle: 'Stories for the space after midnight.',
    color: '#634979',
  },
  {
    id: 'bluebird',
    title: 'Bluebird Cabaret',
    theater: 'Harbor Stage',
    dates: 'Oct 23',
    subtitle: 'One room. Many voices.',
    color: '#b65132',
  },
]
const peopleFixtures = [
  {
    name: 'Maya Chen',
    role: 'Director',
    detail: 'Movement · ensemble work',
    color: '#d9a27a',
    hair: '#252838',
  },
  {
    name: 'Noah Williams',
    role: 'Cast Member',
    detail: 'Acting · new writing',
    color: '#8d573e',
    hair: '#30251f',
  },
  {
    name: 'Alex Rivera',
    role: 'Cast Member',
    detail: 'Acting · music',
    color: '#c58360',
    hair: '#4b352c',
  },
  {
    name: 'Sam Ellis',
    role: 'Producer',
    detail: 'Producing · sound',
    color: '#e5ba97',
    hair: '#a75831',
  },
]

function Avatar({ index = 0 }: { index?: number }) {
  const person = peopleFixtures[index]
  return (
    <svg
      className="mj-avatar"
      viewBox="0 0 80 80"
      role="img"
      aria-label={`${person.name}, illustrated placeholder avatar`}
    >
      <circle
        cx="40"
        cy="40"
        r="40"
        fill={['#d4e6df', '#e7d9ef', '#f3dfc6', '#d5e1f0'][index]}
      />
      <path d="M10 80 Q14 53 40 53 Q66 53 70 80" fill={person.hair} />
      <ellipse cx="40" cy="34" rx="19" ry="23" fill={person.hair} />
      <ellipse cx="40" cy="38" rx="15" ry="18" fill={person.color} />
      <path d="M23 30 Q28 8 50 18 L59 33 Q39 31 32 22 Z" fill={person.hair} />
      <circle cx="34" cy="37" r="1.5" fill="#26252a" />
      <circle cx="46" cy="37" r="1.5" fill="#26252a" />
      <path
        d="M35 46 Q40 50 45 46"
        fill="none"
        stroke="#5a342e"
        strokeWidth="1.5"
      />
    </svg>
  )
}
function EventArt({ id, compact = false }: { id: string; compact?: boolean }) {
  const item = eventFixtures.find((e) => e.id === id) ?? eventFixtures[0]
  return (
    <div
      className={`mj-art mj-art-${id} ${compact ? 'mj-art-compact' : ''}`}
      style={{ background: item.color }}
    >
      <svg viewBox="0 0 300 180" aria-hidden="true">
        {id === 'tempest' ? (
          <>
            <circle cx="218" cy="42" r="27" fill="#edc78c" />
            <path
              d="M0 110 Q50 40 110 110 T230 110 T350 110 L350 190 H0Z"
              fill="#65aaa6"
            />
            <path
              d="M0 146 Q65 70 135 143 T270 143 T400 143 L400 190 H0Z"
              fill="#a2d2bf"
            />
            <path
              d="M119 40 L120 128 M123 43 L162 103 H123Z"
              stroke="#f5e4c3"
              fill="#f5e4c3"
              strokeWidth="3"
            />
          </>
        ) : id === 'hours' ? (
          <>
            <circle cx="212" cy="57" r="36" fill="#f0cea5" />
            <circle cx="226" cy="43" r="33" fill={item.color} />
            <path
              d="M0 133 L35 133 V89 H76 V155 H97 V109 H128 V66 H154 V149 H181 V120 H224 V83 H252 V143 H300 V180 H0Z"
              fill="#352a48"
            />
            <g fill="#efb85f">
              <rect x="47" y="103" width="12" height="17" />
              <rect x="136" y="84" width="9" height="14" />
              <rect x="234" y="100" width="9" height="16" />
            </g>
          </>
        ) : (
          <>
            <circle cx="153" cy="84" r="67" fill="#edb878" />
            <path
              d="M58 103 Q107 25 148 77 Q183 34 239 35 Q211 118 154 124 Q95 143 58 103Z"
              fill="#244f6d"
            />
            <path d="M148 77 L154 124 L185 92Z" fill="#8db8c0" />
            <path d="M48 160 H250" stroke="#f3d3a4" strokeWidth="3" />
          </>
        )}
      </svg>
      {!compact && (
        <div>
          <small>{item.theater}</small>
          <strong>{item.title}</strong>
          <span>{item.dates} · 2026</span>
        </div>
      )}
    </div>
  )
}

function initial<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.find((item) => item === value) ?? fallback
}

export function MemberJourneyPrototype({
  initialSearch,
}: {
  initialSearch: { variant?: string; persona?: string; screen?: string }
}) {
  const [variant, setVariant] = useState<Variant>(() =>
    initial(initialSearch.variant, ['A', 'B', 'C'], 'A'),
  )
  const [persona, setPersona] = useState<Persona>(() =>
    initial(
      initialSearch.persona,
      personas.map((p) => p.id),
      'member',
    ),
  )
  const [screen, setScreen] = useState<Screen>(() =>
    initial(initialSearch.screen, Object.keys(labels) as Screen[], 'home'),
  )
  const [theaterName, setTheaterName] = useState('Lantern Theater')
  const [eventId, setEventId] = useState('tempest')
  const [personIndex, setPersonIndex] = useState(0)
  const [peopleSearch, setPeopleSearch] = useState('')
  const [phone, setPhone] = useState(false)
  const [availability, setAvailability] = useState('No response')
  const [invite, setInvite] = useState('Pending')
  const [message, setMessage] = useState('')
  const [posts, setPosts] = useState([
    'Maya · Director: Please review the proposed Tuesday Rehearsal time. The confirmation lives in the schedule task above.',
    'Noah · Cast: The script notes for scene three are in the rehearsal packet.',
  ])
  const isOperator = persona === 'operator'
  const isAccepted = persona !== 'pending' && persona !== 'former'
  const canPost = isAccepted

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('variant', variant)
    url.searchParams.set('persona', persona)
    url.searchParams.set('screen', screen)
    window.history.replaceState(null, '', url)
  }, [variant, persona, screen])

  useEffect(() => {
    const onKey = (keyEvent: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(keyEvent.key)) return
      const target = keyEvent.target as HTMLElement
      if (target.closest('input, textarea, select, [contenteditable="true"]'))
        return
      setVariant(
        (current) =>
          variants[
            (variants.findIndex((item) => item.id === current) +
              (keyEvent.key === 'ArrowRight' ? 1 : 2)) %
              3
          ].id,
      )
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const selectedEvent =
    eventFixtures.find((item) => item.id === eventId) ?? eventFixtures[0]
  const selectedPerson = peopleFixtures[personIndex]
  const openTheater = (name: string) => {
    setTheaterName(name)
    setScreen('theater')
  }
  const openEvent = (id: string, next: Screen = 'event') => {
    setEventId(id)
    setTheaterName(
      eventFixtures.find((item) => item.id === id)?.theater ??
        'Lantern Theater',
    )
    setScreen(next)
  }
  const go = (next: Screen) => {
    if (next === 'event') {
      setEventId('tempest')
      setTheaterName('Lantern Theater')
    }
    setScreen(next)
  }
  const action = (label: string, next: Screen) => (
    <button className="mj-link" onClick={() => go(next)} type="button">
      {label} <span aria-hidden="true">→</span>
    </button>
  )
  const card = (title: string, children: React.ReactNode, className = '') => (
    <section className={`mj-card ${className}`}>
      <h2>{title}</h2>
      {children}
    </section>
  )

  const theaterNames =
    persona === 'multi'
      ? ['Lantern Theater', 'Harbor Stage']
      : ['Lantern Theater']
  const visibleEvents = eventFixtures.filter((item) =>
    screen === 'home'
      ? theaterNames.includes(item.theater)
      : item.theater === theaterName,
  )
  const availabilityButtons = (
    <div className="mj-actions">
      {['Available', 'Unavailable', 'Uncertain'].map((choice) => (
        <button
          key={choice}
          aria-pressed={availability === choice}
          onClick={() => setAvailability(choice)}
        >
          {choice}
        </button>
      ))}
    </div>
  )
  const commitments = card(
    'Needs your response',
    persona === 'former' ? (
      <>
        <p>You have no current Calls for this Event.</p>
        {action('View your participation history', 'event')}
      </>
    ) : persona === 'pending' ? (
      <div className="mj-item">
        <b>Join the cast of The Tempest</b>
        <p>Maya invited you · Lantern Theater</p>
        <div className="mj-actions">
          <button
            disabled={invite === 'Declined'}
            onClick={() => {
              setInvite('Accepted')
              setPersona('member')
            }}
          >
            Accept invitation
          </button>
          <button
            disabled={invite === 'Declined'}
            onClick={() => setInvite('Declined')}
          >
            Decline
          </button>
        </div>
        <small>{invite}</small>
      </div>
    ) : (
      <div className="mj-task">
        <EventArt id="tempest" compact />
        <div>
          <span className="mj-tag">
            {availability === 'No response'
              ? 'Response needed'
              : 'Response recorded'}
          </span>
          <h3>Can you make Tuesday’s Rehearsal?</h3>
          <p>
            The Tempest · Lantern Theater
            <br />
            Sep 29, 6–8 pm · tentative Candidate Slot
          </p>
          {availabilityButtons}
          <small>Your response: {availability}</small>
          {action('See the full plan', 'event')}
        </div>
      </div>
    ),
    'mj-commitments',
  )
  const shared = isOperator
    ? card(
        'Shared decisions you can resolve',
        <>
          <span className="mj-tag">Theater Operator</span>
          <h3>Review The Tempest Proposal Revision</h3>
          <p>Lantern Theater · venue hold expires tomorrow</p>
          {action('Review in Operations', 'operations')}
        </>,
        'mj-shared',
      )
    : null
  const schedule = (
    <section className="mj-personal-schedule">
      <h2>Your next commitments</h2>
      <div className="mj-agenda-row">
        <div className="mj-date">
          <small>OCT</small>
          <strong>02</strong>
        </div>
        <EventArt id="tempest" compact />
        <div>
          <span className="mj-tag mj-confirmed">Confirmed · Required Call</span>
          <h3>Perform in The Tempest</h3>
          <p>Friday · 7 pm · Lantern Theater</p>
          {action('Open Event', 'event')}
        </div>
      </div>
      {persona === 'multi' && (
        <div className="mj-agenda-row">
          <div className="mj-date">
            <small>OCT</small>
            <strong>23</strong>
          </div>
          <EventArt id="bluebird" compact />
          <div>
            <span className="mj-tag mj-confirmed">
              Confirmed · Required Call
            </span>
            <h3>Perform in Bluebird Cabaret</h3>
            <p>Friday · 7:30 pm · Harbor Stage</p>
            <button className="mj-link" onClick={() => openEvent('bluebird')}>
              Open Event →
            </button>
          </div>
        </div>
      )}
    </section>
  )
  const shows = (
    <section className="mj-discovery">
      <div className="mj-section-heading">
        <div>
          <small>DISCOVER</small>
          <h2>Coming to your stages</h2>
        </div>
        <span>Published Events · beyond your own Calls</span>
      </div>
      <div className="mj-poster-grid">
        {visibleEvents.map((item) => (
          <article className="mj-event-card" key={item.id}>
            <button
              className="mj-poster-button"
              onClick={() => openEvent(item.id, 'public-event')}
              aria-label={`Explore ${item.title}`}
            >
              <EventArt id={item.id} />
            </button>
            <div className="mj-event-card-body">
              <p>{item.subtitle}</p>
              <button
                className="mj-link"
                onClick={() => openEvent(item.id, 'public-event')}
              >
                Explore Event →
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
  const portals = (
    <section className="mj-portals">
      <h2>{theaterNames.length === 1 ? 'Your Theater' : 'Your Theaters'}</h2>
      <div className="mj-portal-grid">
        {theaterNames.map((name, i) => (
          <article className={`mj-portal mj-portal-${i}`} key={name}>
            <Building2 size={30} />
            <small>YOUR COMMUNITY</small>
            <h3>{name}</h3>
            <p>
              {i
                ? 'Waterfront performance and live music'
                : 'An ensemble. A stage. A place to return.'}
            </p>
            <button
              className="mj-portal-enter"
              onClick={() => openTheater(name)}
            >
              Visit {name} <ArrowUpRight size={18} />
            </button>
            <div className="mj-portal-links">
              {[
                { label: 'Events', screen: 'events', icon: Drama },
                { label: 'Calendar', screen: 'calendar', icon: CalendarDays },
                { label: 'People', screen: 'people', icon: Users },
              ].map((link) => (
                <button
                  key={link.label}
                  onClick={() => {
                    setTheaterName(name)
                    setScreen(link.screen as Screen)
                  }}
                >
                  <link.icon size={19} />
                  {link.label}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
  function home() {
    if (variant === 'B')
      return (
        <>
          <div className="mj-daybook-layout">
            <section>
              <h2>Your week, one commitment at a time</h2>
              <div className="mj-home-b">
                <div className="mj-day">
                  <strong>Tuesday, September 29 · proposed</strong>
                  {commitments}
                </div>
                {isAccepted && (
                  <>
                    <div className="mj-day">
                      <strong>Friday, October 2 · confirmed</strong>
                      <div className="mj-timeline-call">
                        <EventArt id="tempest" compact />
                        <div>
                          <h3>The Tempest · Performance</h3>
                          <p>7 pm · Lantern Theater · Required Call</p>
                          {action('Enter Event', 'event')}
                        </div>
                      </div>
                    </div>
                    {persona === 'multi' && (
                      <div className="mj-day">
                        <strong>Friday, October 23 · confirmed</strong>
                        <div className="mj-timeline-call">
                          <EventArt id="bluebird" compact />
                          <div>
                            <h3>Bluebird Cabaret · Performance</h3>
                            <p>7:30 pm · Harbor Stage · Required Call</p>
                            <button
                              className="mj-link"
                              onClick={() => openEvent('bluebird')}
                            >
                              Enter Event →
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
            <aside>
              {portals}
              {shared}
            </aside>
          </div>
          {shows}
        </>
      )
    if (variant === 'C')
      return (
        <>
          <div className="mj-home-c">
            <div>
              {portals}
              {shows}
            </div>
            <aside>
              {commitments}
              {isAccepted && schedule}
              {shared}
            </aside>
          </div>
        </>
      )
    return (
      <>
        <div className="mj-priority-layout">
          <div>
            {commitments}
            {isAccepted && schedule}
            {shared}
          </div>
          <aside>{portals}</aside>
        </div>
        {shows}
      </>
    )
  }
  function theater() {
    return (
      <>
        <div className="mj-theater-banner">
          <Building2 size={42} />
          <div>
            <small>YOUR THEATER</small>
            <h2>{theaterName}</h2>
            <p>
              {theaterName === 'Harbor Stage'
                ? 'Live music and new voices on the waterfront.'
                : 'Performance, practice, and the people who make it happen.'}
            </p>
          </div>
        </div>
        <section>
          <div className="mj-section-heading">
            <h2>Coming up</h2>
            {action('All Events', 'events')}
          </div>
          <div className="mj-poster-grid">
            {visibleEvents.map((item) => (
              <article className="mj-event-card" key={item.id}>
                <button
                  className="mj-poster-button"
                  onClick={() =>
                    openEvent(
                      item.id,
                      item.id === 'hours' ? 'public-event' : 'event',
                    )
                  }
                >
                  <EventArt id={item.id} />
                </button>
                <div className="mj-event-card-body">
                  <button
                    className="mj-link"
                    onClick={() =>
                      openEvent(
                        item.id,
                        item.id === 'hours' ? 'public-event' : 'event',
                      )
                    }
                  >
                    {item.id === 'hours' ? 'Explore Event' : 'Enter your Event'}{' '}
                    →
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
        <div className="mj-destination-grid">
          {[
            {
              label: 'Calendar',
              note: 'See what is booked and when',
              screen: 'calendar',
              icon: CalendarDays,
            },
            {
              label: 'Events',
              note: 'Find programs and your next action',
              screen: 'events',
              icon: Drama,
            },
            {
              label: 'People',
              note: 'Meet your Theater community',
              screen: 'people',
              icon: Users,
            },
          ].map((link) => (
            <button
              key={link.label}
              onClick={() => setScreen(link.screen as Screen)}
            >
              <link.icon size={28} />
              <strong>{link.label}</strong>
              <span>{link.note}</span>
            </button>
          ))}
        </div>
        {shared}
      </>
    )
  }
  function eventsScreen() {
    return (
      <>
        <p className="mj-page-intro">
          Explore {theaterName}’s Events. Your participation and next response
          appear with each program.
        </p>
        <div className="mj-portfolio">
          {visibleEvents.map((item) => (
            <article key={item.id} className="mj-portfolio-event">
              <EventArt id={item.id} />
              <div>
                <span className="mj-tag mj-confirmed">Published</span>
                <h2>{item.title}</h2>
                <p>{item.subtitle}</p>
                <p>
                  {item.dates} · {item.theater}
                </p>
                {item.id === 'tempest' && isAccepted ? (
                  <div className="mj-inline-response">
                    <b>Your next action · Rehearsal availability</b>
                    <p>Sep 29 · 6–8 pm · tentative Candidate Slot</p>
                    {availabilityButtons}
                    <small>Your response: {availability}</small>
                  </div>
                ) : (
                  <p>
                    {item.id === 'bluebird' && isAccepted
                      ? 'You are called · Oct 23, 7:30 pm'
                      : 'Published program · open to discover'}
                  </p>
                )}
                <button
                  className="mj-link"
                  onClick={() =>
                    openEvent(
                      item.id,
                      item.id === 'hours' ? 'public-event' : 'event',
                    )
                  }
                >
                  {item.id === 'hours' ? 'Explore Event' : 'Open Event'} →
                </button>
              </div>
            </article>
          ))}
        </div>
      </>
    )
  }
  function calendarScreen() {
    const harbor = theaterName === 'Harbor Stage'
    const days = harbor
      ? ['Mon 19', 'Tue 20', 'Wed 21', 'Thu 22', 'Fri 23', 'Sat 24', 'Sun 25']
      : ['Mon 28', 'Tue 29', 'Wed 30', 'Thu 1', 'Fri 2', 'Sat 3', 'Sun 4']
    return (
      <>
        <div className="mj-calendar-toolbar">
          <div>
            <h2>{harbor ? 'October 19–25' : 'September 28 – October 4'}</h2>
            <p>{theaterName} · Primary Venue</p>
          </div>
          <div className="mj-calendar-legend">
            <span>● Confirmed</span>
            <span>◌ Tentative hold</span>
            <span>▧ Unavailable</span>
          </div>
        </div>
        <div className="mj-calendar-scroll">
          <div className="mj-calendar-grid">
            {days.map((day, i) => (
              <div className="mj-calendar-day" key={day}>
                <strong>{day}</strong>
                <div className="mj-calendar-space">
                  {!harbor && i === 1 ? (
                    <button
                      className="mj-booking mj-hold"
                      onClick={() => openEvent('tempest')}
                    >
                      <small>6–8 PM · TENTATIVE HOLD</small>
                      <b>The Tempest</b>
                      <span>Rehearsal</span>
                    </button>
                  ) : i === 4 || (!harbor && i > 4) ? (
                    <button
                      className="mj-booking"
                      onClick={() => openEvent(harbor ? 'bluebird' : 'tempest')}
                    >
                      <small>{harbor ? '7:30 PM' : '7 PM'} · CONFIRMED</small>
                      <b>{harbor ? 'Bluebird Cabaret' : 'The Tempest'}</b>
                      <span>Performance</span>
                    </button>
                  ) : i === 2 ? (
                    <div className="mj-booking mj-block">
                      <small>2–5 PM</small>
                      <b>Venue unavailable</b>
                      <span>Schedule Block</span>
                    </div>
                  ) : (
                    <span className="mj-free">No bookings</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="mj-muted">
          Time and venue occupancy. Open an Event for personal Calls and
          availability responses. Tentative holds are not confirmed bookings.
        </p>
      </>
    )
  }
  function peopleScreen() {
    return (
      <>
        <div className="mj-directory-toolbar">
          <p>Find collaborators at {theaterName}.</p>
          <label>
            Search people
            <input
              value={peopleSearch}
              onChange={(e) => setPeopleSearch(e.target.value)}
              placeholder="Name or interest"
            />
          </label>
        </div>
        <div className="mj-people-grid">
          {peopleFixtures
            .map((person, i) => ({ person, i }))
            .filter(({ person }) =>
              `${person.name} ${person.detail}`
                .toLowerCase()
                .includes(peopleSearch.toLowerCase()),
            )
            .map(({ person, i }) => (
              <button
                className="mj-person-card"
                key={person.name}
                onClick={() => {
                  setPersonIndex(i)
                  setScreen('profile')
                }}
              >
                <Avatar index={i} />
                <h2>{person.name}</h2>
                <span>{person.role}</span>
                <p>{person.detail}</p>
                <small>View profile →</small>
              </button>
            ))}
        </div>
        <p className="mj-muted">
          Illustrated placeholder avatars. Interests and profile details are
          shared by each person’s choice.
        </p>
      </>
    )
  }

  function eventScreen() {
    if (eventId !== 'tempest')
      return (
        <>
          <div className="mj-event-hero">
            <EventArt id={eventId} />
            <div>
              <small>{selectedEvent.theater}</small>
              <h2>{selectedEvent.title}</h2>
              <p>{selectedEvent.subtitle}</p>
              <p>{selectedEvent.dates} · Published</p>
            </div>
          </div>
          {card(
            'Your Call',
            <>
              <span className="mj-tag mj-confirmed">
                Confirmed · Required Call
              </span>
              <h3>Friday, October 23 · 7:30 pm</h3>
              <p>Harbor Stage · Primary Venue</p>
            </>,
          )}
          <p className="mj-muted">
            This fixture explores your personal schedule across Theaters.
          </p>
        </>
      )

    if (persona === 'pending')
      return card(
        'Invitation context only',
        <>
          <p>
            The Tempest · Lantern Theater · invited by Maya as Cast. Candidate
            Slots, Calls, team, and conversation are unavailable before
            acceptance.
          </p>
          {action('Return to invitation', 'home')}
        </>,
      )
    if (persona === 'former')
      return card(
        'The Tempest · participation history',
        <>
          <p>
            Your Cast relationship ended. Earlier Event context remains
            readable, while new team plans and conversation are unavailable.
          </p>
          {action('Read participation-period conversation', 'conversation')}
        </>,
      )
    return (
      <>
        <div className="mj-event-hero">
          <EventArt id="tempest" />
          <div>
            <small>LANTERN THEATER · YOUR EVENT</small>
            <h2>The Tempest</h2>
            <p>A storm. An island. A second chance.</p>
            <div className="mj-team-strip">
              {[0, 1, 2, 3].map((i) => (
                <button
                  key={i}
                  onClick={() => {
                    setPersonIndex(i)
                    setScreen('profile')
                  }}
                >
                  <Avatar index={i} />
                </button>
              ))}
              <span>Your collaborators</span>
            </div>
          </div>
        </div>
        <div className="mj-home-a">
          <div>
            {card(
              'Schedule & your responses',
              <>
                <p>
                  Lantern Theater · your relationship:{' '}
                  {personas.find((item) => item.id === persona)?.relationship}
                </p>
                <div className="mj-item">
                  <span className="mj-tag">Tentative proposal</span>
                  <b>Tuesday Rehearsal · Sep 29, 6–8 pm</b>
                  <p>
                    Exclusive venue hold expires Sep 30. Your availability
                    response is separate from confirming a selected time and
                    from an approved Call.
                  </p>
                  <div className="mj-actions">
                    {['Available', 'Unavailable', 'Uncertain'].map((choice) => (
                      <button
                        key={choice}
                        onClick={() => setAvailability(choice)}
                        aria-pressed={availability === choice}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                  <small>Availability: {availability}</small>
                </div>
                <div className="mj-item">
                  <span className="mj-tag mj-confirmed">Confirmed Call</span>
                  <b>Friday performance · Oct 2, 7 pm</b>
                  <p>
                    Approved schedule · required Cast Call. A later conflict
                    needs a human decision; this commitment stays visible.
                  </p>
                </div>
              </>,
            )}
          </div>
          <aside>
            {card(
              'Event conversation',
              <>
                <p>
                  Coordinate with your collaborators, share notes, and ask
                  questions. Schedule responses remain with their Candidate
                  Slots.
                </p>
                {action('Open conversation', 'conversation')}
                {action('View public Event', 'public-event')}
              </>,
            )}
          </aside>
        </div>
      </>
    )
  }

  function conversation() {
    if (persona === 'pending')
      return card(
        'Conversation unavailable',
        <>
          <p>
            Accept the Cast invitation before team discussion becomes visible.
          </p>
          {action('View invitation', 'home')}
        </>,
      )
    return card(
      'The Tempest · conversation',
      <>
        <p>
          {persona === 'former'
            ? 'Read-only history from your participation period. Newer messages are hidden.'
            : isOperator
              ? 'Posting as Theater Operator · oversight'
              : 'Accepted Event team · coordination and community'}
        </p>
        {persona !== 'former' && (
          <div className="mj-item">
            <span className="mj-tag">Announcement · team notified</span>
            <div className="mj-person-line">
              <Avatar index={0} />
              <b>Maya · Director</b>
            </div>
            <p>
              Rehearsal packet is ready. Review the Rehearsal availability
              response in your Event workspace.
            </p>
          </div>
        )}
        {posts.slice(0, persona === 'former' ? 1 : undefined).map((post, i) => (
          <div className="mj-item" key={i}>
            <div className="mj-person-line">
              <Avatar index={i === 0 ? 0 : i === 1 ? 1 : 2} />
              <p>{post}</p>
            </div>
          </div>
        ))}
        {canPost && (
          <form
            onSubmit={(formEvent) => {
              formEvent.preventDefault()
              if (message.trim()) {
                setPosts([
                  ...posts,
                  `You · ${personas.find((item) => item.id === persona)?.relationship}: ${message.trim()}`,
                ])
                setMessage('')
              }
            }}
          >
            <label htmlFor="mj-message">Message the accepted team</label>
            <textarea
              id="mj-message"
              onChange={(changeEvent) => setMessage(changeEvent.target.value)}
              value={message}
            />
            <button type="submit">Post message</button>
          </form>
        )}
        <p className="mj-muted">
          Ordinary replies do not alert the whole team. Mentions and explicit
          announcements create targeted Notifications from domain events.
        </p>
        {action('Back to structured Event work', 'event')}
      </>,
    )
  }

  function profile(publicView = false) {
    return card(
      `${selectedPerson.name} · ${publicView ? 'public profile' : 'Member profile'}`,
      <>
        <div className="mj-profile-identity">
          <Avatar index={personIndex} />
          <div>
            <h2>{selectedPerson.name}</h2>
            <p>
              {theaterName} · {selectedPerson.role}
            </p>
            <p>{selectedPerson.detail}</p>
          </div>
        </div>
        <p>
          Biography and avatar are shared by this person’s choice. Contact
          details are not shared.
        </p>
        <div className="mj-item">
          <b>Public credit</b>
          <p>The Tempest · {selectedPerson.role} · published Event</p>
          <button
            className="mj-link"
            onClick={() => openEvent('tempest', 'public-event')}
          >
            View published Event →
          </button>
        </div>
        {!publicView && (
          <div className="mj-item">
            <b>Member-visible participation</b>
            <p>
              Profile participation shared with Theater Members by{' '}
              {selectedPerson.name}’s choice. Private or draft Event
              relationships are hidden.
            </p>
          </div>
        )}
        {action(
          publicView ? 'Back to public Event' : 'Back to People',
          publicView ? 'public-event' : 'people',
        )}
      </>,
    )
  }

  function content() {
    switch (screen) {
      case 'home':
        return home()
      case 'theater':
        return theater()
      case 'event':
        return eventScreen()
      case 'conversation':
        return conversation()
      case 'profile':
        return profile()
      case 'public-profile':
        return profile(true)
      case 'events':
        return eventsScreen()
      case 'people':
        return peopleScreen()
      case 'calendar':
        return calendarScreen()
      case 'operations':
        return isOperator
          ? card(
              'Theater Operations',
              <>
                <div className="mj-item">
                  <span className="mj-tag">Work Queue · Theater Operator</span>
                  <b>Review Rehearsal Proposal Revision</b>
                  <p>
                    Required Cast confirmation is missing; hold expires
                    tomorrow. Decision occurs in the authorized workflow.
                  </p>
                  {action('Open Event workspace', 'event')}
                </div>
                <div className="mj-item">
                  <b>Operational Exception</b>
                  <p>
                    Venue pressure on Fringe weekend · watch and coordinate.
                  </p>
                </div>
              </>,
            )
          : card(
              'Operations require Theater authority',
              <>{action('Return to Theater', 'theater')}</>,
            )
      case 'public-theater':
        return (
          <>
            <div className="mj-theater-banner">
              <Building2 size={42} />
              <div>
                <small>PUBLIC THEATER</small>
                <h2>{theaterName}</h2>
                <p>Discover the performances coming to our stage.</p>
              </div>
            </div>
            <div className="mj-poster-grid">
              {eventFixtures
                .filter((item) => item.theater === theaterName)
                .map((item) => (
                  <button
                    className="mj-poster-button"
                    key={item.id}
                    onClick={() => openEvent(item.id, 'public-event')}
                    aria-label={`Explore ${item.title}`}
                  >
                    <EventArt id={item.id} />
                  </button>
                ))}
            </div>
            {action(`Visit ${theaterName} as a Member`, 'theater')}
          </>
        )
      case 'public-event':
        return (
          <>
            <div className="mj-event-hero">
              <EventArt id={eventId} />
              <div>
                <small>{selectedEvent.theater} · PUBLIC EVENT</small>
                <h2>{selectedEvent.title}</h2>
                <p>{selectedEvent.subtitle}</p>
                <h3>{selectedEvent.dates} · 2026</h3>
                <p>Published performance program</p>
              </div>
            </div>
            {card(
              'Meet the collaborators',
              <>
                <div className="mj-person-line">
                  <Avatar index={0} />
                  <div>
                    <b>Maya Chen · Director</b>
                    <button
                      className="mj-link"
                      onClick={() => {
                        setPersonIndex(0)
                        setScreen('public-profile')
                      }}
                    >
                      View public profile →
                    </button>
                  </div>
                </div>
              </>,
            )}
            {action('Back to public Theater', 'public-theater')}
            {persona !== 'pending' && eventId !== 'hours' && (
              <button className="mj-link" onClick={() => setScreen('event')}>
                Open my Event workspace →
              </button>
            )}
          </>
        )
    }
  }

  return (
    <div className="mj-prototype">
      <header className="mj-top">
        <div>
          <small>STA-64 · PROTOTYPE · REVISION 2</small>
          <h1>Member home → Event collaboration</h1>
          <p>
            Personal Home, distinct destinations, visual Events. No live data or
            production behavior.
          </p>
        </div>
        <div className="mj-controls">
          <label>
            Scenario
            <select
              value={persona}
              onChange={(changeEvent) => {
                setPersona(changeEvent.target.value as Persona)
                setScreen('home')
                setTheaterName('Lantern Theater')
              }}
            >
              {personas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => setPhone(!phone)}>
            {phone ? 'Desktop width' : 'Phone width'}
          </button>
        </div>
      </header>
      <div
        className={`mj-stage mj-${variant.toLowerCase()} ${phone ? 'mj-phone' : ''}`}
      >
        <div className="mj-app">
          <div className="mj-appbar">
            <b>STAGECOM</b>
            <button
              aria-current={screen === 'home' ? 'page' : undefined}
              onClick={() => go('home')}
            >
              Home
            </button>
            <div className="mj-person-line">
              <Avatar index={2} />
              <span>Alex</span>
            </div>
          </div>
          <div className="mj-breadcrumb">
            {screen === 'home'
              ? 'Home · your personal Callsheet'
              : screen === 'theater'
                ? theaterName
                : `${screen.startsWith('public') ? 'Public · ' : ''}${theaterName} / ${labels[screen]}`}
          </div>
          {!screen.startsWith('public') && screen !== 'home' && (
            <nav aria-label="Theater navigation" className="mj-nav">
              <button
                aria-current={screen === 'theater' ? 'page' : undefined}
                onClick={() => go('theater')}
              >
                {theaterName}
              </button>
              <button
                aria-current={screen === 'calendar' ? 'page' : undefined}
                onClick={() => go('calendar')}
              >
                Calendar
              </button>
              <button
                aria-current={
                  screen === 'events' ||
                  screen === 'event' ||
                  screen === 'conversation'
                    ? 'page'
                    : undefined
                }
                onClick={() => go('events')}
              >
                Events
              </button>
              <button
                aria-current={screen === 'people' ? 'page' : undefined}
                onClick={() => go('people')}
              >
                People
              </button>
              {isOperator && (
                <button onClick={() => go('operations')}>Operations</button>
              )}
            </nav>
          )}
          <main>
            <div className="mj-heading">
              <div>
                <small>
                  {screen === 'home' ? 'YOUR CALLSHEET' : theaterName}
                </small>
                <h1>
                  {screen === 'home'
                    ? 'Hello, Alex.'
                    : screen === 'theater'
                      ? theaterName
                      : labels[screen]}
                </h1>
                {screen === 'home' && (
                  <p>
                    Your next response. Your next Call. Your next discovery.
                  </p>
                )}
              </div>
            </div>
            {content()}
          </main>
        </div>
      </div>
      <aside className="mj-state" aria-label="Prototype state">
        <b>Visible state</b>
        <span>
          Layout {variant} ·{' '}
          {variants.find((item) => item.id === variant)?.name}
        </span>
        <span>
          {personas.find((item) => item.id === persona)?.name} ·{' '}
          {labels[screen]}
        </span>
        <span>
          Scope:{' '}
          {screen === 'home' ? 'Personal · all your Theaters' : theaterName} ·
          Event: {selectedEvent.title}
        </span>
        <span>
          Invitation: {invite} · Availability: {availability} · Posts:{' '}
          {posts.length}
        </span>
      </aside>
      {import.meta.env.DEV && (
        <div className="mj-switcher" aria-label="Prototype layout switcher">
          <button
            aria-label="Previous layout"
            onClick={() =>
              setVariant(
                variants[
                  (variants.findIndex((item) => item.id === variant) + 2) % 3
                ].id,
              )
            }
          >
            ←
          </button>
          <span>
            {variant} — {variants.find((item) => item.id === variant)?.name}
            <small>{variants.find((item) => item.id === variant)?.note}</small>
          </span>
          <button
            aria-label="Next layout"
            onClick={() =>
              setVariant(
                variants[
                  (variants.findIndex((item) => item.id === variant) + 1) % 3
                ].id,
              )
            }
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
