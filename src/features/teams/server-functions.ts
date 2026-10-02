import { createServerFn } from '@tanstack/react-start'
import { manageTeam } from './commands'
import { getTeamWorkspace } from './queries'
import { readTeamsSchema, teamCommandSchema } from './schemas'

export const getTeamWorkspaceFn = createServerFn({ method: 'GET' })
  .validator(readTeamsSchema)
  .handler(async ({ data }) => getTeamWorkspace(data))
export const manageTeamFn = createServerFn({ method: 'POST' })
  .validator(teamCommandSchema)
  .handler(async ({ data }) => manageTeam(data))
