import type { Database } from '@/server/db/database.types'

type TheaterRole = Database['public']['Enums']['theater_role']

export function canManageTheater(roles: TheaterRole[]) {
  return roles.some((role) => role === 'owner' || role === 'admin')
}
