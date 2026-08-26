import type { Database } from '@/server/db/database.types'

type TheaterRole = Database['public']['Enums']['theater_role']

export type TheaterSettingsSection = {
  description: string
  id:
    'event-policy' | 'ownership-security' | 'public-presence' | 'venue-calendar'
  label: string
}

const operationalSections: TheaterSettingsSection[] = [
  {
    description: 'Public Theater identity and how visitors find it.',
    id: 'public-presence',
    label: 'Public Presence',
  },
  {
    description:
      'Producer eligibility, review timing, and exceptional approval.',
    id: 'event-policy',
    label: 'Event Policy',
  },
  {
    description: 'Primary Venue identity and scheduling buffers.',
    id: 'venue-calendar',
    label: 'Venue & Calendar',
  },
]

const ownershipSection: TheaterSettingsSection = {
  description: 'Transfer final Theater authority deliberately.',
  id: 'ownership-security',
  label: 'Ownership & Security',
}

export function getTheaterSettingsSections(roles: TheaterRole[]) {
  return roles.includes('owner')
    ? [...operationalSections, ownershipSection]
    : operationalSections
}
