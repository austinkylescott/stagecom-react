/**
 * One contract-driven interaction prototype, switchable by `scenario`,
 * `surface`, and `viewport` on the dedicated dev route. STA-27 validates the
 * approved actor/state matrix rather than comparing alternative visual designs.
 */
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  ClipboardCheck,
  Info,
  LayoutDashboard,
  MapPin,
  Menu,
  ShieldCheck,
  Sparkles,
  Theater,
  UserRound,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import {
  operationalConditionClassifications,
  operationalConditions,
  operationalScenarios,
  operationalSurfaceIds,
} from '../scenario-contract'

import type {
  OperationalConditionClassification,
  OperationalConditionId,
  OperationalSurfaceId,
  ScenarioAction,
} from '../scenario-contract'

type SeededScenario = (typeof operationalScenarios)[number]

type ScenarioActionReference = {
  action: ScenarioAction
  focus: string
  key: string
}

const prototypeRoute = '/dev/operational-workspaces-prototype'

const surfaceLabels = {
  callsheet: 'Callsheet',
  'personal-calendar': 'My Calendar',
  'theater-operations': 'Theater Operations',
  'theater-events': 'Events',
  'theater-calendar': 'Calendar',
  'people-directory': 'People',
  'people-invitations': 'Invitations',
  'people-access-and-roles': 'Access & Roles',
  'settings-public-presence': 'Public Presence',
  'settings-event-policy': 'Event Policy',
  'settings-venue-and-calendar': 'Venue & Calendar',
  'settings-ownership-and-security': 'Ownership & Security',
  'event-overview': 'Overview',
  'event-schedule-and-plan': 'Schedule & Plan',
  'event-cast-and-team': 'Cast & Team',
  'event-review': 'Review',
  'event-public-page': 'Public Page',
  'event-history': 'History',
  'public-theater': 'Public Theater',
  'public-event': 'Public Event',
} satisfies Record<OperationalSurfaceId, string>

const classificationLabels = {
  'personal-commitment': 'Personal commitments',
  'work-queue': 'Work Queue',
  'operational-exception': 'Operational Exceptions',
  notification: 'Notifications',
  'calendar-occupancy': 'Calendar occupancy',
  'ordinary-information': 'Context',
} satisfies Record<OperationalConditionClassification, string>

const classificationDescriptions = {
  'personal-commitment': 'Expected from you because of a current relationship.',
  'work-queue': 'Shared decisions you are authorized to resolve.',
  'operational-exception':
    'Watch-only conditions; important, but not false tasks.',
  notification: 'Personal alerts. Dismissing one never changes shared state.',
  'calendar-occupancy':
    'Time and resource detail shaped by your relationships.',
  'ordinary-information': 'Useful orientation that does not demand attention.',
} satisfies Record<OperationalConditionClassification, string>

const theaterNavigation: readonly OperationalSurfaceId[] = [
  'theater-operations',
  'theater-events',
  'theater-calendar',
  'people-directory',
  'settings-public-presence',
]

const eventNavigation: readonly OperationalSurfaceId[] = [
  'event-overview',
  'event-schedule-and-plan',
  'event-cast-and-team',
  'event-review',
  'event-public-page',
  'event-history',
]

const defaultScenario = operationalScenarios[0]

function findScenario(value: unknown) {
  return (
    operationalScenarios.find((scenario) => scenario.id === value) ??
    defaultScenario
  )
}

function findSurface(value: unknown, scenario: SeededScenario) {
  const requestedSurface = operationalSurfaceIds.find(
    (surface) => surface === value,
  )

  if (
    requestedSurface &&
    getAllowedSurfaces(scenario).some((surface) => surface === requestedSurface)
  ) {
    return requestedSurface
  }

  return scenario.allowedStartingSurfaces[0]
}

function findViewport(value: unknown, scenario: SeededScenario) {
  if (value === 'phone' || value === 'desktop') {
    return value
  }

  return scenario.primaryViewport
}

export function validateOperationalPrototypeSearch(
  search: Record<string, unknown>,
) {
  const scenario = findScenario(search.scenario)

  return {
    focus: getFocusedAction(scenario, search.focus)?.focus,
    scenario: scenario.id,
    surface: findSurface(search.surface, scenario),
    viewport: findViewport(search.viewport, scenario),
  }
}

type PrototypeSearch = ReturnType<typeof validateOperationalPrototypeSearch>

type OperationalWorkspacesPrototypeProps = {
  search: PrototypeSearch
}

export function OperationalWorkspacesPrototype({
  search,
}: OperationalWorkspacesPrototypeProps) {
  const scenario = findScenario(search.scenario)
  const surface = findSurface(search.surface, scenario)
  const isPhone = search.viewport === 'phone'
  const [completedOutcomes, setCompletedOutcomes] = useState<
    Readonly<Partial<Record<string, string>>>
  >({})
  const [dismissedNotifications, setDismissedNotifications] = useState<
    readonly OperationalConditionId[]
  >([])

  const focusedAction = getFocusedAction(scenario, search.focus)
  const availableConditions = getConditionsForSurface(scenario, surface).filter(
    ({ classification, id }) =>
      classification !== 'notification' || !dismissedNotifications.includes(id),
  )

  function completeAction(key: string, outcome: string) {
    setCompletedOutcomes((current) => ({ ...current, [key]: outcome }))
  }

  function dismissNotification(id: OperationalConditionId) {
    setDismissedNotifications((current) =>
      current.includes(id) ? current : [...current, id],
    )
  }

  return (
    <main className="min-h-screen bg-[#e7dfd1] pb-10 text-[var(--sea-ink)]">
      {import.meta.env.DEV ? (
        <PrototypeControls scenario={scenario} search={search} />
      ) : null}

      <section
        aria-label={`${search.viewport} prototype preview`}
        className={cn(
          'mx-auto mt-5 overflow-hidden border border-black/20 bg-[var(--paper)] shadow-[0_24px_70px_rgba(38,49,48,0.24)] transition-[max-width] duration-200',
          isPhone ? 'max-w-[390px]' : 'max-w-[1280px]',
        )}
      >
        <PrototypeAppHeader isPhone={isPhone} scenario={scenario} />
        {surface === 'public-theater' || surface === 'public-event' ? (
          <PublicExperience
            isPhone={isPhone}
            scenario={scenario}
            search={search}
            surface={surface}
          />
        ) : (
          <AuthenticatedExperience
            availableConditions={availableConditions}
            completedOutcomes={completedOutcomes}
            dismissNotification={dismissNotification}
            focusedAction={focusedAction}
            isPhone={isPhone}
            scenario={scenario}
            search={search}
            surface={surface}
          />
        )}
      </section>

      {focusedAction ? (
        <ActionPanel
          actionReference={focusedAction}
          completeAction={completeAction}
          selectedOutcome={completedOutcomes[focusedAction.key]}
          scenario={scenario}
          search={search}
        />
      ) : null}
    </main>
  )
}

function PrototypeControls({
  scenario,
  search,
}: {
  scenario: SeededScenario
  search: PrototypeSearch
}) {
  const scenarioIndex = operationalScenarios.findIndex(
    (candidate) => candidate.id === scenario.id,
  )
  const previousScenario =
    operationalScenarios[
      (scenarioIndex - 1 + operationalScenarios.length) %
        operationalScenarios.length
    ]
  const nextScenario =
    operationalScenarios[(scenarioIndex + 1) % operationalScenarios.length]

  return (
    <header className="sticky top-0 z-40 border-b border-black/15 bg-[#263130] text-white shadow-lg">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-4 py-3">
        <div className="mr-auto min-w-[240px]">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#82bfb6]">
            Prototype · STA-27 · throwaway
          </p>
          <p className="mt-0.5 text-sm font-bold">
            Can people find and correctly classify their next action?
          </p>
        </div>

        <label className="grid min-w-0 gap-1 text-[0.65rem] font-black uppercase tracking-[0.14em] text-white/65">
          Seeded journey {scenarioIndex + 1} of {operationalScenarios.length}
          <span className="relative">
            <select
              aria-label="Seeded journey"
              className="h-9 max-w-[360px] appearance-none rounded-md border border-white/20 bg-white/10 pl-3 pr-9 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-[#82bfb6]"
              onChange={(event) => {
                const selectedScenario = findScenario(event.target.value)
                window.location.assign(
                  buildPrototypeHref({
                    ...search,
                    focus: undefined,
                    scenario: selectedScenario.id,
                    surface: selectedScenario.allowedStartingSurfaces[0],
                    viewport: selectedScenario.primaryViewport,
                  }),
                )
              }}
              value={scenario.id}
            >
              {operationalScenarios.map((candidate) => (
                <option
                  className="text-black"
                  key={candidate.id}
                  value={candidate.id}
                >
                  {candidate.title}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 size-4 text-white/65" />
          </span>
        </label>

        <div className="flex items-end gap-1">
          <PrototypeIconLink
            ariaLabel="Previous journey"
            scenario={previousScenario}
            search={search}
          >
            <ArrowLeft className="size-4" />
          </PrototypeIconLink>
          <PrototypeIconLink
            ariaLabel="Next journey"
            scenario={nextScenario}
            search={search}
          >
            <ArrowRight className="size-4" />
          </PrototypeIconLink>
        </div>

        <div className="flex rounded-md border border-white/20 bg-black/15 p-1">
          {(['phone', 'desktop'] as const).map((viewport) => (
            <Link
              className={cn(
                'rounded px-3 py-1.5 text-xs font-black capitalize no-underline',
                search.viewport === viewport
                  ? 'bg-[#82bfb6] text-[#163e3a]'
                  : 'text-white hover:bg-white/10',
              )}
              key={viewport}
              search={{ ...search, viewport }}
              to={prototypeRoute}
            >
              {viewport}
            </Link>
          ))}
        </div>
      </div>
    </header>
  )
}

function PrototypeIconLink({
  ariaLabel,
  children,
  scenario,
  search,
}: {
  ariaLabel: string
  children: React.ReactNode
  scenario: SeededScenario
  search: PrototypeSearch
}) {
  return (
    <Link
      aria-label={ariaLabel}
      className="grid size-9 place-items-center rounded-md border border-white/20 text-white no-underline hover:bg-white/10"
      search={{
        ...search,
        focus: undefined,
        scenario: scenario.id,
        surface: scenario.allowedStartingSurfaces[0],
        viewport: scenario.primaryViewport,
      }}
      to={prototypeRoute}
    >
      {children}
    </Link>
  )
}

function PrototypeAppHeader({
  isPhone,
  scenario,
}: {
  isPhone: boolean
  scenario: SeededScenario
}) {
  const isPublic = scenario.allowedStartingSurfaces.some(
    (startingSurface) => startingSurface === 'public-theater',
  )

  return (
    <header className="border-b border-[var(--line)] bg-[var(--paper-strong)]">
      <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6">
        <div className="grid size-9 place-items-center rounded-md border border-[var(--chip-line)] bg-[var(--theater-soft)] text-[var(--theater-ink)]">
          <Theater className="size-5" />
        </div>
        <span className="display-title text-2xl">Stagecom</span>
        {isPublic ? (
          <span className="ml-auto text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--sea-ink-soft)]">
            Public
          </span>
        ) : isPhone ? (
          <button
            aria-label="Open navigation"
            className="ml-auto grid size-10 place-items-center rounded-md border border-[var(--line)] bg-white"
          >
            <Menu className="size-5" />
          </button>
        ) : (
          <>
            <nav className="ml-6 flex items-center gap-1 text-sm font-extrabold">
              <span className="rounded-md bg-[var(--theater-soft)] px-3 py-2 text-[var(--theater-ink)]">
                Callsheet
              </span>
              <span className="px-3 py-2 text-[var(--sea-ink-soft)]">
                My Calendar
              </span>
            </nav>
            <div className="ml-auto flex items-center gap-2 rounded-full border border-[var(--line)] bg-white py-1 pl-1 pr-3 text-xs font-bold">
              <span className="grid size-7 place-items-center rounded-full bg-[var(--performer-soft)] text-[var(--performer-ink)]">
                <UserRound className="size-4" />
              </span>
              {scenario.relationshipLabels[0]}
            </div>
          </>
        )}
      </div>
    </header>
  )
}

function AuthenticatedExperience({
  availableConditions,
  completedOutcomes,
  dismissNotification,
  focusedAction,
  isPhone,
  scenario,
  search,
  surface,
}: {
  availableConditions: readonly SurfaceCondition[]
  completedOutcomes: Readonly<Partial<Record<string, string>>>
  dismissNotification: (id: OperationalConditionId) => void
  focusedAction?: ScenarioActionReference
  isPhone: boolean
  scenario: SeededScenario
  search: PrototypeSearch
  surface: OperationalSurfaceId
}) {
  const isTheaterSurface = theaterNavigation.includes(surface)
  const isEventSurface = eventNavigation.includes(surface)

  return (
    <div className={cn(!isPhone && 'grid grid-cols-[220px_minmax(0,1fr)]')}>
      <WorkspaceNavigation
        isPhone={isPhone}
        scenario={scenario}
        search={search}
        surface={surface}
      />
      <div className="min-w-0">
        {isTheaterSurface ? (
          <ScopeNavigation
            isPhone={isPhone}
            items={theaterNavigation}
            label="Lantern Theater"
            scenario={scenario}
            search={search}
            surface={surface}
          />
        ) : null}
        {isEventSurface ? (
          <ScopeNavigation
            isPhone={isPhone}
            items={eventNavigation}
            label="The Tempest"
            scenario={scenario}
            search={search}
            surface={surface}
          />
        ) : null}

        <div className={cn('p-4 sm:p-6', !isPhone && 'lg:p-8')}>
          <JourneyContext scenario={scenario} surface={surface} />
          <SurfaceContent
            availableConditions={availableConditions}
            completedOutcomes={completedOutcomes}
            dismissNotification={dismissNotification}
            focusedAction={focusedAction}
            isPhone={isPhone}
            scenario={scenario}
            search={search}
            surface={surface}
          />
        </div>
      </div>
    </div>
  )
}

function WorkspaceNavigation({
  isPhone,
  scenario,
  search,
  surface,
}: {
  isPhone: boolean
  scenario: SeededScenario
  search: PrototypeSearch
  surface: OperationalSurfaceId
}) {
  const hasTheaterScope = scenario.id !== 'authenticated-without-theater-scope'

  if (isPhone) {
    return (
      <nav
        aria-label="Personal workspace"
        className="flex gap-2 overflow-x-auto border-b border-[var(--line)] bg-white px-4 py-3"
      >
        <SurfaceLink
          current={surface}
          scenario={scenario}
          search={search}
          target="callsheet"
        />
        <SurfaceLink
          current={surface}
          scenario={scenario}
          search={search}
          target="personal-calendar"
        />
        {hasTheaterScope ? (
          scenario.relationshipLabels.some(
            (relationship) => relationship === 'Theater Operator',
          ) ? (
            <SurfaceLink
              current={surface}
              scenario={scenario}
              search={search}
              target="theater-operations"
            />
          ) : (
            <SurfaceLink
              current={surface}
              scenario={scenario}
              search={search}
              target="theater-events"
            />
          )
        ) : null}
      </nav>
    )
  }

  return (
    <aside className="border-r border-[var(--line)] bg-[#f5ecdc] p-4">
      <p className="px-3 text-[0.65rem] font-black uppercase tracking-[0.16em] text-[var(--sea-ink-soft)]">
        Personal
      </p>
      <nav className="mt-2 grid gap-1">
        <SurfaceLink
          current={surface}
          icon={<ClipboardCheck className="size-4" />}
          scenario={scenario}
          search={search}
          target="callsheet"
        />
        <SurfaceLink
          current={surface}
          icon={<CalendarDays className="size-4" />}
          scenario={scenario}
          search={search}
          target="personal-calendar"
        />
      </nav>
      {hasTheaterScope ? (
        <>
          <div className="my-5 border-t border-[var(--line)]" />
          <p className="px-3 text-[0.65rem] font-black uppercase tracking-[0.16em] text-[var(--sea-ink-soft)]">
            Lantern Theater
          </p>
          <nav className="mt-2 grid gap-1">
            {(scenario.relationshipLabels.some(
              (relationship) => relationship === 'Theater Operator',
            )
              ? theaterNavigation
              : ([
                  'theater-events',
                  'theater-calendar',
                  'people-directory',
                ] as const)
            ).map((target) => (
              <SurfaceLink
                current={surface}
                key={target}
                scenario={scenario}
                search={search}
                target={target}
              />
            ))}
          </nav>
        </>
      ) : null}
      <div className="mt-6 rounded-md border border-[var(--line)] bg-white/70 p-3">
        <p className="text-xs font-black text-[var(--sea-ink)]">Viewing as</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {scenario.relationshipLabels.map((relationship) => (
            <span
              className="rounded-full bg-[var(--performer-soft)] px-2 py-1 text-[0.65rem] font-extrabold text-[var(--performer-ink)]"
              key={relationship}
            >
              {relationship}
            </span>
          ))}
        </div>
      </div>
    </aside>
  )
}

function ScopeNavigation({
  isPhone,
  items,
  label,
  scenario,
  search,
  surface,
}: {
  isPhone: boolean
  items: readonly OperationalSurfaceId[]
  label: string
  scenario: SeededScenario
  search: PrototypeSearch
  surface: OperationalSurfaceId
}) {
  const allowedSurfaces = getAllowedSurfaces(scenario)

  return (
    <div className="border-b border-[var(--line)] bg-[var(--paper-strong)] px-4 py-3 sm:px-6">
      <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[var(--theater-ink)]">
        {label}
      </p>
      <nav
        aria-label={`${label} sections`}
        className={cn(
          'mt-2 flex gap-1 overflow-x-auto',
          !isPhone && 'flex-wrap',
        )}
      >
        {items
          .filter((target) =>
            allowedSurfaces.some((allowed) => allowed === target),
          )
          .map((target) => (
            <SurfaceLink
              current={surface}
              key={target}
              scenario={scenario}
              search={search}
              target={target}
            />
          ))}
      </nav>
    </div>
  )
}

function SurfaceLink({
  current,
  icon,
  scenario,
  search,
  target,
}: {
  current: OperationalSurfaceId
  icon?: React.ReactNode
  scenario: SeededScenario
  search: PrototypeSearch
  target: OperationalSurfaceId
}) {
  const active = current === target

  return (
    <Link
      className={cn(
        'flex min-h-9 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-extrabold no-underline transition',
        active
          ? 'bg-[var(--theater-soft)] text-[var(--theater-ink)]'
          : 'text-[var(--sea-ink-soft)] hover:bg-white hover:text-[var(--sea-ink)]',
      )}
      search={{
        ...search,
        focus: undefined,
        scenario: scenario.id,
        surface: target,
      }}
      to={prototypeRoute}
    >
      {icon}
      {surfaceLabels[target]}
    </Link>
  )
}

function JourneyContext({
  scenario,
  surface,
}: {
  scenario: SeededScenario
  surface: OperationalSurfaceId
}) {
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-center gap-2 text-[0.65rem] font-black uppercase tracking-[0.15em] text-[var(--theater-ink)]">
        <span>{surfaceLabels[surface]}</span>
        <span aria-hidden="true">/</span>
        <span>{scenario.primaryViewport} first</span>
      </div>
      <h1 className="display-title mt-2 text-3xl leading-tight sm:text-4xl">
        {getSurfaceTitle(surface)}
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--sea-ink-soft)]">
        {scenario.title}. Actions stay labeled by Theater, Event, and
        relationship—there is no role switcher.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {scenario.relevantScope.map((scope) => (
          <span
            className="rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-[0.65rem] font-bold text-[var(--sea-ink-soft)]"
            key={scope}
          >
            {scope}
          </span>
        ))}
      </div>
    </header>
  )
}

function SurfaceContent({
  availableConditions,
  completedOutcomes,
  dismissNotification,
  focusedAction,
  isPhone,
  scenario,
  search,
  surface,
}: {
  availableConditions: readonly SurfaceCondition[]
  completedOutcomes: Readonly<Partial<Record<string, string>>>
  dismissNotification: (id: OperationalConditionId) => void
  focusedAction?: ScenarioActionReference
  isPhone: boolean
  scenario: SeededScenario
  search: PrototypeSearch
  surface: OperationalSurfaceId
}) {
  const isCalendar =
    surface === 'personal-calendar' || surface === 'theater-calendar'
  const actions = getScenarioActionReferences(scenario)
  const relevantActions = actions.filter(
    ({ action }) =>
      action.destination === surface ||
      surface === scenario.allowedStartingSurfaces[0] ||
      scenario.navigationPath.some((pathSurface) => pathSurface === surface),
  )

  if (surface === 'callsheet') {
    return (
      <CallsheetSurface
        completedOutcomes={completedOutcomes}
        conditions={availableConditions}
        dismissNotification={dismissNotification}
        isPhone={isPhone}
        scenario={scenario}
        search={search}
      />
    )
  }

  if (surface === 'theater-operations') {
    return (
      <TheaterOperationsSurface
        conditions={availableConditions}
        isPhone={isPhone}
        scenario={scenario}
        search={search}
      />
    )
  }

  if (isCalendar) {
    return (
      <CalendarSurface
        conditions={availableConditions}
        isPhone={isPhone}
        personal={surface === 'personal-calendar'}
        scenario={scenario}
      />
    )
  }

  return (
    <div
      className={cn(
        'grid gap-5',
        !isPhone && 'lg:grid-cols-[minmax(0,1fr)_320px]',
      )}
    >
      <div className="grid gap-5">
        <EventStateSummary surface={surface} />
        <ConditionGroups
          conditions={availableConditions}
          dismissNotification={dismissNotification}
        />
      </div>
      <aside className="grid content-start gap-4">
        <ActionList
          actions={relevantActions}
          focusedAction={focusedAction}
          scenario={scenario}
          search={search}
          title="Available here"
        />
        <DisclosurePanel scenario={scenario} />
      </aside>
    </div>
  )
}

function CallsheetSurface({
  completedOutcomes,
  conditions,
  dismissNotification,
  isPhone,
  scenario,
  search,
}: {
  completedOutcomes: Readonly<Partial<Record<string, string>>>
  conditions: readonly SurfaceCondition[]
  dismissNotification: (id: OperationalConditionId) => void
  isPhone: boolean
  scenario: SeededScenario
  search: PrototypeSearch
}) {
  const personal = conditions.filter(
    ({ classification }) => classification === 'personal-commitment',
  )
  const queue = conditions.filter(
    ({ classification }) => classification === 'work-queue',
  )
  const notifications = conditions.filter(
    ({ classification }) => classification === 'notification',
  )
  const calendar = conditions.filter(
    ({ classification }) => classification === 'calendar-occupancy',
  )

  return (
    <div
      className={cn(
        'grid gap-5',
        !isPhone && 'lg:grid-cols-[minmax(0,1fr)_340px]',
      )}
    >
      <div className="grid content-start gap-5">
        <ConditionSection
          classification="personal-commitment"
          conditions={personal}
          empty="Nothing is waiting on you personally."
          prominent
          title="Personal commitments"
        />
        {queue.length > 0 ? (
          <ConditionSection
            classification="work-queue"
            conditions={queue}
            empty="No shared decisions are available."
            title="Shared Work Queue"
          />
        ) : null}
        <ActionList
          actions={getScenarioActionReferences(scenario)}
          completedOutcomes={completedOutcomes}
          scenario={scenario}
          search={search}
          title="Your next paths"
        />
      </div>
      <aside className="grid content-start gap-5">
        <UpcomingPanel
          calendar={calendar}
          scenario={scenario}
          search={search}
        />
        <ConditionSection
          classification="notification"
          conditions={notifications}
          dismissNotification={dismissNotification}
          empty="You are caught up."
          title="Notifications"
        />
        <DisclosurePanel scenario={scenario} />
      </aside>
    </div>
  )
}

function TheaterOperationsSurface({
  conditions,
  isPhone,
  scenario,
  search,
}: {
  conditions: readonly SurfaceCondition[]
  isPhone: boolean
  scenario: SeededScenario
  search: PrototypeSearch
}) {
  const queue = conditions.filter(
    ({ classification }) => classification === 'work-queue',
  )
  const exceptions = conditions.filter(
    ({ classification }) => classification === 'operational-exception',
  )
  const calendar = getScenarioConditions(scenario).filter(
    ({ classification }) => classification === 'calendar-occupancy',
  )

  return (
    <div className="grid gap-5">
      <div className={cn('grid gap-4', !isPhone && 'grid-cols-3')}>
        <Metric
          label="Open decisions"
          tone="event"
          value={String(queue.length)}
        />
        <Metric
          label="Watch-only exceptions"
          tone="performer"
          value={String(exceptions.length)}
        />
        <Metric label="Events this month" tone="theater" value="8" />
      </div>
      <div
        className={cn(
          'grid gap-5',
          !isPhone && 'lg:grid-cols-[minmax(0,1fr)_360px]',
        )}
      >
        <ConditionSection
          classification="work-queue"
          conditions={queue}
          empty="There is no resolvable shared work."
          prominent
          title="Work Queue"
        />
        <UpcomingPanel
          calendar={calendar}
          scenario={scenario}
          search={search}
        />
      </div>
      <ConditionSection
        classification="operational-exception"
        conditions={exceptions}
        empty="There are no watch-only exceptions."
        title="Operational Exceptions"
      />
      <EventPipeline />
    </div>
  )
}

function ConditionGroups({
  conditions,
  dismissNotification,
}: {
  conditions: readonly SurfaceCondition[]
  dismissNotification: (id: OperationalConditionId) => void
}) {
  const nonEmptyGroups = operationalConditionClassifications
    .map((classification) => ({
      classification,
      conditions: conditions.filter(
        (condition) => condition.classification === classification,
      ),
    }))
    .filter(({ conditions: groupedConditions }) => groupedConditions.length > 0)

  if (nonEmptyGroups.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[var(--line)] bg-white/60 p-8 text-center">
        <Check className="mx-auto size-6 text-[var(--success)]" />
        <p className="mt-3 font-extrabold">
          No attention state on this surface
        </p>
        <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
          Use the visible navigation or next actions to continue the journey.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-5">
      {nonEmptyGroups.map(
        ({ classification, conditions: groupedConditions }) => (
          <ConditionSection
            classification={classification}
            conditions={groupedConditions}
            dismissNotification={dismissNotification}
            key={classification}
            title={classificationLabels[classification]}
          />
        ),
      )}
    </div>
  )
}

function ConditionSection({
  classification,
  conditions,
  dismissNotification,
  empty,
  prominent = false,
  title,
}: {
  classification: OperationalConditionClassification
  conditions: readonly SurfaceCondition[]
  dismissNotification?: (id: OperationalConditionId) => void
  empty?: string
  prominent?: boolean
  title: string
}) {
  return (
    <section
      className={cn(
        'rounded-md border border-[var(--line)] bg-[var(--paper-strong)] p-4',
        prominent && 'shadow-[var(--shadow-hard-sm)]',
      )}
    >
      <div className="flex items-start gap-3">
        <ClassificationIcon classification={classification} />
        <div>
          <h2 className="text-base font-black">{title}</h2>
          <p className="mt-0.5 text-xs leading-5 text-[var(--sea-ink-soft)]">
            {classificationDescriptions[classification]}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        {conditions.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--line)] px-4 py-5 text-sm font-semibold text-[var(--sea-ink-soft)]">
            {empty ?? 'Nothing to show here.'}
          </p>
        ) : (
          conditions.map((condition) => (
            <ConditionCard
              condition={condition}
              dismissNotification={dismissNotification}
              key={condition.id}
            />
          ))
        )}
      </div>
    </section>
  )
}

function ConditionCard({
  condition,
  dismissNotification,
}: {
  condition: SurfaceCondition
  dismissNotification?: (id: OperationalConditionId) => void
}) {
  return (
    <article
      className={cn(
        'border-l-4 bg-white px-4 py-3',
        condition.classification === 'personal-commitment' &&
          'border-l-[var(--performer)]',
        condition.classification === 'work-queue' && 'border-l-[var(--event)]',
        condition.classification === 'operational-exception' &&
          'border-y border-r border-dashed border-y-[var(--performer)] border-r-[var(--performer)] border-l-[var(--performer)] bg-[var(--performer-soft)]/35',
        condition.classification === 'notification' &&
          'border-l-[var(--theater)] bg-[var(--theater-soft)]/45',
        condition.classification === 'calendar-occupancy' &&
          'border-l-[var(--theater-ink)]',
        condition.classification === 'ordinary-information' &&
          'border-l-[var(--sea-ink-soft)]/40',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.6rem] font-black uppercase tracking-[0.13em] text-[var(--sea-ink-soft)]">
              {classificationLabels[condition.classification]}
            </span>
            {condition.classification === 'work-queue' ? (
              <span className="rounded-full bg-[var(--event-soft)] px-2 py-0.5 text-[0.6rem] font-black text-[var(--event-ink)]">
                Resolvable
              </span>
            ) : null}
            {condition.classification === 'operational-exception' ? (
              <span className="rounded-full border border-[var(--performer)] px-2 py-0.5 text-[0.6rem] font-black text-[var(--performer-ink)]">
                Watch only
              </span>
            ) : null}
          </div>
          <h3 className="mt-1 text-sm font-extrabold">{condition.label}</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--sea-ink-soft)]">
            {condition.expectedResolution}
          </p>
        </div>
        {condition.classification === 'notification' && dismissNotification ? (
          <button
            aria-label={`Dismiss ${condition.label}`}
            className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-white"
            onClick={() => dismissNotification(condition.id)}
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
    </article>
  )
}

function ClassificationIcon({
  classification,
}: {
  classification: OperationalConditionClassification
}) {
  const iconClass = 'size-4'
  const icon = {
    'personal-commitment': <UserRound className={iconClass} />,
    'work-queue': <ClipboardCheck className={iconClass} />,
    'operational-exception': <AlertTriangle className={iconClass} />,
    notification: <Bell className={iconClass} />,
    'calendar-occupancy': <CalendarDays className={iconClass} />,
    'ordinary-information': <Info className={iconClass} />,
  }[classification]

  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-[var(--paper-muted)] text-[var(--sea-ink)]">
      {icon}
    </span>
  )
}

function ActionList({
  actions,
  completedOutcomes = {},
  focusedAction,
  scenario,
  search,
  title,
}: {
  actions: readonly ScenarioActionReference[]
  completedOutcomes?: Readonly<Partial<Record<string, string>>>
  focusedAction?: ScenarioActionReference
  scenario: SeededScenario
  search: PrototypeSearch
  title: string
}) {
  return (
    <section className="rounded-md border border-[var(--line)] bg-[var(--paper-strong)] p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-[var(--event-ink)]" />
        <h2 className="text-base font-black">{title}</h2>
      </div>
      <div className="mt-3 grid gap-2">
        {actions.map(({ action, focus, key }, index) => {
          const completed = completedOutcomes[key] !== undefined
          const active = focusedAction?.key === key

          return (
            <Link
              className={cn(
                'group flex items-start gap-3 rounded-md border px-3 py-3 no-underline transition',
                index === 0
                  ? 'border-[var(--event)] bg-[var(--event-soft)]/45 text-[var(--sea-ink)]'
                  : 'border-[var(--line)] bg-white text-[var(--sea-ink)] hover:border-[var(--theater)]',
                active && 'ring-2 ring-[var(--focus)]/30',
              )}
              key={key}
              search={{
                ...search,
                focus,
                scenario: scenario.id,
                surface: action.destination,
              }}
              to={prototypeRoute}
            >
              <span
                className={cn(
                  'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full',
                  completed
                    ? 'bg-[var(--success)] text-white'
                    : 'bg-[var(--paper-muted)] text-[var(--sea-ink)]',
                )}
              >
                {completed ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold leading-5">
                  {action.label}
                </span>
                <span className="mt-1 block text-[0.65rem] font-bold leading-4 text-[var(--sea-ink-soft)]">
                  {action.relationshipLabel}
                </span>
              </span>
              <ArrowRight className="mt-1 size-4 shrink-0 transition group-hover:translate-x-0.5" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function UpcomingPanel({
  calendar,
  scenario,
  search,
}: {
  calendar: readonly SurfaceCondition[]
  scenario: SeededScenario
  search: PrototypeSearch
}) {
  return (
    <section className="rounded-md border border-[var(--line)] bg-[var(--theater-soft)]/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[var(--theater-ink)]">
            Upcoming
          </p>
          <h2 className="mt-1 text-base font-black">My next calls</h2>
        </div>
        <CalendarDays className="size-5 text-[var(--theater-ink)]" />
      </div>
      <div className="mt-4 grid gap-3">
        {calendar.length > 0 ? (
          calendar.slice(0, 3).map((condition, index) => (
            <div
              className="flex gap-3 border-t border-[var(--line)] pt-3"
              key={condition.id}
            >
              <div className="w-10 shrink-0 text-center">
                <p className="text-[0.6rem] font-black uppercase text-[var(--performer-ink)]">
                  Aug
                </p>
                <p className="text-xl font-black">{21 + index * 2}</p>
              </div>
              <div>
                <p className="text-sm font-extrabold">{condition.label}</p>
                <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">
                  {index === 0
                    ? '6:30 PM · Primary Venue'
                    : '7:00 PM · Lantern Theater'}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-[var(--sea-ink-soft)]">
            No personal occupancy is inferred from this relationship.
          </p>
        )}
      </div>
      <Link
        className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold no-underline"
        search={{
          ...search,
          focus: undefined,
          scenario: scenario.id,
          surface: 'personal-calendar',
        }}
        to={prototypeRoute}
      >
        Open My Calendar <ArrowRight className="size-3.5" />
      </Link>
    </section>
  )
}

function CalendarSurface({
  conditions,
  isPhone,
  personal,
  scenario,
}: {
  conditions: readonly SurfaceCondition[]
  isPhone: boolean
  personal: boolean
  scenario: SeededScenario
}) {
  const disclosure = personal
    ? scenario.calendarDisclosure.personalCalendar
    : scenario.calendarDisclosure.theaterCalendar
  const occupancy = conditions.filter(
    ({ classification }) => classification === 'calendar-occupancy',
  )

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-md border border-[var(--line)] bg-white p-4">
        <div>
          <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[var(--theater-ink)]">
            Disclosure rule
          </p>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6">
            {disclosure}
          </p>
        </div>
        <div className="flex gap-1 rounded-md bg-[var(--paper-muted)] p-1 text-xs font-bold">
          <span className="rounded bg-white px-3 py-2">
            {personal || isPhone ? 'Agenda' : 'Week'}
          </span>
          <span className="px-3 py-2 text-[var(--sea-ink-soft)]">Month</span>
        </div>
      </div>
      <div className={cn('grid gap-3', !isPhone && !personal && 'grid-cols-5')}>
        {occupancy.length > 0 ? (
          occupancy.map((condition, index) => (
            <article
              className={cn(
                'rounded-md border-l-4 bg-white p-4 shadow-sm',
                condition.id === 'opaque-primary-venue-occupancy'
                  ? 'border-y border-r border-y-[var(--line)] border-r-[var(--line)] border-l-[var(--sea-ink-soft)] bg-[var(--paper-muted)]'
                  : condition.id === 'operator-schedule-block'
                    ? 'border-l-[var(--performer)]'
                    : 'border-l-[var(--theater)]',
              )}
              key={condition.id}
            >
              <p className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-[var(--sea-ink-soft)]">
                {['Wed 21', 'Fri 23', 'Sat 24', 'Mon 26'][index % 4]}
              </p>
              <p className="mt-2 text-sm font-black">{condition.label}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--sea-ink-soft)]">
                {condition.id === 'opaque-primary-venue-occupancy'
                  ? '6:00–9:30 PM · no private Event details'
                  : '6:30–9:00 PM · Primary Venue'}
              </p>
            </article>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-[var(--line)] bg-white/60 p-6 text-center text-sm font-semibold text-[var(--sea-ink-soft)]">
            No Calendar occupancy is disclosed for this person in this scope.
          </div>
        )}
      </div>
    </div>
  )
}

function DisclosurePanel({ scenario }: { scenario: SeededScenario }) {
  return (
    <div className="grid gap-3">
      <details className="rounded-md border border-[var(--theater)] bg-[var(--theater-soft)]/30 p-4">
        <summary className="cursor-pointer text-sm font-black text-[var(--theater-ink)]">
          What this person can see
        </summary>
        <ul className="mt-3 grid gap-2 pl-4 text-xs leading-5 text-[var(--sea-ink-soft)]">
          {scenario.visibleInformation.map((information) => (
            <li className="list-disc" key={information}>
              {information}
            </li>
          ))}
        </ul>
      </details>
      <details className="rounded-md border border-dashed border-[var(--performer)] bg-[var(--performer-soft)]/25 p-4">
        <summary className="cursor-pointer text-sm font-black text-[var(--performer-ink)]">
          Privacy guardrails
        </summary>
        <ul className="mt-3 grid gap-2 pl-4 text-xs leading-5 text-[var(--sea-ink-soft)]">
          {scenario.forbiddenDisclosures.map((disclosure) => (
            <li className="list-disc" key={disclosure}>
              {disclosure}
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

function EventStateSummary({ surface }: { surface: OperationalSurfaceId }) {
  const isPeople = surface.startsWith('people-')
  const isSettings = surface.startsWith('settings-')

  if (isPeople) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Active Members" tone="performer" value="42" />
        <Metric label="Admins" tone="theater" value="3" />
        <Metric label="Open invitations" tone="event" value="2" />
      </div>
    )
  }

  if (isSettings) {
    return (
      <div className="rounded-md border border-[var(--line)] bg-white p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="size-6 text-[var(--theater-ink)]" />
          <div>
            <h2 className="font-black">Authority stays explicit</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--sea-ink-soft)]">
              Ordinary configuration is separated from Owner-only sovereignty
              controls. Ownership changes only through recipient acceptance.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Metric label="Lifecycle" tone="event" value="Approved" />
      <Metric label="Publication" tone="theater" value="Unpublished" />
      <Metric label="Health" tone="performer" value="At Risk" />
    </div>
  )
}

function Metric({
  label,
  tone,
  value,
}: {
  label: string
  tone: 'event' | 'performer' | 'theater'
  value: string
}) {
  const toneClasses = {
    event: 'border-t-[var(--event)]',
    performer: 'border-t-[var(--performer)]',
    theater: 'border-t-[var(--theater)]',
  }

  return (
    <div
      className={cn(
        'border border-t-4 border-[var(--line)] bg-white p-4',
        toneClasses[tone],
      )}
    >
      <p className="text-[0.65rem] font-black uppercase tracking-[0.13em] text-[var(--sea-ink-soft)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  )
}

function EventPipeline() {
  return (
    <section className="rounded-md border border-[var(--line)] bg-white p-4">
      <div className="flex items-center gap-2">
        <LayoutDashboard className="size-4 text-[var(--event-ink)]" />
        <h2 className="font-black">Event pipeline</h2>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {[
          ['Draft / planning', '3'],
          ['In review', '2'],
          ['Approved', '1'],
          ['Published', '5'],
        ].map(([label, value]) => (
          <div className="border-l-2 border-[var(--event)] pl-3" key={label}>
            <p className="text-xl font-black">{value}</p>
            <p className="text-xs font-bold text-[var(--sea-ink-soft)]">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function PublicExperience({
  isPhone,
  scenario,
  search,
  surface,
}: {
  isPhone: boolean
  scenario: SeededScenario
  search: PrototypeSearch
  surface: OperationalSurfaceId
}) {
  const cancelled = scenario.id === 'public-cancelled-event-discovery'

  if (surface === 'public-event') {
    return (
      <div>
        {cancelled ? (
          <div className="flex items-center justify-center gap-2 bg-[var(--danger)] px-4 py-3 text-sm font-black text-white">
            <CircleAlert className="size-4" /> This Event has been cancelled
          </div>
        ) : null}
        <div className={cn('grid', !isPhone && 'grid-cols-[1.1fr_0.9fr]')}>
          <section className="bg-[var(--event)] px-6 py-12 sm:px-10 sm:py-16">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--event-ink)]">
              Lantern Theater presents
            </p>
            <h1 className="display-title mt-5 text-5xl leading-[0.95] text-[#39270d] sm:text-7xl">
              {cancelled ? 'Night Music' : 'The Winter’s Tale'}
            </h1>
            <p className="mt-5 max-w-lg text-lg font-bold leading-7 text-[#4e3511]">
              {cancelled
                ? 'This program remains discoverable so patrons can verify its status.'
                : 'A story of time, repair, and one improbable reunion.'}
            </p>
          </section>
          <aside className="grid content-center gap-5 bg-[var(--paper-strong)] p-6 sm:p-10">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 size-5 text-[var(--performer)]" />
              <div>
                <p className="font-black">Saturday, September 12</p>
                <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                  7:30 PM · Primary Venue
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-5 text-[var(--theater-ink)]" />
              <div>
                <p className="font-black">Lantern Theater</p>
                <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                  123 Market Street
                </p>
              </div>
            </div>
            <Button disabled={cancelled} size="lg">
              {cancelled ? 'Admission unavailable' : 'Get tickets'}
            </Button>
          </aside>
        </div>
        <div className="p-6 sm:p-10">
          <Link
            className="inline-flex items-center gap-2 text-sm font-extrabold no-underline"
            search={{
              ...search,
              focus: undefined,
              scenario: scenario.id,
              surface: 'public-theater',
            }}
            to={prototypeRoute}
          >
            <ArrowLeft className="size-4" /> Back to Lantern Theater
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <section className="border-b border-black/10 bg-[var(--theater)] px-6 py-10 sm:px-10 sm:py-14">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--theater-ink)]">
          Portland, Maine
        </p>
        <h1 className="display-title mt-3 text-5xl leading-none text-[#173e3a] sm:text-7xl">
          Lantern Theater
        </h1>
        <p className="mt-4 max-w-2xl text-base font-bold leading-7 text-[#214c48]">
          Brave work, shared rooms, and performances made with our city.
        </p>
      </section>
      <section className="p-6 sm:p-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--event-ink)]">
              Upcoming
            </p>
            <h2 className="display-title mt-2 text-3xl">On our stage</h2>
          </div>
          <span className="text-xs font-bold text-[var(--sea-ink-soft)]">
            2 Events
          </span>
        </div>
        <div className={cn('mt-6 grid gap-4', !isPhone && 'grid-cols-2')}>
          <PublicEventCard
            cancelled={false}
            scenario={scenario}
            search={search}
            title="The Winter’s Tale"
          />
          <PublicEventCard
            cancelled
            scenario={scenario}
            search={search}
            title="Night Music"
          />
        </div>
      </section>
    </div>
  )
}

function PublicEventCard({
  cancelled,
  scenario,
  search,
  title,
}: {
  cancelled: boolean
  scenario: SeededScenario
  search: PrototypeSearch
  title: string
}) {
  const scenarioForCard = cancelled
    ? findScenario('public-cancelled-event-discovery')
    : findScenario('public-upcoming-event-discovery')

  return (
    <Link
      className="group block overflow-hidden border border-[var(--line)] bg-white text-[var(--sea-ink)] no-underline shadow-[var(--shadow-hard-sm)]"
      search={{
        ...search,
        focus: undefined,
        scenario: scenarioForCard.id,
        surface: 'public-event',
        viewport: scenario.primaryViewport,
      }}
      to={prototypeRoute}
    >
      <div
        className={cn(
          'h-28',
          cancelled ? 'bg-[var(--performer)]' : 'bg-[var(--event)]',
        )}
      />
      <div className="p-4">
        {cancelled ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-[0.65rem] font-black uppercase text-red-800">
            <CircleAlert className="size-3" /> Cancelled
          </span>
        ) : (
          <span className="text-[0.65rem] font-black uppercase tracking-[0.13em] text-[var(--event-ink)]">
            Sep 12–20
          </span>
        )}
        <h3 className="display-title mt-2 text-3xl">{title}</h3>
        <p className="mt-2 inline-flex items-center gap-2 text-sm font-extrabold">
          View Event{' '}
          <ArrowRight className="size-4 transition group-hover:translate-x-1" />
        </p>
      </div>
    </Link>
  )
}

function ActionPanel({
  actionReference,
  completeAction,
  scenario,
  search,
  selectedOutcome,
}: {
  actionReference: ScenarioActionReference
  completeAction: (key: string, outcome: string) => void
  scenario: SeededScenario
  search: PrototypeSearch
  selectedOutcome?: string
}) {
  const { action, key } = actionReference
  const outcomes = getActionOutcomes(action)
  const alternateOutcomes =
    'alternateOutcomes' in scenario ? scenario.alternateOutcomes : undefined

  return (
    <aside
      aria-label="Prototype action"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl border border-black/20 bg-[var(--paper-strong)] p-4 shadow-[0_20px_60px_rgba(38,49,48,0.35)] sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--event-soft)] text-[var(--event-ink)]">
          {selectedOutcome ? (
            <Check className="size-5" />
          ) : (
            <Sparkles className="size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[var(--event-ink)]">
            {selectedOutcome
              ? 'Prototype outcome recorded'
              : surfaceLabels[action.destination]}
          </p>
          <h2 className="mt-1 text-base font-black">{action.label}</h2>
          <p className="mt-1 text-xs font-bold text-[var(--sea-ink-soft)]">
            {action.relationshipLabel}
          </p>
        </div>
        <Link
          aria-label="Close action panel"
          className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--sea-ink)] no-underline hover:bg-[var(--paper-muted)]"
          search={{ ...search, focus: undefined }}
          to={prototypeRoute}
        >
          <X className="size-4" />
        </Link>
      </div>
      {selectedOutcome ? (
        <p className="mt-4 rounded-md bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
          {getOutcomeResult(action, selectedOutcome)} Any related Notification
          remains a personal alert until dismissed.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {outcomes.map((outcome, index) => (
            <Button
              key={outcome}
              onClick={() => completeAction(key, outcome)}
              variant={index === 0 ? 'default' : 'outline'}
            >
              {outcome}
            </Button>
          ))}
        </div>
      )}
      {alternateOutcomes?.length ? (
        <details className="mt-4 text-xs text-[var(--sea-ink-soft)]">
          <summary className="cursor-pointer font-extrabold">
            Alternate and stale outcomes
          </summary>
          <ul className="mt-2 grid gap-1 pl-4">
            {alternateOutcomes.map((outcome) => (
              <li className="list-disc" key={outcome}>
                {outcome}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </aside>
  )
}

function getScenarioActionReferences(scenario: SeededScenario) {
  return [scenario.primaryAction, ...scenario.secondaryActions].map(
    (action, index) => {
      const focus = index === 0 ? 'primary' : `secondary-${index - 1}`
      return {
        action,
        focus,
        key: `${scenario.id}:${focus}`,
      }
    },
  )
}

function getFocusedAction(scenario: SeededScenario, focus: unknown) {
  if (typeof focus !== 'string') return undefined
  return getScenarioActionReferences(scenario).find(
    (actionReference) => actionReference.focus === focus,
  )
}

function getActionOutcomes(action: ScenarioAction) {
  const outcomes = new Map<OperationalConditionId, readonly string[]>([
    ['event-at-risk', ['Revise plan', 'Allow with reason', 'Cancel Event']],
    [
      'producer-cancellation-request',
      ['Approve cancellation', 'Keep Event scheduled'],
    ],
    [
      'proposal-awaits-review',
      ['Approve revision', 'Request edits', 'Deny', 'Issue Counteroffer'],
    ],
    ['event-ready-for-publication', ['Publish exact snapshot']],
    ['theater-ready-for-publication', ['Publish exact snapshot']],
    ['required-event-staff-unfilled', ['Invite eligible Member']],
    ['cast-invitation-awaits-response', ['Accept invitation', 'Decline']],
    ['staff-assignment-awaits-response', ['Accept assignment', 'Decline']],
    ['admin-invitation-awaits-response', ['Accept Admin authority', 'Decline']],
    ['ownership-transfer-awaits-response', ['Accept ownership', 'Decline']],
    [
      'availability-response-required',
      ['Available', 'Unavailable', 'Uncertain'],
    ],
    ['counteroffer-awaits-producer', ['Accept Counteroffer', 'Decline']],
  ])

  if (action.conditionId) {
    return outcomes.get(action.conditionId) ?? ['Record action']
  }

  return ['Continue']
}

function getOutcomeResult(action: ScenarioAction, outcome: string) {
  if (action.conditionId === 'admin-invitation-awaits-response') {
    return outcome.startsWith('Accept')
      ? 'Admin authority is accepted; Operator navigation and shared work become available.'
      : 'Admin authority is declined; the recipient remains a base Theater Member.'
  }

  if (action.conditionId === 'ownership-transfer-awaits-response') {
    return outcome.startsWith('Accept')
      ? 'Ownership transfers atomically; the former Owner remains an Admin by default.'
      : 'The transfer is declined; the current Owner retains final authority.'
  }

  if (action.conditionId === 'cast-invitation-awaits-response') {
    return outcome.startsWith('Accept')
      ? 'Cast membership is accepted; authorized Candidate Slots and Calls become visible.'
      : 'The invitation is declined; ordinary Theater membership remains unchanged.'
  }

  if (action.conditionId === 'staff-assignment-awaits-response') {
    return outcome.startsWith('Accept')
      ? 'The Event Staff Assignment is accepted; scoped responsibility and Calls become visible.'
      : 'The assignment is declined; the staffing need returns to the Work Queue.'
  }

  return `${outcome} is recorded as this walkthrough’s distinct state transition.`
}

type SurfaceCondition = {
  classification: OperationalConditionClassification
  expectedResolution: string
  id: OperationalConditionId
  label: string
}

function getScenarioConditions(scenario: SeededScenario) {
  return operationalConditionClassifications.flatMap((classification) =>
    scenario.conditions[classification].map((id) => ({
      classification,
      expectedResolution: operationalConditions[id].expectedResolution,
      id,
      label: operationalConditions[id].label,
    })),
  )
}

function getAllowedSurfaces(scenario: SeededScenario) {
  if (
    scenario.allowedStartingSurfaces.some(
      (startingSurface) => startingSurface === 'public-theater',
    )
  ) {
    return ['public-theater', 'public-event'] as const
  }

  const allowed = new Set<OperationalSurfaceId>([
    'callsheet',
    'personal-calendar',
  ])

  for (const surface of scenario.navigationPath) allowed.add(surface)
  for (const { action } of getScenarioActionReferences(scenario)) {
    allowed.add(action.destination)
  }
  for (const { id } of getScenarioConditions(scenario)) {
    for (const surface of operationalConditions[id].surfaces) {
      if (surface !== 'public-theater' && surface !== 'public-event') {
        allowed.add(surface)
      }
    }
  }

  const isOperator = scenario.relationshipLabels.some(
    (relationship) => relationship === 'Theater Operator',
  )
  if (isOperator) {
    for (const surface of [
      ...theaterNavigation,
      ...eventNavigation,
      'people-invitations',
      'people-access-and-roles',
      'settings-event-policy',
      'settings-venue-and-calendar',
      'settings-ownership-and-security',
    ] as const) {
      allowed.add(surface)
    }
  }

  const hasEventRelationship = scenario.personas.some((persona) =>
    [
      'producer',
      'director',
      'cast-member',
      'reviewer',
      'event-staff-member',
      'multi-role-person',
    ].some((eventPersona) => eventPersona === persona),
  )
  if (hasEventRelationship) {
    for (const surface of eventNavigation) allowed.add(surface)
  }

  return operationalSurfaceIds.filter((surface) => allowed.has(surface))
}

function getConditionsForSurface(
  scenario: SeededScenario,
  surface: OperationalSurfaceId,
) {
  return getScenarioConditions(scenario).filter(({ id }) =>
    operationalConditions[id].surfaces.some(
      (conditionSurface) => conditionSurface === surface,
    ),
  )
}

function getSurfaceTitle(surface: OperationalSurfaceId) {
  if (surface === 'callsheet') return 'Your Callsheet'
  if (surface === 'personal-calendar') return 'My Calendar'
  if (surface === 'theater-operations') return 'What needs attention now'
  if (surface === 'theater-calendar') return 'Primary Venue Calendar'
  if (surface.startsWith('people-')) return surfaceLabels[surface]
  if (surface.startsWith('settings-')) return surfaceLabels[surface]
  if (surface.startsWith('event-'))
    return `The Tempest · ${surfaceLabels[surface]}`
  return surfaceLabels[surface]
}

function buildPrototypeHref(search: PrototypeSearch) {
  const params = new URLSearchParams()
  params.set('scenario', search.scenario)
  params.set('surface', search.surface)
  params.set('viewport', search.viewport)
  if (search.focus) params.set('focus', search.focus)
  return `${prototypeRoute}?${params.toString()}`
}
