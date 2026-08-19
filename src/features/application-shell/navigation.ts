import { canManageTheater } from '@/features/theaters/permissions'

import type { Database } from '@/server/db/database.types'

type TheaterRole = Database['public']['Enums']['theater_role']

export type TheaterNavigationId =
  'calendar' | 'events' | 'operations' | 'people' | 'settings'

const memberNavigation: TheaterNavigationId[] = [
  'operations',
  'calendar',
  'events',
]

export function getTheaterNavigation(roles: TheaterRole[]) {
  return canManageTheater(roles)
    ? [...memberNavigation, 'people', 'settings']
    : memberNavigation
}
