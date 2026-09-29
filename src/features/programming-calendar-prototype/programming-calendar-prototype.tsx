// STA-63 THROWAWAY: compare month, resource week, and daybook plus a guarded move.
// Fictional fixture; no database, authorization service, or real Notifications.
import { useEffect, useRef, useState } from 'react'

import './programming-calendar-prototype.css'

type Variant = 'A' | 'B' | 'C'
type Persona = 'member' | 'cast' | 'leader' | 'operator'
type Kind =
  | 'Performance'
  | 'Rehearsal'
  | 'Practice'
  | 'Workshop'
  | 'Class'
  | 'Schedule Block'
  | 'Independent shift'
type Item = {
  id: string
  day: number
  endDay?: number
  start: number
  end: number
  title: string
  group?: string
  kind: Kind
  resource: 'Primary Venue' | 'Offsite'
  status: 'Confirmed' | 'Tentative'
  contact: string
  event?: string
  published?: boolean
}
type Move = {
  itemId: string
  day: number
  start: number
  end: number
  phase: 'draft' | 'held' | 'submitted'
  hasHold: boolean
  confirmed: boolean
}
const layouts: { id: Variant; label: string; question: string }[] = [
  {
    id: 'A',
    label: 'Dense month',
    question:
      'Can you scan the full mix without hiding bookings behind “more”?',
  },
  {
    id: 'B',
    label: 'Resource week',
    question: 'Can you distinguish venue occupancy from offsite programming?',
  },
  {
    id: 'C',
    label: 'Daybook',
    question: 'Can you scan time, type, group, and contact on a phone?',
  },
]
const roles: { id: Persona; label: string }[] = [
  { id: 'member', label: 'Theater Member' },
  { id: 'cast', label: 'Cast Member · Ensemble A' },
  { id: 'leader', label: 'Producer · Ensemble A' },
  { id: 'operator', label: 'Theater Operator' },
]
function fixture(): Item[] {
  const items: Item[] = [
    {
      id: 'rehearsal-a',
      day: 3,
      start: 18,
      end: 21,
      title: 'Run-through',
      group: 'Ensemble A',
      kind: 'Rehearsal',
      resource: 'Primary Venue',
      status: 'Confirmed',
      contact: 'Booking contact A',
      event: 'Event A',
    },
    {
      id: 'blackout',
      day: 7,
      endDay: 10,
      start: 0,
      end: 24,
      title: 'Fringe blackout',
      kind: 'Schedule Block',
      resource: 'Primary Venue',
      status: 'Confirmed',
      contact: 'Booking contact C',
    },
    // The Sep 9 request is offsite: an exclusive venue hold cannot coexist with a blackout.
    {
      id: 'hold-c',
      day: 15,
      start: 18,
      end: 21,
      title: 'Scene work',
      group: 'Ensemble C',
      kind: 'Rehearsal',
      resource: 'Primary Venue',
      status: 'Tentative',
      contact: 'Booking contact D',
      event: 'Event C',
    },
    {
      id: 'rental',
      day: 17,
      start: 14,
      end: 22,
      title: 'Private rental · Ensemble E',
      kind: 'Schedule Block',
      resource: 'Primary Venue',
      status: 'Confirmed',
      contact: 'Booking contact E',
    },
    {
      id: 'maintenance',
      day: 24,
      start: 8,
      end: 16,
      title: 'Venue maintenance',
      kind: 'Schedule Block',
      resource: 'Primary Venue',
      status: 'Confirmed',
      contact: 'Booking contact C',
    },
    {
      id: 'shift',
      day: 28,
      start: 10,
      end: 12,
      title: 'Venue inventory',
      kind: 'Independent shift',
      resource: 'Primary Venue',
      status: 'Confirmed',
      contact: 'Booking contact C',
    },
  ]
  for (const day of [5, 6, 12, 13, 19, 20, 26, 27]) {
    const group = day < 7 ? 'A' : day < 14 ? 'B' : day < 21 ? 'C' : 'D'
    items.push({
      id: `performance-${day}`,
      day,
      start: 19,
      end: 22,
      title: `Program ${group}`,
      group: `Ensemble ${group}`,
      kind: 'Performance',
      resource: 'Primary Venue',
      status: 'Confirmed',
      contact: `Booking contact ${group}`,
      event: `Event ${group}`,
      published: true,
    })
    items.push({
      id: `workshop-${day}`,
      day,
      start: 11,
      end: 13,
      title: 'Movement workshop',
      group: 'Ensemble B',
      kind: 'Workshop',
      resource: 'Offsite',
      status: 'Confirmed',
      contact: 'Booking contact B',
    })
    items.push({
      id: `practice-${day}`,
      day,
      start: 15,
      end: 17,
      title: 'Open practice',
      group: 'Ensemble D',
      kind: 'Practice',
      resource: 'Offsite',
      status: 'Confirmed',
      contact: 'Booking contact D',
    })
  }
  for (const day of [1, 4, 8, 11, 18, 22, 25, 29])
    items.push({
      id: `class-${day}`,
      day,
      start: 10,
      end: 12,
      title: 'Class A',
      group: 'Ensemble F',
      kind: 'Class',
      resource: day >= 7 && day <= 10 ? 'Offsite' : 'Primary Venue',
      status: 'Confirmed',
      contact: 'Booking contact F',
    })
  for (const day of [2, 4, 9, 11, 14, 18, 21, 23, 25, 30])
    items.push({
      id: `rehearsal-${day}`,
      day,
      start: 18,
      end: 21,
      title: 'Fringe preparation',
      group: 'Ensemble C',
      kind: 'Rehearsal',
      resource: 'Offsite',
      status: 'Confirmed',
      contact: 'Booking contact D',
      event: 'Event C',
    })
  return items
}
const initialItems = fixture()
const time = (hour: number) => `${String(hour).padStart(2, '0')}:00`
const date = (day: number) => `Sep ${day}, 2026`
const slot = (item: { day: number; start: number; end: number }) =>
  `${date(item.day)} · ${time(item.start)}–${time(item.end)}`
const onDay = (item: Item, day: number) =>
  item.day <= day && (item.endDay ?? item.day) >= day
const sortItems = (items: Item[]) =>
  [...items].sort((a, b) => a.day - b.day || a.start - b.start)

export function ProgrammingCalendarPrototype({
  variant,
  onVariant,
  embedded = false,
  embeddedPersona,
  initialBooking,
  workspaceEvent,
  onOpenEvent,
  onBackToCalendar,
}: {
  variant: Variant
  onVariant: (variant: Variant) => void
  embedded?: boolean
  embeddedPersona?: Persona
  initialBooking?: string
  workspaceEvent?: string
  onOpenEvent?: (event: string, bookingId: string) => void
  onBackToCalendar?: () => void
}) {
  const [items, setItems] = useState(initialItems)
  const [persona, setPersona] = useState<Persona>('operator')
  useEffect(() => {
    if (embeddedPersona) setPersona(embeddedPersona)
  }, [embeddedPersona])
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    initialBooking && initialItems.some((item) => item.id === initialBooking)
      ? initialBooking
      : workspaceEvent
        ? (initialItems.find((item) => item.event === workspaceEvent)?.id ??
          null)
        : null,
  )
  useEffect(() => {
    setSelectedId(
      initialBooking && initialItems.some((item) => item.id === initialBooking)
        ? initialBooking
        : workspaceEvent
          ? (initialItems.find((item) => item.event === workspaceEvent)?.id ??
            null)
          : null,
    )
  }, [initialBooking, workspaceEvent])
  useEffect(() => {
    const syncBooking = () => {
      const bookingId = new URL(window.location.href).searchParams.get(
        'booking',
      )
      setSelectedId(
        initialItems.some((item) => item.id === bookingId) ? bookingId : null,
      )
    }
    window.addEventListener('popstate', syncBooking)
    return () => window.removeEventListener('popstate', syncBooking)
  }, [])
  const [move, setMove] = useState<Move | null>(null)
  const [week, setWeek] = useState(0)
  const [phone, setPhone] = useState(false)
  const [filter, setFilter] = useState('All activity')
  const [history, setHistory] = useState<string[]>([])
  const [atRisk, setAtRisk] = useState<string[]>([])
  const [message, setMessage] = useState(
    'Select Run-through on Sep 3 to explore a Rehearsal move, or Program A on Sep 5 for a Performance.',
  )
  const lastTrigger = useRef<string | null>(null)
  const calendarScroll = useRef(0)
  const selected = items.find((item) => item.id === selectedId)
  const movingItem = items.find((item) => item.id === move?.itemId)
  const isOperator = persona === 'operator'
  const isLeader = persona === 'leader'
  const isTeam = selected?.event === 'Event A' && persona !== 'member'
  const canPlan =
    !!selected &&
    selected.event === 'Event A' &&
    (isOperator || isLeader) &&
    selected.status === 'Confirmed'
  const canInspect = isOperator || isTeam
  const conflicts =
    move && movingItem
      ? items.filter(
          (item) =>
            item.id !== move.itemId &&
            item.resource === 'Primary Venue' &&
            onDay(item, move.day) &&
            move.start < item.end + 0.5 &&
            move.end + 0.5 > item.start,
        )
      : []
  const validTime = !!move && move.start < move.end
  const requiredReady = movingItem?.kind !== 'Rehearsal' || !!move?.confirmed
  const proposed: Item | null =
    move && movingItem && move.hasHold
      ? {
          ...movingItem,
          id: 'replacement-hold',
          day: move.day,
          endDay: undefined,
          start: move.start,
          end: move.end,
          status: 'Tentative',
          title: `Replacement · ${movingItem.title}`,
        }
      : null
  const sharedItems = proposed ? [...items, proposed] : items
  const visibleItems = sortItems(
    sharedItems.filter(
      (item) =>
        filter === 'All activity' ||
        (filter === 'Primary Venue'
          ? item.resource === 'Primary Venue'
          : item.kind === filter),
    ),
  )
  const layout = layouts.find((item) => item.id === variant)!
  function cycle(direction: number) {
    onVariant(
      layouts[
        (layouts.findIndex((item) => item.id === variant) +
          direction +
          layouts.length) %
          layouts.length
      ].id,
    )
  }
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (
        selectedId ||
        event.altKey ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey
      )
        return
      const target = event.target
      if (
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, [contenteditable="true"]')
      )
        return
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        cycle(event.key === 'ArrowLeft' ? -1 : 1)
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })
  function record(text: string) {
    setHistory((previous) => [...previous, text])
    setMessage(text)
  }
  function open(item: Item) {
    const id = item.id === 'replacement-hold' ? move?.itemId : item.id
    if (!id) return
    if (embedded && item.event && onOpenEvent) {
      lastTrigger.current = id
      setSelectedId(id)
      onOpenEvent(item.event, id)
      return
    }
    if (!selectedId) calendarScroll.current = window.scrollY
    lastTrigger.current = id
    const url = new URL(window.location.href)
    url.searchParams.set('booking', id)
    window.history.pushState(null, '', url)
    setSelectedId(id)
    window.scrollTo(0, 0)
  }
  function closeDetail() {
    const url = new URL(window.location.href)
    url.searchParams.delete('booking')
    if (workspaceEvent) {
      url.searchParams.set('screen', 'calendar')
      url.searchParams.delete('eventId')
    }
    window.history.pushState(null, '', url)
    setSelectedId(null)
    if (workspaceEvent) onBackToCalendar?.()
    requestAnimationFrame(() => {
      window.scrollTo(0, calendarScroll.current)
      document
        .querySelector<HTMLButtonElement>(
          `[data-booking-id="${lastTrigger.current}"]`,
        )
        ?.focus({ preventScroll: true })
    })
  }
  function editMove(next: Partial<Move>) {
    if (move?.phase === 'draft') setMove({ ...move, ...next, confirmed: false })
  }
  function reset() {
    setItems(fixture())
    setMove(null)
    setSelectedId(null)
    const url = new URL(window.location.href)
    url.searchParams.delete('booking')
    window.history.replaceState(null, '', url)
    setHistory([])
    setAtRisk([])
    setMessage('Fixture reset. No booking changes are saved.')
    setWeek(0)
  }
  function approve() {
    if (
      !move ||
      !movingItem ||
      !isOperator ||
      move.phase !== 'submitted' ||
      conflicts.length ||
      !validTime ||
      !requiredReady
    )
      return
    const oldSlot = slot(movingItem)
    setItems((previous) =>
      previous.map((item) =>
        item.id === move.itemId
          ? { ...item, day: move.day, start: move.start, end: move.end }
          : item,
      ),
    )
    record(
      `Approved move: ${movingItem.title} → ${slot(move)}. Released ${oldSlot}; replacement hold removed. Targeted move Notifications would follow a recorded domain event.`,
    )
    setMove(null)
  }
  function booking(item: Item, showContact = false) {
    return (
      <div className="pc-booking-wrap" key={`${item.id}-${item.day}`}>
        <button
          className={`pc-booking ${item.status === 'Tentative' ? 'pc-tentative' : ''}`}
          data-kind={item.kind}
          data-booking-id={item.id}
          aria-describedby={`booking-preview-${item.id}`}
          onClick={() => open(item)}
        >
          <span className="pc-booking-time">
            {item.endDay
              ? 'All day · Sep 7–10'
              : `${time(item.start)}–${time(item.end)}`}
          </span>
          <strong>
            {item.title}
            {item.group && <span> · {item.group}</span>}
          </strong>
          <span>
            {item.kind} · {item.status}
            {atRisk.includes(item.id) ? ' · At risk' : ''}
          </span>
          <span>
            {item.resource === 'Offsite'
              ? 'Offsite · no venue use'
              : 'Primary Venue'}
          </span>
          {showContact && <span>Booking contact: {item.contact}</span>}
        </button>
        <div
          className="pc-hover-card"
          id={`booking-preview-${item.id}`}
          role="tooltip"
        >
          <strong>
            {item.title}
            {item.group ? ` · ${item.group}` : ''}
          </strong>
          <span>
            {item.kind} · {item.status}
          </span>
          <span>
            {item.endDay
              ? `Sep ${item.day}–${item.endDay}, all day`
              : slot(item)}
          </span>
          <span>
            {item.resource === 'Offsite'
              ? 'Offsite · no venue use'
              : item.resource}
          </span>
          <span>Booking contact: {item.contact}</span>
          <span>
            {item.event ? `Part of ${item.event}` : 'Standalone booking'}
          </span>
          <span>
            {item.published ? 'Published activity' : 'Not publicly published'}
          </span>
          {(isOperator || (item.event === 'Event A' && persona !== 'member')) &&
            item.kind === 'Performance' && (
              <span>Staffing: 2 accepted assignments</span>
            )}
          <small>
            Click or press Enter for the{' '}
            {item.event
              ? 'Event'
              : item.kind === 'Schedule Block'
                ? 'reservation'
                : 'activity'}{' '}
            page →
          </small>
        </div>
      </div>
    )
  }
  function VariantA() {
    return (
      <div className="pc-month" aria-label="September 2026 month">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div className="pc-weekday" key={day}>
            {day}
          </div>
        ))}
        {Array.from({ length: 35 }, (_, index) => {
          const day = index
          return day < 1 || day > 30 ? (
            <div key={index} className="pc-empty" />
          ) : (
            <section key={day} className="pc-day" aria-label={date(day)}>
              <h3>
                {day}
                <span>
                  {visibleItems.filter((item) => onDay(item, day)).length} items
                </span>
              </h3>
              {visibleItems
                .filter((item) => onDay(item, day))
                .map((item) => booking(item))}
            </section>
          )
        })}
      </div>
    )
  }
  function VariantB() {
    const days = Array.from({ length: 7 }, (_, index) => week * 7 + index)
    return (
      <>
        <div className="pc-week-controls">
          <button disabled={week === 0} onClick={() => setWeek(week - 1)}>
            ← Previous week
          </button>
          <strong>
            {week === 0
              ? 'Aug 31–Sep 6'
              : `Sep ${week * 7}–${Math.min(week * 7 + 6, 30)}`}
          </strong>
          <button disabled={week === 4} onClick={() => setWeek(week + 1)}>
            Next week →
          </button>
        </div>
        <div className="pc-week-scroll">
          <div className="pc-resource-week">
            <div className="pc-weekday">Resource</div>
            {days.map((day) => (
              <div className="pc-weekday" key={day}>
                {day > 0 && day <= 30
                  ? date(day).replace(', 2026', '')
                  : 'Outside month'}
              </div>
            ))}
            {(['Primary Venue', 'Offsite'] as const).map((resource) => (
              <div className="pc-resource-row" key={resource}>
                <div className="pc-resource-label">
                  <strong>{resource}</strong>
                  <span>
                    {resource === 'Offsite'
                      ? 'No Primary Venue use'
                      : '30 min buffer each side'}
                  </span>
                </div>
                {days.map((day) => (
                  <section
                    className="pc-week-cell"
                    key={day}
                    aria-label={`${resource}, ${date(day)}`}
                  >
                    {visibleItems
                      .filter(
                        (item) =>
                          item.resource === resource && onDay(item, day),
                      )
                      .map((item) => booking(item))}
                  </section>
                ))}
              </div>
            ))}
          </div>
        </div>
      </>
    )
  }
  function VariantC() {
    return (
      <div className="pc-daybook">
        {Array.from({ length: 30 }, (_, index) => index + 1)
          .filter((day) => visibleItems.some((item) => onDay(item, day)))
          .map((day) => (
            <section className="pc-daybook-day" key={day}>
              <h3>{date(day)}</h3>
              <div>
                {visibleItems
                  .filter((item) => onDay(item, day))
                  .map((item) => (
                    <div className="pc-daybook-row" key={item.id}>
                      {booking(item, true)}
                    </div>
                  ))}
              </div>
            </section>
          ))}
      </div>
    )
  }
  function detailContent() {
    if (!selected) return null
    return (
      <>
        <div className="pc-detail-top">
          <p>
            {selected.event
              ? workspaceEvent
                ? 'Event workspace'
                : 'Event page'
              : selected.kind === 'Schedule Block'
                ? 'Reservation page'
                : 'Activity page'}{' '}
            · September calendar study
          </p>
          <button
            className="pc-close"
            onClick={closeDetail}
            aria-label="Back to Calendar"
          >
            ← Back to Calendar
          </button>
        </div>
        <h2>{selected.event ?? selected.title}</h2>
        <p className="pc-detail-subtitle">
          {selected.group ? `${selected.group} · ` : ''}
          {selected.event
            ? `Selected ${selected.kind}: ${selected.title}`
            : selected.kind}{' '}
          · {selected.status}
        </p>
        {history.length > 0 && canInspect && (
          <p className="pc-page-notice" role="status">
            {message}
          </p>
        )}
        <section className="pc-next-action">
          <h3>What can you do here?</h3>
          <p>
            {canPlan
              ? 'Review this booking and, if the time needs changing, prepare a replacement below. The current booking stays confirmed until approval.'
              : isTeam && selected.event === 'Event A'
                ? move?.itemId === selected.id && !move.confirmed
                  ? 'A proposed new time needs your response. Review the current commitment and the proposed time below.'
                  : 'Review your Event schedule and Call. This booking is currently confirmed.'
                : selected.kind === 'Schedule Block'
                  ? 'See when the venue is reserved and who the booking contact is. This fixture has no further action for your role.'
                  : 'Review the time and booking contact. There is no scheduling decision for you on this item.'}
          </p>
        </section>
        <div className="pc-facts">
          <p>
            <strong>{slot(selected)}</strong>
            {selected.endDay && ' through Sep 10'}
          </p>
          <p>
            {selected.resource}
            {selected.resource === 'Offsite'
              ? ' · no Primary Venue occupancy'
              : ' · 30-minute buffers'}
          </p>
          <p>Booking contact: {selected.contact}</p>
          <p>
            {selected.event
              ? `Belongs to ${selected.event}; no duplicate Event calendar entry.`
              : 'Standalone booking.'}
          </p>
          <p>
            {selected.published
              ? 'This activity is published. A move does not change Publication automatically.'
              : 'Member-visible activity. This activity has no public Publication.'}
          </p>
        </div>
        {selected.event && (
          <section className="pc-event-summary">
            <h3>Schedule for {selected.event}</h3>
            <p>
              Each activity has its own time and Publication status. Choose
              another booking to inspect it on this Event page.
            </p>
            <div className="pc-related">
              {sortItems(items.filter((item) => item.event === selected.event))
                .slice(0, 7)
                .map((item) => (
                  <button
                    key={item.id}
                    aria-current={item.id === selected.id ? 'page' : undefined}
                    onClick={() => open(item)}
                  >
                    <strong>{item.title}</strong>
                    <span>
                      {item.kind} · {slot(item)} · {item.status}
                    </span>
                  </button>
                ))}
            </div>
          </section>
        )}
        {!embedded && (
          <label className="pc-role-control">
            Explore another role
            <select
              value={persona}
              onChange={(event) => setPersona(event.target.value as Persona)}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {!canInspect && (
          <p className="pc-private">
            You can see the title, timing, type, resource, and booking contact.
            Cast, responses, private notes, and operational decisions are
            restricted.
          </p>
        )}
        {canInspect && (
          <>
            <section className="pc-team">
              <h3>{isOperator ? 'Operational detail' : 'Your Event team'}</h3>
              <p>
                {selected.event === 'Event A'
                  ? 'Cast A–D · 4 required; Cast E optional. Producer is separate from Cast.'
                  : 'Fixture team details are restricted to this Event’s participants and Operators.'}
              </p>
              {selected.kind === 'Performance' && (
                <p>
                  Staffing: 2 accepted assignments · front of house and
                  technical. These are attached to this Performance, not
                  duplicate shared bookings.
                </p>
              )}
              {selected.status === 'Tentative' && (
                <p>
                  Exclusive hold · expires Sep 14 at 17:00 (fictional deadline).
                  A hold is not Operational Approval.
                </p>
              )}
              {atRisk.includes(selected.id) && (
                <p className="pc-warning">
                  At risk: a required Cast Member became unavailable. The
                  confirmed booking remains; leaders and Operators must choose a
                  response.
                </p>
              )}
            </section>
          </>
        )}
        {canPlan && !move && (
          <button
            className="pc-primary"
            onClick={() => {
              setMove({
                itemId: selected.id,
                day: 16,
                start: 18,
                end: 21,
                phase: 'draft',
                hasHold: false,
                confirmed: false,
              })
              record(
                'Move draft opened. The current Confirmed Slot remains committed.',
              )
            }}
          >
            {isOperator
              ? 'Preview a move · Operator'
              : 'Prepare move revision · Producer'}
          </button>
        )}
        {canInspect && move && move.itemId === selected.id && (
          <section className="pc-move">
            <h3>
              Move preview ·{' '}
              {move.phase === 'draft'
                ? 'unheld candidate'
                : move.phase === 'held'
                  ? 'replacement hold'
                  : 'Proposal Revision awaiting review'}
            </h3>
            <p className="pc-preserved">
              Current commitment stays: {slot(selected)}
            </p>
            <fieldset
              disabled={move.phase !== 'draft' || (!isOperator && !isLeader)}
            >
              <legend>Replacement time · Primary Venue</legend>
              <div className="pc-move-inputs">
                <label>
                  September day
                  <select
                    value={move.day}
                    onChange={(event) =>
                      editMove({ day: Number(event.target.value) })
                    }
                  >
                    {Array.from({ length: 30 }, (_, index) => (
                      <option value={index + 1} key={index}>
                        {index + 1}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Start
                  <select
                    value={move.start}
                    onChange={(event) =>
                      editMove({ start: Number(event.target.value) })
                    }
                  >
                    {Array.from({ length: 24 }, (_, index) => (
                      <option value={index} key={index}>
                        {time(index)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  End
                  <select
                    value={move.end}
                    onChange={(event) =>
                      editMove({ end: Number(event.target.value) })
                    }
                  >
                    {Array.from({ length: 24 }, (_, index) => (
                      <option value={index + 1} key={index}>
                        {time(index + 1)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="pc-presets">
                <button onClick={() => editMove({ day: 9 })}>
                  Try blackout · Sep 9
                </button>
                <button onClick={() => editMove({ day: 15 })}>
                  Try existing hold · Sep 15
                </button>
                <button onClick={() => editMove({ day: 16 })}>
                  Try clear time · Sep 16
                </button>
              </div>
            </fieldset>
            <p>
              <strong>Candidate:</strong> {slot(move)}
            </p>
            {!validTime ? (
              <p className="pc-warning">End must be later than start.</p>
            ) : conflicts.length ? (
              <div className="pc-warning">
                <strong>Blocked by resource conflict</strong>
                {conflicts.map((item) => (
                  <p key={item.id}>
                    {item.title} · {item.status} ·{' '}
                    {item.endDay ? 'Sep 7–10, all day' : slot(item)}
                  </p>
                ))}
                <p>
                  Includes a 30-minute buffer. An Operator cannot bypass this
                  check.
                </p>
              </div>
            ) : (
              <p className="pc-clear">
                No Primary Venue conflict, including 30-minute buffers.
              </p>
            )}
            <section>
              <h4>Cast impact</h4>
              <p>
                Availability for this candidate:{' '}
                {move.confirmed ? '4 available' : '3 available, 1 uncertain'};
                optional Cast E unavailable. Prior responses do not confirm a
                changed time.
              </p>
              {selected.kind === 'Rehearsal' ? (
                <>
                  <p>
                    Required confirmations:{' '}
                    {move.confirmed
                      ? '4 of 4 · ready'
                      : '3 of 4 · Cast D missing'}
                    .{' '}
                    {move.confirmed
                      ? 'Selected time explicitly confirmed.'
                      : 'Submission is blocked until Cast D explicitly confirms.'}
                  </p>
                  {persona === 'cast' &&
                    !move.confirmed &&
                    move.phase !== 'submitted' && (
                      <button
                        onClick={() => {
                          setMove({ ...move, confirmed: true })
                          record(
                            `Cast D explicitly confirmed ${slot(move)}. Availability and confirmation are separate.`,
                          )
                        }}
                      >
                        Confirm selected time · Cast D
                      </button>
                    )}
                </>
              ) : (
                <p>
                  Performance review includes Cast availability and Minimum
                  Viable Cast (3); 3 available meets the fixture minimum.
                  Rehearsal-specific confirmation gates do not apply here.
                </p>
              )}
            </section>
            <section>
              <h4>Approval and consequences</h4>
              <ul>
                <li>
                  Producer prepares and submits a new Proposal Revision;
                  Operator reviews it.
                </li>
                <li>
                  Approval swaps commitments and releases the old venue slot
                  together.
                </li>
                <li>
                  Rejection, withdrawal, or hold expiry keeps the original
                  booking.
                </li>
                <li>
                  Calls keep their required/optional settings; changed time
                  needs fresh responses.
                </li>
                <li>
                  Publication remains a separate decision
                  {selected.published
                    ? '; public schedule reconciliation needs later specification'
                    : ''}
                  .
                </li>
                <li>
                  Targeted Notifications follow recorded scheduling domain
                  events.
                </li>
              </ul>
            </section>
            <div className="pc-actions">
              {isOperator && move.phase === 'draft' && (
                <button
                  disabled={!validTime || conflicts.length > 0}
                  onClick={() => {
                    setMove({ ...move, phase: 'held', hasHold: true })
                    record(
                      `Operator granted one replacement hold at ${slot(move)}. Current booking remains.`,
                    )
                  }}
                >
                  Grant replacement hold · Operator
                </button>
              )}
              {isLeader && move.phase !== 'submitted' && (
                <button
                  disabled={
                    !validTime || conflicts.length > 0 || !requiredReady
                  }
                  onClick={() => {
                    setMove({ ...move, phase: 'submitted' })
                    record(
                      'Producer submitted a new Proposal Revision. Original commitment remains pending review.',
                    )
                  }}
                >
                  Submit revision · Producer
                </button>
              )}
              {isOperator && move.phase === 'submitted' && (
                <>
                  <button
                    className="pc-primary"
                    disabled={
                      !validTime || conflicts.length > 0 || !requiredReady
                    }
                    onClick={approve}
                  >
                    Approve move · Operator
                  </button>
                  <button
                    onClick={() => {
                      setMove(null)
                      record(
                        'Revision rejected. Replacement hold released; original commitment retained.',
                      )
                    }}
                  >
                    Reject revision · Operator
                  </button>
                </>
              )}
              {isOperator && move.hasHold && (
                <button
                  onClick={() => {
                    setMove(null)
                    record(
                      'Replacement hold expired. Original commitment retained; no alternative promoted.',
                    )
                  }}
                >
                  Simulate hold expiry
                </button>
              )}
              {isLeader && (
                <button
                  onClick={() => {
                    setMove(null)
                    record(
                      'Producer withdrew the move. Replacement hold released; original commitment retained.',
                    )
                  }}
                >
                  Withdraw move · Producer
                </button>
              )}
            </div>
            <p className="pc-next">
              {move.phase === 'submitted'
                ? isOperator
                  ? 'Next: approve or reject this revision.'
                  : 'Next: switch to Theater Operator to review.'
                : !requiredReady
                  ? 'Next: switch to Cast Member (Cast D) to explicitly confirm, then Producer to submit.'
                  : 'Next: switch to Producer to submit the revision, then Operator to approve.'}
            </p>
          </section>
        )}
        {move && move.itemId !== selected.id && canPlan && (
          <p>
            Finish or withdraw the existing move before starting another in this
            prototype.
          </p>
        )}
        {canInspect &&
          !move &&
          selected.status === 'Confirmed' &&
          selected.event === 'Event A' &&
          !atRisk.includes(selected.id) && (
            <button
              className="pc-risk-button"
              onClick={() => {
                setAtRisk((previous) => [...previous, selected.id])
                record(
                  'Required Cast became unavailable. Confirmed time and venue remain; human resolution is needed.',
                )
              }}
            >
              Simulate required Cast becoming unavailable
            </button>
          )}
      </>
    )
  }
  return (
    <div
      className={`pc-prototype ${phone ? 'pc-phone' : ''} ${embedded ? 'pc-embedded' : ''}`}
    >
      {embedded ? (
        <div className="pc-context">
          <strong>
            {workspaceEvent
              ? `${workspaceEvent} workspace`
              : 'September 2026 calendar study'}
          </strong>
          <span>
            Fictional September schedule · separate from the October Event
            examples elsewhere in this journey.
          </span>
          {!workspaceEvent && (
            <button onClick={reset}>Reset calendar study</button>
          )}
        </div>
      ) : (
        <>
          <div className="pc-lab">
            <strong>STA-63 · Throwaway prototype</strong>
            <span>Fictional September 2026 · in-memory changes</span>
            <button onClick={reset}>Reset fixture</button>
            <button aria-pressed={phone} onClick={() => setPhone(!phone)}>
              Phone canvas
            </button>
          </div>
          <header className="pc-header">
            <div>
              <p>Stagecom / Lantern Theater</p>
              <h1>Theater Calendar</h1>
              <p>Programming, venue commitments, and tentative holds.</p>
            </div>
            <label>
              View as
              <select
                value={persona}
                onChange={(event) => setPersona(event.target.value as Persona)}
              >
                {roles.map((role) => (
                  <option value={role.id} key={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>
          </header>
        </>
      )}
      {!selected && (
        <div className="pc-content">
          {embedded && (
            <p className="pc-scope">
              Theater Calendar shows shared programming at Lantern Theater. Your
              personal Calls stay on Home; Operators use this view to check
              venue commitments and preview schedule changes.
            </p>
          )}
          <div className="pc-toolbar">
            <div>
              <h2>September 2026</h2>
              <p>
                {layout.label} · {initialItems.length} scheduled items
              </p>
            </div>
            {embedded && (
              <div
                className="pc-view-choice"
                role="group"
                aria-label="Calendar presentation"
              >
                <button
                  aria-pressed={variant === 'C'}
                  onClick={() => onVariant('C')}
                >
                  Daybook
                </button>
                <button
                  aria-pressed={variant === 'A'}
                  onClick={() => onVariant('A')}
                >
                  Dense month
                </button>
              </div>
            )}
            <label>
              Show
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                {[
                  'All activity',
                  'Primary Venue',
                  'Performance',
                  'Rehearsal',
                  'Practice',
                  'Workshop',
                  'Class',
                  'Schedule Block',
                  'Independent shift',
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="pc-question">{layout.question}</p>
          <div className="pc-legend">
            <span>Solid: Confirmed</span>
            <span>Dashed: Tentative exclusive hold</span>
            <span>Offsite: no venue occupancy</span>
            <span>Staffing stays with its activity</span>
          </div>
          <p className="pc-notice" role="status">
            {persona === 'member'
              ? 'Select an activity to see its timing, resource, and booking contact.'
              : message}
          </p>
          {variant === 'A'
            ? VariantA()
            : variant === 'B'
              ? VariantB()
              : VariantC()}
          <details className="pc-state">
            <summary>Prototype state and boundaries</summary>
            <p>
              Layout {variant}; viewer{' '}
              {roles.find((role) => role.id === persona)?.label}; {items.length}{' '}
              committed or held items. Candidate times without a hold stay out
              of the Calendar. Reload or Reset restores the fixture.
            </p>
            {(isOperator || isLeader) && (
              <>
                <pre>{JSON.stringify({ move, atRisk, history }, null, 2)}</pre>
                <p>
                  Assumptions to review: 30-minute venue buffers, scripted Cast
                  responses, and a simulated hold deadline. This is a design
                  exploration, not production authorization or a live scheduling
                  service.
                </p>
              </>
            )}
          </details>
        </div>
      )}
      {selected && (
        <article
          className="pc-detail-page"
          aria-label={
            selected.event ? `${selected.event} page` : `${selected.title} page`
          }
        >
          <div className="pc-detail pc-detail-inline">{detailContent()}</div>
        </article>
      )}
      {!embedded && import.meta.env.DEV && (
        <nav className="pc-switcher" aria-label="Prototype layout comparison">
          <button onClick={() => cycle(-1)} aria-label="Previous layout">
            ←
          </button>
          <span>
            {variant} · {layout.label}
          </span>
          <button onClick={() => cycle(1)} aria-label="Next layout">
            →
          </button>
        </nav>
      )}
    </div>
  )
}
