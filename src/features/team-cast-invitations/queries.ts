import { appError, err, ok } from '@/server/errors'
import { teamWorkspaceSchema } from '@/features/teams/schemas'
import { castReviewClient, castReviewError } from './persistence'
import { optionsInputSchema } from './schemas'

export async function getCastTeamOptions(input: { eventId: string }) {
  const parsed = optionsInputSchema.safeParse(input)
  if (!parsed.success)
    return err(appError('validation_error', 'Choose an Event.'))
  const client = await castReviewClient()
  if (!client.ok) return client
  const result = await client.data.rpc('get_cast_team_options', {
    p_show_id: parsed.data.eventId,
  })
  if (result.error) return castReviewError(result.error)
  const options = teamWorkspaceSchema.safeParse(result.data)
  return options.success
    ? ok(options.data)
    : err(
        appError(
          'external_service_error',
          'Teams could not be loaded. Retry loading Teams.',
        ),
      )
}
