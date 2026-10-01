import { canManageTheater } from '@/features/theaters/permissions'

import type { Database } from '@/server/db/database.types'

type TheaterRole = Database['public']['Enums']['theater_role']

export type TheaterNavigationId =
  'portal' | 'calendar' | 'events' | 'operations' | 'people' | 'settings'

const memberNavigation: TheaterNavigationId[] = [
  'portal',
  'calendar',
  'events',
  'people',
]

export function getTheaterNavigation(roles: TheaterRole[]) {
  return canManageTheater(roles)
    ? [...memberNavigation, 'operations', 'settings']
    : memberNavigation
}
