import { z } from 'zod'
import type { CallsheetCommitmentInput } from '@/features/callsheet/read-model'
import { ok } from '@/server/errors'
import { pollClient, pollError } from './persistence'
import { pollsResultSchema } from './schemas'

export async function getPolls(eventId: string) {
  const client = await pollClient()
  if (!client.ok) return client
  const result = await client.data.rpc('get_availability_polls', {
    p_show_id: eventId,
  })
  return result.error
    ? pollError(result.error)
    : ok(pollsResultSchema.parse(result.data))
}

export async function getMyPollActions() {
  const client = await pollClient()
  if (!client.ok) return client
  const result = await client.data.rpc('get_my_poll_actions')
  if (result.error) return pollError(result.error)
  const actions = z
    .array(
      z.object({
        id: z.uuid(),
        eventSlug: z.string(),
        eventTitle: z.string(),
        theaterSlug: z.string(),
        theaterTitle: z.string(),
      }),
    )
    .parse(result.data)
  return ok(
    actions.map((action): CallsheetCommitmentInput => ({
      id: `poll:${action.id}`,
      action: 'Respond to availability poll',
      actionableAt: null,
      event: { slug: action.eventSlug, title: action.eventTitle },
      theater: { slug: action.theaterSlug, title: action.theaterTitle },
      kind: 'availability_response',
      relationship: 'Selected Cast respondent',
      targetAnchor: '#cast-team',
    })),
  )
}
