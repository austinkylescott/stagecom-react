import { appError, err, ok } from '@/server/errors'
import { teamClient, teamError } from './persistence'
import { readTeamsSchema, teamWorkspaceSchema } from './schemas'

export async function getTeamWorkspace(input: { theaterId: string }) {
  const parsed = readTeamsSchema.safeParse(input)
  if (!parsed.success)
    return err(appError('validation_error', 'Choose a Theater.'))
  const client = await teamClient()
  if (!client.ok) return client
  const result = await client.data.rpc('get_team_workspace', {
    p_theater_id: parsed.data.theaterId,
  })
  if (result.error) return teamError(result.error)
  const workspace = teamWorkspaceSchema.safeParse(result.data)
  return workspace.success
    ? ok(workspace.data)
    : err(
        appError(
          'external_service_error',
          'Teams could not be loaded. Try refreshing Teams.',
        ),
      )
}
