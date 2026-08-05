export const DEMO_PERSONA_KEYS = [
  'owner',
  'admin',
  'producer',
  'member',
  'newcomer',
] as const

export const DEMO_PERSONAS = {
  owner: {
    description: 'Manage members and reusable Join Links.',
    email: 'owner@demo.stagecom.test',
    label: 'Theater Owner',
    path: '/app/compass-rose/members',
  },
  admin: {
    description: 'Exercise Theater administration without ownership.',
    email: 'admin@demo.stagecom.test',
    label: 'Theater Admin',
    path: '/app/compass-rose/members',
  },
  producer: {
    description: 'Work on the seeded Event as its Producer.',
    email: 'producer@demo.stagecom.test',
    label: 'Event Producer',
    path: '/app/compass-rose/events/a-midsummer-nights-dream',
  },
  member: {
    description: 'See the workspace as a base Theater Member.',
    email: 'member@demo.stagecom.test',
    label: 'Theater Member',
    path: '/app/compass-rose/events/a-midsummer-nights-dream',
  },
  newcomer: {
    description: 'Open an active Join Link without existing membership.',
    email: 'newcomer@demo.stagecom.test',
    label: 'Newcomer',
    path: '/join-link/stagecom-demo-active-join-token-2026',
  },
} as const

export type DemoPersona = (typeof DEMO_PERSONA_KEYS)[number]
