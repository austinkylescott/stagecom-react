export type PortfolioEvent = {
  id: string
  slug: string
  title: string
  lifecycle: string
  proposal: string
  publication: string
  health: string
  dates: string[]
  candidateDates: string[]
  leadership: Array<{ userId: string; displayName: string; role: string }>
  limited?: boolean
  overviewHref: string
  nextDate: string | null
  nextProposedDate: string | null
  nextAction: {
    label: string
    href: string
    kind: string
    relationship?: string
  } | null
  upcoming: boolean
}

export type PortfolioFilters = {
  view?: 'all' | 'needs-attention' | 'upcoming' | 'draft-review' | 'published'
  from?: string
  to?: string
  leadership?: string
  lifecycle?: string
  proposal?: string
  publication?: string
  health?: string
  nextAction?: string
  sort?:
    | 'date-asc'
    | 'date-desc'
    | 'title-asc'
    | 'title-desc'
    | 'leadership-asc'
    | 'lifecycle-asc'
    | 'proposal-asc'
    | 'publication-asc'
    | 'health-asc'
    | 'action-asc'
}

export function filterEventPortfolio(
  events: PortfolioEvent[],
  filters: PortfolioFilters,
  timezone = 'UTC',
) {
  const filtered = events.filter((event) => {
    if (filters.view === 'needs-attention' && !event.nextAction) return false
    if (filters.view === 'upcoming' && !event.upcoming) return false
    if (
      filters.view === 'draft-review' &&
      !['draft', 'in_review'].includes(event.lifecycle)
    )
      return false
    if (filters.view === 'published' && event.publication !== 'published')
      return false
    if (
      (filters.from || filters.to) &&
      ![...event.dates, ...event.candidateDates]
        .map((date) => dateKey(date, timezone))
        .some(
          (date) =>
            (!filters.from || date >= filters.from) &&
            (!filters.to || date <= filters.to),
        )
    )
      return false
    if (
      filters.leadership &&
      !event.leadership.some(({ userId }) => userId === filters.leadership)
    )
      return false
    if (filters.lifecycle && event.lifecycle !== filters.lifecycle) return false
    if (filters.proposal && event.proposal !== filters.proposal) return false
    if (filters.publication && event.publication !== filters.publication)
      return false
    if (filters.health && event.health !== filters.health) return false
    if (filters.nextAction && event.nextAction?.kind !== filters.nextAction)
      return false
    return true
  })
  const [field, direction] = (filters.sort ?? 'date-asc').split('-')
  const value = (event: PortfolioEvent) => {
    switch (field) {
      case 'title':
        return event.title
      case 'leadership':
        return event.leadership[0]?.displayName ?? ''
      case 'lifecycle':
        return event.lifecycle
      case 'proposal':
        return event.proposal
      case 'publication':
        return event.publication
      case 'health':
        return event.health
      case 'action':
        return event.nextAction?.label ?? ''
      default:
        return sortDate(event) ?? ''
    }
  }
  return filtered.sort((a, b) => {
    if (field === 'date' && (!sortDate(a) || !sortDate(b))) {
      if (!sortDate(a) && !sortDate(b)) return a.title.localeCompare(b.title)
      return sortDate(a) ? -1 : 1
    }
    const comparison = value(a).localeCompare(value(b))
    return (
      (direction === 'desc' ? -comparison : comparison) ||
      a.title.localeCompare(b.title) ||
      a.id.localeCompare(b.id)
    )
  })
}

function sortDate(event: PortfolioEvent) {
  return (
    [event.nextDate, event.nextProposedDate]
      .filter((date): date is string => date !== null)
      .sort()
      .at(0) ?? null
  )
}

function dateKey(iso: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso))
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}
