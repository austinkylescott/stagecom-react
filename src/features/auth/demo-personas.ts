export const DEMO_PERSONA_KEYS = [
  'owner',
  'admin',
  'producer',
  'member',
  'multi',
  'invitee',
  'newcomer',
] as const

export const DEMO_PERSONAS = {
  owner: {
    description: 'Manage members and reusable Join Links.',
    email: 'owner@demo.stagecom.test',
    label: 'Theater Owner',
    path: '/app/callsheet',
  },
  admin: {
    description: 'Exercise Theater administration without ownership.',
    email: 'admin@demo.stagecom.test',
    label: 'Theater Admin',
    path: '/app/callsheet',
  },
  producer: {
    description:
      'Combine Producer, Director and accepted Cast responsibilities.',
    email: 'producer@demo.stagecom.test',
    label: 'Event Producer',
    path: '/app/compass-rose/events/a-midsummer-nights-dream',
  },
  member: {
    description: 'See the workspace as a base Theater Member.',
    email: 'member@demo.stagecom.test',
    label: 'Theater Member',
    path: '/app/callsheet',
  },
  multi: {
    description: 'Review personal actions and Calls across two Theaters.',
    email: 'multi@demo.stagecom.test',
    label: 'Multi-Theater Member',
    path: '/app/callsheet',
  },
  invitee: {
    description: 'Decide a pending Cast invitation before planning is shared.',
    email: 'invitee@demo.stagecom.test',
    label: 'Pending Cast invitee',
    path: '/app/compass-rose/events/a-midsummer-nights-dream#overview',
  },
  newcomer: {
    description: 'Open an active Join Link without existing membership.',
    email: 'newcomer@demo.stagecom.test',
    label: 'Newcomer',
    path: '/join-link/stagecom-demo-active-join-token-2026',
  },
} as const

export type DemoPersona = (typeof DEMO_PERSONA_KEYS)[number]
