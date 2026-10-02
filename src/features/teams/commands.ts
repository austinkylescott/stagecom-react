import { z } from 'zod'
import { appError, err, ok } from '@/server/errors'
import { teamClient, teamError } from './persistence'
import { teamCommandSchema } from './schemas'
import type { TeamCommand } from './schemas'

export async function manageTeam(input: TeamCommand) {
  const parsed = teamCommandSchema.safeParse(input)
  if (!parsed.success)
    return err(
      appError('validation_error', 'Check the Team name and selected Member.'),
    )
  const client = await teamClient()
  if (!client.ok) return client
  const { theaterId, commandId, action, ...payload } = parsed.data
  const result = await client.data.rpc('manage_team', {
    p_theater_id: theaterId,
    p_action: action,
    p_input: payload,
    p_command_id: commandId,
  })
  if (result.error) return teamError(result.error)
  const saved = z.object({ teamId: z.uuid() }).safeParse(result.data)
  return saved.success
    ? ok(saved.data)
    : err(
        appError(
          'external_service_error',
          'Team result could not be loaded. Retry your action.',
        ),
      )
}
