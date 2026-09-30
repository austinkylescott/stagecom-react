// THROWAWAY: one fixed Focus Theater timeline. Now: October 5, 2026, 10:00 ET.
export const directions = {
  A: 'Quiet Workspace',
  B: 'Contemporary Playbill',
  C: 'Community Studio',
}
export const screens = [
  'portal',
  'callsheet',
  'calendar',
  'events',
  'event',
  'review',
  'people',
  'conversation',
  'components',
] as const
export const scenarios = [
  'member',
  'operator-cast',
  'producer',
  'director',
  'reviewer',
  'pending',
  'public',
  'approved-unpublished',
  'published-at-risk',
  'draft',
  'multi',
] as const
export const people = [
  {
    name: 'Maya Chen',
    initials: 'MC',
    role: 'Director · Cast Member',
    color: '#ccac95',
  },
  {
    name: 'Alex Rivera',
    initials: 'AR',
    role: 'Admin · Cast Member',
    color: '#a5bdb2',
  },
  {
    name: 'June Okafor',
    initials: 'JO',
    role: 'Producer · not Cast',
    color: '#b7afd1',
  },
  {
    name: 'Sam Patel',
    initials: 'SP',
    role: 'Designated Reviewer',
    color: '#ddc48b',
  },
  {
    name: 'Noor Williams',
    initials: 'NW',
    role: 'Theater Member',
    color: '#a9bfd0',
  },
  {
    name: 'Elliot Brooks',
    initials: 'EB',
    role: 'Accepted Event staff',
    color: '#c3bca6',
  },
]
export const events = [
  {
    id: 'afterlight',
    title: 'Afterlight',
    subtitle: 'Small stories. A very big city.',
    description:
      'An improvised evening about the people we pass on our way home. Six voices turn ordinary encounters into unexpected connections, with a new story every night.',
    image: '/visual-playground/afterlight.svg',
    date: 'Fri Oct 9 · 7:30 pm',
    lifecycle: 'Active',
    decision: 'Approved r2',
    publication: 'Published',
    health: 'On track',
  },
  {
    id: 'atlas',
    title: 'An Atlas of All the Things We Almost Said',
    subtitle: 'A new collection of stories from the edge of belonging.',
    description:
      'A patient, playful exploration of the things left unsaid. Built from audience suggestions and performed by Focus Theater’s ensemble. No two evenings follow the same map.',
    image: '/visual-playground/atlas.svg',
    date: 'Sat Oct 17 · 7:30 pm',
    lifecycle: 'Active',
    decision: 'Awaiting review r3',
    publication: 'Unpublished',
    health: 'On track',
  },
  {
    id: 'room',
    title: 'The Listening Room',
    subtitle: 'Come closer. There is a story here.',
    description:
      'An intimate evening of improvised stories and live sound. A gentle invitation to listen, laugh, and find something familiar in a stranger’s story.',
    image: undefined,
    date: 'Fri Oct 23 · 7:30 pm',
    lifecycle: 'Active',
    decision: 'Approved r1',
    publication: 'Published',
    health: 'At Risk',
  },
  {
    id: 'draft',
    title: 'Sunday, Eventually',
    subtitle: 'An idea taking shape.',
    description:
      'A developing ensemble program about the small rituals that make a weekend feel like home.',
    image: undefined,
    date: 'Unscheduled',
    lifecycle: 'Draft',
    decision: 'Not submitted',
    publication: 'Unpublished',
    health: 'Not assessed',
  },
] as const
export type Booking = {
  id: string
  day: number
  time: string
  title: string
  kind: string
  venue: string
  contact: string
  event?: string
  public?: boolean
}
export const bookings: Booking[] = [
  {
    id: 'rehearsal',
    day: 7,
    time: '6–8 pm',
    title: 'Afterlight · Rehearsal',
    kind: 'Confirmed Slot',
    venue: 'Primary Venue',
    contact: 'Maya Chen',
    event: 'afterlight',
  },
  {
    id: 'performance',
    day: 9,
    time: '7:30–9 pm',
    title: 'Afterlight · Performance',
    kind: 'Confirmed Slot',
    venue: 'Primary Venue',
    contact: 'June Okafor',
    event: 'afterlight',
    public: true,
  },
  {
    id: 'hold',
    day: 12,
    time: '6–8 pm',
    title: 'Atlas · exclusive hold',
    kind: 'Exclusive hold',
    venue: 'Primary Venue',
    contact: 'June Okafor',
    event: 'atlas',
  },
  {
    id: 'block',
    day: 14,
    time: 'All day',
    title: 'Primary Venue unavailable',
    kind: 'Schedule Block',
    venue: 'Primary Venue',
    contact: 'Alex Rivera',
  },
  {
    id: 'offsite',
    day: 15,
    time: '6–8 pm',
    title: 'Afterlight · Rehearsal',
    kind: 'Confirmed Slot',
    venue: 'Riverside Studio · offsite',
    contact: 'Maya Chen',
    event: 'afterlight',
  },
  {
    id: 'atlas-performance',
    day: 17,
    time: '7:30–9 pm',
    title: 'Atlas · Performance',
    kind: 'Candidate Slot',
    venue: 'Primary Venue',
    contact: 'June Okafor',
    event: 'atlas',
  },
  ...[2, 3, 4, 6, 10, 11, 13, 16, 18, 20, 21, 24, 25, 27, 28, 30, 31].map(
    (day, i) => ({
      id: `program-${day}`,
      day,
      time: i % 2 ? '2–4 pm' : '10 am–noon',
      title: i % 2 ? 'Open Practice' : 'Community Workshop',
      kind: 'Schedule Block',
      venue: 'Primary Venue',
      contact: i % 2 ? 'Alex Rivera' : 'Sam Patel',
    }),
  ),
  {
    id: 'room-performance',
    day: 23,
    time: '7:30–9 pm',
    title: 'The Listening Room · Performance',
    kind: 'Confirmed Slot',
    venue: 'Primary Venue',
    contact: 'Elliot Brooks',
    event: 'room',
    public: true,
  },
].sort((a, b) => a.day - b.day)
export const initialState = {
  invite: 'pending',
  availability: 'unanswered',
  move: 'none',
  decision: 'pending',
  notification: true,
  messages: [
    'Maya: Meet in the lobby ten minutes before the Call. Bring a story about a journey home.',
    'Elliot: The side entrance is step-free. I’ll be there to help with setup.',
  ],
}
